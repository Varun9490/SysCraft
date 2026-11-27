//! Fixed-memory queuing physics. The linker caps linear memory at 64 KiB.
//! The host reuses that page for every tick instead of allocating JS objects.

const MAX_NODES: usize = 96;
const STRIDE: usize = 16;
const MAX_EFFECTIVE_RHO: f64 = 0.995;
const TICK_DT: f64 = 0.05;
const KV_SATURATE_PENALTY: f64 = 3.5;

static mut INPUT: [f64; MAX_NODES * STRIDE] = [0.0; MAX_NODES * STRIDE];
static mut OUTPUT: [f64; MAX_NODES * STRIDE] = [0.0; MAX_NODES * STRIDE];

#[no_mangle]
pub unsafe extern "C" fn input_ptr() -> *mut f64 {
    core::ptr::addr_of_mut!(INPUT) as *mut f64
}

#[no_mangle]
pub unsafe extern "C" fn output_ptr() -> *mut f64 {
    core::ptr::addr_of_mut!(OUTPUT) as *mut f64
}

#[no_mangle]
pub extern "C" fn max_nodes() -> i32 {
    MAX_NODES as i32
}

/// Returns the number of nodes written, or 0 if `count` is out of range.
#[no_mangle]
pub unsafe extern "C" fn physics_batch(count: i32) -> i32 {
    if count <= 0 || count as usize > MAX_NODES {
        return 0;
    }
    let n = count as usize;
    for index in 0..n {
        let input = &INPUT[index * STRIDE..(index + 1) * STRIDE];
        let output = &mut OUTPUT[index * STRIDE..(index + 1) * STRIDE];
        evaluate(input, output);
    }
    count
}

fn evaluate(input: &[f64], output: &mut [f64]) {
    let capacity = positive_or(input[0], 1.0);
    let lambda = non_negative(input[1]);
    let base_p50 = non_negative(input[2]);
    let base_p95 = non_negative(input[3]);
    let base_p99 = non_negative(input[4]);
    let engine = input[5] as i32;
    let write_ratio = clamp(input[6], 0.0, 1.0);
    let elapsed = non_negative(input[7]);
    let prev_depth = non_negative(input[8]);
    let max_concurrency = if input[9].is_finite() && input[9] > 0.0 { input[9] } else { 1.0 };
    let replication = active_replicas(input[10]);
    let prompt = floor_at_least_one(input[11], 1024.0);
    let output_tokens = floor_at_least_one(input[12], 256.0);
    let vram = non_negative(input[13]);
    let is_llm = input[14] >= 0.5;

    let rho = lambda / capacity;
    let multiplier = queue_multiplier(rho);
    let w_amp = write_amplification(engine, write_ratio, elapsed);
    let k = max_concurrency * replication;
    let (queue_depth, dropped) = update_queue(prev_depth, lambda, capacity, k);
    let queue_wait = (queue_depth / capacity) * 1000.0;
    let p50 = non_negative(base_p50 * w_amp * multiplier);
    let p95 = non_negative(base_p95 * w_amp * pow(multiplier, 1.15));
    let p99 = non_negative(base_p99 * w_amp * pow(multiplier, 1.3) + queue_wait);
    let error = error_rate(lambda, capacity);
    let cpu = cpu_percent(rho, queue_depth, capacity);

    let mut ttft = 0.0;
    let mut kv_pct = 0.0;
    let mut penalty = 1.0;
    let mut preempted = 0.0;
    if is_llm {
        let m = queue_multiplier(rho);
        ttft = non_negative(base_p50 * m + 0.04 * prompt);
        let denom = vram * replication;
        let active = lambda * (p50 / 1000.0);
        if denom > 0.0 {
            kv_pct = clamp((active * (prompt + output_tokens) * 0.0005) / denom * 100.0, 0.0, 100.0);
        }
        if kv_pct > 95.0 {
            preempted = 1.0;
            penalty = KV_SATURATE_PENALTY;
        }
    }

    output[0] = queue_depth;
    output[1] = dropped;
    output[2] = p50;
    output[3] = p95;
    output[4] = p99;
    output[5] = non_negative(queue_wait);
    output[6] = if rho.is_finite() && rho >= 0.0 { rho } else { 0.0 };
    output[7] = multiplier;
    output[8] = error;
    output[9] = cpu;
    output[10] = ttft;
    output[11] = kv_pct;
    output[12] = penalty;
    output[13] = preempted;
    output[14] = capacity;
    output[15] = 0.0;
}

fn non_negative(value: f64) -> f64 {
    if value.is_finite() && value > 0.0 { value } else { 0.0 }
}

fn positive_or(value: f64, fallback: f64) -> f64 {
    if value.is_finite() && value > 0.0 { value } else { fallback }
}

fn clamp(value: f64, min: f64, max: f64) -> f64 {
    if !value.is_finite() {
        return min;
    }
    if value < min {
        return min;
    }
    if value > max {
        return max;
    }
    value
}

fn active_replicas(value: f64) -> f64 {
    if !value.is_finite() {
        return 1.0;
    }
    let floored = value.floor();
    if floored < 1.0 { 1.0 } else { floored }
}

fn floor_at_least_one(value: f64, fallback: f64) -> f64 {
    let source = if value.is_finite() { value } else { fallback };
    let floored = source.floor();
    if floored < 1.0 { 1.0 } else { floored }
}

fn queue_multiplier(rho: f64) -> f64 {
    let hat = if !rho.is_finite() || rho < 0.0 {
        0.0
    } else if rho > MAX_EFFECTIVE_RHO {
        MAX_EFFECTIVE_RHO
    } else {
        rho
    };
    let denom = 2.0 * (1.0 - hat);
    if denom <= 0.0 {
        return 1.0;
    }
    1.0 + (hat * hat) / denom
}

fn compaction_spike(elapsed_seconds: f64) -> f64 {
    if !elapsed_seconds.is_finite() || elapsed_seconds < 0.0 {
        return 0.0;
    }
    let phase = (elapsed_seconds % 60.0) / 60.0;
    if phase < 0.1 { (0.1 - phase) * 2.5 } else { 0.0 }
}

fn write_amplification(engine: i32, write_ratio: f64, elapsed: f64) -> f64 {
    match engine {
        1 => 1.0 + 1.5 * write_ratio,
        2 => 1.0 + 0.3 * write_ratio + compaction_spike(elapsed),
        4 => 1.0 + 0.15 * write_ratio,
        5 => 1.0 + 0.5 * write_ratio,
        _ => 1.0,
    }
}

fn update_queue(prev: f64, lambda: f64, capacity: f64, k: f64) -> (f64, f64) {
    if lambda > capacity {
        let mut next = prev + (lambda - capacity) * TICK_DT;
        if next > k {
            next = k;
        }
        let dropped = if next >= k { 1.0 } else { 0.0 };
        return (next, dropped);
    }
    let mut next = prev - (capacity - lambda) * TICK_DT;
    if next < 0.0 {
        next = 0.0;
    }
    (next, 0.0)
}

fn error_rate(lambda: f64, capacity: f64) -> f64 {
    if lambda <= 0.0 {
        return 0.0;
    }
    let raw = if lambda > capacity { (lambda - capacity) / lambda.max(1.0) } else { 0.0 };
    clamp(raw, 0.0, 1.0)
}

fn cpu_percent(rho: f64, queue_depth: f64, capacity: f64) -> f64 {
    let safe_rho = non_negative(rho);
    let pressure = queue_depth / (capacity + queue_depth);
    clamp(safe_rho * 100.0 + pressure * 10.0, 0.0, 100.0)
}

fn pow(base: f64, exp: f64) -> f64 {
    if !base.is_finite() || !exp.is_finite() {
        return 1.0;
    }
    if base == 1.0 || exp == 0.0 {
        return 1.0;
    }
    if base <= 0.0 {
        return 0.0;
    }
    base.powf(exp)
}

#[cfg(test)]
mod tests {
    #[test]
    fn pow_matches_known_points() {
        let m = 1.0_f64 + (0.5_f64 * 0.5_f64) / (2.0 * 0.5);
        assert!((super::pow(m, 1.15) - m.powf(1.15)).abs() < 1e-12);
    }
}
