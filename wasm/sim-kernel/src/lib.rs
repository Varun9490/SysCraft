//! Fixed-memory queuing physics. The linker caps linear memory at 64 KiB.
//! The host reuses that page for every tick instead of allocating JS objects.
//! Numeric sanitization and saturated arithmetic mirror queuingMath.ts.

const MAX_NODES: usize = 96;
const STRIDE: usize = 16;
const MAX_EFFECTIVE_RHO: f64 = 0.995;
const TICK_DT: f64 = 0.05;
const KV_SATURATE_PENALTY: f64 = 3.5;
// Keep in sync with MAX_SIM_VALUE in src/engine/queuingMath.ts.
const MAX_SIM_VALUE: f64 = 1_000_000_000_000_000.0;

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
    let max_concurrency = positive_or(input[9], 1.0);
    let replication = active_replicas(input[10]);
    let prompt = floor_at_least_one(input[11], 1024.0);
    let output_tokens = floor_at_least_one(input[12], 256.0);
    let vram = non_negative(input[13]);
    let is_llm = input[14] >= 0.5;

    let rho = capped_divide(lambda, capacity);
    let multiplier = queue_multiplier(rho);
    let w_amp = write_amplification(engine, write_ratio, elapsed);
    let k = capped_multiply(max_concurrency, replication);
    let (queue_depth, dropped) = update_queue(prev_depth, lambda, capacity, k);
    let queue_wait = capped_multiply(capped_divide(queue_depth, capacity), 1000.0);
    let p50 = capped_multiply(capped_multiply(base_p50, w_amp), multiplier);
    let p95 = capped_multiply(
        capped_multiply(base_p95, w_amp),
        pow(multiplier, 1.15),
    );
    let p99 = capped_add(
        capped_multiply(capped_multiply(base_p99, w_amp), pow(multiplier, 1.3)),
        queue_wait,
    );
    let error = error_rate(lambda, capacity);
    let cpu = cpu_percent(rho, queue_depth, capacity);

    let mut ttft = 0.0;
    let mut kv_pct = 0.0;
    let mut penalty = 1.0;
    let mut preempted = 0.0;
    if is_llm {
        ttft = capped_add(
            capped_multiply(base_p50, multiplier),
            capped_multiply(0.04, prompt),
        );
        let denom = capped_multiply(vram, replication);
        let active = capped_multiply(lambda, capped_divide(p50, 1000.0));
        if denom > 0.0 {
            let token_usage = capped_multiply(active, capped_add(prompt, output_tokens));
            let numerator = capped_multiply(token_usage, 0.0005);
            kv_pct = clamp(capped_multiply(capped_divide(numerator, denom), 100.0), 0.0, 100.0);
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
    output[5] = queue_wait;
    output[6] = rho;
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
    if value.is_nan() || value < 0.0 {
        0.0
    } else if value.is_infinite() {
        MAX_SIM_VALUE
    } else {
        value.min(MAX_SIM_VALUE)
    }
}

fn positive_or(value: f64, fallback: f64) -> f64 {
    if value.is_nan() || value <= 0.0 {
        fallback.min(MAX_SIM_VALUE)
    } else if value.is_infinite() {
        MAX_SIM_VALUE
    } else {
        value.min(MAX_SIM_VALUE)
    }
}

fn capped_add(left: f64, right: f64) -> f64 {
    let sum = non_negative(left) + non_negative(right);
    if sum.is_finite() { sum.min(MAX_SIM_VALUE) } else { MAX_SIM_VALUE }
}

fn capped_multiply(left: f64, right: f64) -> f64 {
    let product = non_negative(left) * non_negative(right);
    if product.is_finite() { product.min(MAX_SIM_VALUE) } else { MAX_SIM_VALUE }
}

fn capped_divide(numerator: f64, denominator: f64) -> f64 {
    let num = non_negative(numerator);
    let den = non_negative(denominator);
    if den <= 0.0 {
        return 0.0;
    }
    let ratio = num / den;
    if ratio.is_finite() { ratio.min(MAX_SIM_VALUE) } else { MAX_SIM_VALUE }
}

fn clamp(value: f64, min: f64, max: f64) -> f64 {
    if value.is_nan() || value < min {
        min
    } else if value > max {
        max
    } else {
        value
    }
}

fn active_replicas(value: f64) -> f64 {
    if value.is_nan() {
        return 1.0;
    }
    let bounded = if value == f64::INFINITY {
        MAX_SIM_VALUE
    } else {
        value.max(0.0).min(MAX_SIM_VALUE)
    };
    let floored = bounded.floor();
    if floored < 1.0 { 1.0 } else { floored }
}

fn floor_at_least_one(value: f64, fallback: f64) -> f64 {
    let source = if value.is_finite() { value.min(MAX_SIM_VALUE) } else { fallback };
    let floored = source.floor();
    if floored < 1.0 { 1.0 } else { floored }
}

fn queue_multiplier(rho: f64) -> f64 {
    let hat = if rho.is_nan() || rho < 0.0 {
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
        let next = capped_add(prev, capped_multiply(lambda - capacity, TICK_DT)).min(k);
        let dropped = if next >= k { 1.0 } else { 0.0 };
        return (next, dropped);
    }
    let next = (prev - capped_multiply(capacity - lambda, TICK_DT)).max(0.0);
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
    let pressure = capped_divide(queue_depth, capped_add(capacity, queue_depth));
    clamp(capped_add(capped_multiply(safe_rho, 100.0), capped_multiply(pressure, 10.0)), 0.0, 100.0)
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

    #[test]
    fn non_finite_tokens_use_defaults() {
        assert_eq!(super::floor_at_least_one(f64::NAN, 1024.0), 1024.0);
        assert_eq!(super::floor_at_least_one(f64::INFINITY, 256.0), 256.0);
        assert_eq!(super::floor_at_least_one(f64::NEG_INFINITY, 256.0), 256.0);
        assert_eq!(super::floor_at_least_one(-1.0, 256.0), 1.0);
    }

    #[test]
    fn hostile_values_saturate_instead_of_overflowing() {
        assert_eq!(super::capped_multiply(f64::MAX, f64::MAX), super::MAX_SIM_VALUE);
        assert_eq!(super::capped_divide(f64::MAX, f64::MIN_POSITIVE), super::MAX_SIM_VALUE);
        assert_eq!(super::active_replicas(f64::MAX), super::MAX_SIM_VALUE);
        assert_eq!(super::active_replicas(f64::INFINITY), super::MAX_SIM_VALUE);
        assert_eq!(super::active_replicas(f64::NEG_INFINITY), 1.0);
        assert!(super::cpu_percent(f64::MAX, f64::MAX, f64::MAX).is_finite());
    }
}
