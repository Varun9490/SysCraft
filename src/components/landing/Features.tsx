'use client';

import {
  Activity,
  BrainCircuit,
  FileCode2,
  FlaskConical,
  LayoutGrid,
  Zap,
} from "@/components/ui/icons";
import { StaggerChild, StaggerGroup, TiltCard } from "@/components/ui/motion";

interface Feature {
  Icon: typeof Zap;
  title: string;
  description: string;
  span: string;
  visual?: "canvas" | "signal";
}

const FEATURES: Feature[] = [
  {
    Icon: LayoutGrid,
    title: "Infinite design canvas",
    description:
      "Drag, connect, and compose 32 infrastructure primitives — gateways, caches, Kafka, Cassandra, vector DBs, LLM inference — on a zoomable canvas that never runs out of room.",
    span: "lg:col-span-3",
    visual: "canvas",
  },
  {
    Icon: Activity,
    title: "Real-time simulation",
    description:
      "A discrete-event queuing engine runs at 20Hz. Watch requests flow as particles, queues form, latency spike, and cost climb as load grows.",
    span: "lg:col-span-3",
    visual: "signal",
  },
  {
    Icon: FlaskConical,
    title: "16 real-world labs",
    description: "Design Bitly, YouTube, WhatsApp, Uber, and Stripe's rate limiter — graded automatically against SLOs and budgets.",
    span: "lg:col-span-4",
  },
  {
    Icon: Zap,
    title: "Chaos engineering",
    description: "Inject zone outages, latency spikes, packet loss, and traffic surges. Watch cascading failures and fix the weak links.",
    span: "lg:col-span-2",
  },
  {
    Icon: BrainCircuit,
    title: "Socratic AI interviewer",
    description: "Practice against an adversarial interviewer that probes your assumptions and grades you on a real rubric.",
    span: "lg:col-span-2",
  },
  {
    Icon: FileCode2,
    title: "One-click IaC export",
    description:
      "Turn any canvas into Terraform, Docker Compose, or Kubernetes manifests — the same topology you designed, ready to ship.",
    span: "lg:col-span-4",
  },
];

function CanvasVisual() {
  return (
    <svg viewBox="0 0 320 120" className="mt-5 w-full" aria-hidden="true">
      <path d="M28 84 H108 M108 84 V40 H180 M180 40 H252" stroke="rgb(var(--line-strong))" strokeWidth="1.5" fill="none" />
      <path
        d="M28 84 H108 M108 84 V40 H180 M180 40 H252"
        stroke="rgb(205 168 106 / 0.7)"
        strokeWidth="1.5"
        fill="none"
        className="animate-dash"
      />
      {[
        [28, 84],
        [108, 84],
        [108, 40],
        [180, 40],
        [252, 40],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 7} y={y - 7} width="14" height="14" rx="3" fill="#201E19" stroke="rgb(205 168 106 / 0.5)" />
      ))}
      <rect x="60" y="76" width="36" height="16" rx="3" fill="#141310" stroke="rgb(255 255 255 / 0.08)" />
      <rect x="200" y="32" width="40" height="16" rx="3" fill="#141310" stroke="rgb(255 255 255 / 0.08)" />
    </svg>
  );
}

function SignalVisual() {
  return (
    <svg viewBox="0 0 320 120" className="mt-5 w-full" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect
          key={i}
          x={20 + i * 42}
          y={100 - (18 + i * 11)}
          width="20"
          height={18 + i * 11}
          rx="3"
          fill="rgb(205 168 106 / 0.16)"
          stroke="rgb(205 168 106 / 0.35)"
        >
          <animate
            attributeName="height"
            values={`${18 + i * 11};${22 + i * 12};${18 + i * 11}`}
            dur="2.4s"
            begin={`${i * 0.18}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="y"
            values={`${100 - (18 + i * 11)};${100 - (22 + i * 12)};${100 - (18 + i * 11)}`}
            dur="2.4s"
            begin={`${i * 0.18}s`}
            repeatCount="indefinite"
          />
        </rect>
      ))}
    </svg>
  );
}

export function Features() {
  return (
    <section className="section-container py-20 md:py-24">
      <div className="max-w-2xl">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Why SysCraft</span>
        <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-content md:text-4xl">
          A full engineering workbench, not a video course
        </h2>
        <p className="mt-4 text-pretty text-[15px] leading-relaxed text-content-secondary">
          Every concept becomes a diagram you build, run, and break. The feedback loop is the curriculum.
        </p>
      </div>

      <StaggerGroup className="mt-14 grid gap-5 lg:grid-cols-6" stagger={0.07}>
        {FEATURES.map((feature) => {
          const { Icon } = feature;
          return (
            <StaggerChild key={feature.title} className={`${feature.span} h-full`}>
              <TiltCard className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-app/60 p-6 shadow-card">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line-strong bg-app-raised text-brass">
                  <Icon size={18} weight="bold" />
                </span>
                <h3 className="mt-5 text-[15px] font-semibold text-content">{feature.title}</h3>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-content-secondary">{feature.description}</p>
                {feature.visual === "canvas" && <CanvasVisual />}
                {feature.visual === "signal" && <SignalVisual />}
              </TiltCard>
            </StaggerChild>
          );
        })}
      </StaggerGroup>
    </section>
  );
}
