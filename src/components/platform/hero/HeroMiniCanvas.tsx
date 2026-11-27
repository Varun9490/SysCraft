'use client';

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A classroom model, not a measurement. Every number below is a fixed teaching
 * constant, chosen so the effect of each control is predictable before a click.
 */
const BASE_ARRIVAL_RPS = 120;
const SPIKE_MULTIPLIER = 3;
const ATTACK_RPS = 140;
const API_CAPACITY_RPS = 100;
const DB_CAPACITY_RPS = 300;
const RETRY_RATIO = 0.35;
const MAX_RETRY_RPS = 120;

const REQUEST_COUNT = 10;
const RESPONSE_COUNT = 5;
const ATTACK_COUNT = 4;

const GOOD = "#7E9A6A";
const WARN = "#C58F4A";
const BAD = "#BE5F58";
const REQUEST_COLOR = "#DBBB86";
const RESPONSE_COLOR = "#AFC79B";
const ATTACK_COLOR = "#CE7E78";

interface Controls {
  spike: boolean;
  kill: boolean;
  attack: boolean;
  shield: boolean;
}

interface Values {
  arrival: number;
  apiA: number;
  apiB: number;
  db: number;
  blocked: number;
  errorPct: number;
  attack: number;
}

function targetsFor({ spike, kill, attack, shield }: Controls): Values {
  const arrival = BASE_ARRIVAL_RPS * (spike ? SPIKE_MULTIPLIER : 1);
  // Shielded traffic is dropped at the edge: it never reaches an API or the DB.
  const attackLoad = attack && !shield ? ATTACK_RPS : 0;
  const seen = arrival + attackLoad;
  const apiA = kill ? seen : seen / 2;
  const apiB = kill ? 0 : seen / 2;
  // Overloaded apps retry, which is why the DB can see more than the client sent.
  const retries = Math.min(
    MAX_RETRY_RPS,
    Math.max(0, apiA - API_CAPACITY_RPS) * RETRY_RATIO +
      Math.max(0, apiB - API_CAPACITY_RPS) * RETRY_RATIO,
  );
  return {
    arrival,
    apiA,
    apiB,
    db: seen + retries,
    blocked: attack && shield ? (spike ? 36 : 18) : 0,
    errorPct:
      attack && !shield
        ? Math.min(92, 14 + (apiA > API_CAPACITY_RPS ? 26 : 0) + (seen + retries > DB_CAPACITY_RPS ? 26 : 0))
        : 0,
    attack: attackLoad,
  };
}

const INITIAL_CONTROLS: Controls = { spike: false, kill: false, attack: false, shield: true };
const INITIAL_VALUES = targetsFor(INITIAL_CONTROLS);

/* Request lanes: the whole route, including the hop through each node. */
const ROUTE_A =
  "M 88 132 H 250 C 258 132 258 74 272 74 H 364 H 410 C 426 74 426 132 446 132";
const ROUTE_B =
  "M 88 132 H 250 C 258 132 258 170 272 170 H 364 H 410 C 426 170 426 132 446 132";
const RESPONSE_PATH = "M 502 156 V 226 H 52 V 156";
/* Attack enters through the shield. With the shield off it continues to API A. */
const ATTACK_ENTRY = "M 196 20 V 50";
const ATTACK_BYPASS =
  "M 196 80 V 132 H 250 C 258 132 258 74 272 74 H 364";

const EDGE_CLIENT_LB = "M 88 132 H 132";
const EDGE_LB_A = "M 224 132 H 250 C 258 132 258 74 272 74";
const EDGE_LB_B = "M 224 132 H 250 C 258 132 258 170 272 170";
const EDGE_A_DB = "M 364 74 H 410 C 426 74 426 132 446 132";
const EDGE_B_DB = "M 364 170 H 410 C 426 170 426 132 446 132";

const STEPS = ["Request", "Route", "Query", "Return"] as const;

function healthColor(value: number, capacity: number): string {
  if (value > capacity) return BAD;
  if (value > capacity * 0.8) return WARN;
  return GOOD;
}

function progressAtX(path: SVGPathElement, targetX: number, length: number): number {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 14; i += 1) {
    const mid = (low + high) / 2;
    if (path.getPointAtLength(length * mid).x < targetX) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function pulseAt(progress: number, center: number): number {
  return Math.max(0, 1 - Math.abs(progress - center) / 0.06);
}

export function HeroMiniCanvas() {
  const [spike, setSpike] = useState(false);
  const [kill, setKill] = useState(false);
  const [attack, setAttack] = useState(false);
  const [shield, setShield] = useState(true);
  const reducedMotion = useReducedMotion() === true;

  const controlsRef = useRef<Controls>(INITIAL_CONTROLS);
  const valuesRef = useRef<Values>({ ...INITIAL_VALUES });
  const phaseRef = useRef(0);
  const snapshotRef = useRef<(() => void) | null>(null);

  const routeARef = useRef<SVGPathElement | null>(null);
  const routeBRef = useRef<SVGPathElement | null>(null);
  const responseRef = useRef<SVGPathElement | null>(null);
  const attackEntryRef = useRef<SVGPathElement | null>(null);
  const attackBypassRef = useRef<SVGPathElement | null>(null);
  const routeAEdgeRef = useRef<SVGPathElement | null>(null);
  const routeBEdgeRef = useRef<SVGPathElement | null>(null);
  const responseEdgeRef = useRef<SVGPathElement | null>(null);

  const requestPackets = useRef<Array<SVGCircleElement | null>>([]);
  const responsePackets = useRef<Array<SVGCircleElement | null>>([]);
  const attackPackets = useRef<Array<SVGCircleElement | null>>([]);
  const steps = useRef<Array<HTMLLIElement | null>>([]);

  const haloClient = useRef<SVGRectElement | null>(null);
  const haloLB = useRef<SVGRectElement | null>(null);
  const haloA = useRef<SVGRectElement | null>(null);
  const haloB = useRef<SVGRectElement | null>(null);
  const haloDB = useRef<SVGRectElement | null>(null);
  const haloShield = useRef<SVGRectElement | null>(null);

  const arrivalText = useRef<HTMLParagraphElement | null>(null);
  const apiAStat = useRef<HTMLParagraphElement | null>(null);
  const apiBStat = useRef<HTMLParagraphElement | null>(null);
  const dbStat = useRef<HTMLParagraphElement | null>(null);
  const apiANodeText = useRef<SVGTextElement | null>(null);
  const apiBNodeText = useRef<SVGTextElement | null>(null);
  const dbNodeText = useRef<SVGTextElement | null>(null);
  const shieldStatus = useRef<SVGTextElement | null>(null);
  const shieldVerdict = useRef<SVGTextElement | null>(null);
  const attackVerdict = useRef<HTMLSpanElement | null>(null);
  const apiBarA = useRef<SVGRectElement | null>(null);
  const apiBarB = useRef<SVGRectElement | null>(null);
  const dbBar = useRef<SVGRectElement | null>(null);
  const apiANode = useRef<SVGRectElement | null>(null);
  const dbNode = useRef<SVGRectElement | null>(null);

  useEffect(() => {
    const routeA = routeARef.current;
    const routeB = routeBRef.current;
    const response = responseRef.current;
    const entry = attackEntryRef.current;
    const bypass = attackBypassRef.current;
    if (!routeA || !routeB || !response || !entry || !bypass) return;

    const lengthA = routeA.getTotalLength();
    const lengthB = routeB.getTotalLength();
    const lengthResponse = response.getTotalLength();
    const lengthEntry = entry.getTotalLength();
    const lengthBypass = bypass.getTotalLength();
    const lbAtA = progressAtX(routeA, 178, lengthA);
    const apiAtA = progressAtX(routeA, 318, lengthA);
    const lbAtB = progressAtX(routeB, 178, lengthB);
    const apiAtB = progressAtX(routeB, 318, lengthB);

    const writtenText = new WeakMap<Element, string>();
    const writtenAttr = new WeakMap<Element, Map<string, string>>();

    const setText = (element: Element | null, value: string): void => {
      if (!element || writtenText.get(element) === value) return;
      writtenText.set(element, value);
      element.textContent = value;
    };
    const setAttr = (element: Element | null, key: string, value: string): void => {
      if (!element) return;
      let attrs = writtenAttr.get(element);
      if (!attrs) {
        attrs = new Map<string, string>();
        writtenAttr.set(element, attrs);
      }
      if (attrs.get(key) === value) return;
      attrs.set(key, value);
      element.setAttribute(key, value);
    };

    const place = (dot: SVGCircleElement | null, path: SVGPathElement, total: number, progress: number): void => {
      if (!dot) return;
      const point = path.getPointAtLength(total * Math.min(1, Math.max(0, progress)));
      dot.setAttribute("cx", point.x.toFixed(2));
      dot.setAttribute("cy", point.y.toFixed(2));
    };

    const paintHalos = (client: number, lb: number, a: number, b: number, db: number, shieldPulse: number): void => {
      const halo = (element: SVGRectElement | null, level: number): void => {
        if (!element) return;
        element.setAttribute("opacity", (0.08 + level * 0.62).toFixed(2));
        element.setAttribute("stroke-width", (1 + level * 1.4).toFixed(2));
      };
      halo(haloClient.current, client);
      halo(haloLB.current, lb);
      halo(haloA.current, a);
      halo(haloB.current, b);
      halo(haloDB.current, db);
      halo(haloShield.current, shieldPulse);
    };

    const paint = (values: Values, controls: Controls): void => {
      const arrival = Math.round(values.arrival);
      const apiALoad = Math.round(values.apiA);
      const apiBLoad = Math.round(values.apiB);
      const dbLoad = Math.round(values.db);
      const overA = values.apiA > API_CAPACITY_RPS;
      const overB = !controls.kill && values.apiB > API_CAPACITY_RPS;
      const overDb = values.db > DB_CAPACITY_RPS;

      setText(arrivalText.current, `${arrival} req/s`);
      if (arrivalText.current) arrivalText.current.style.color = healthColor(values.arrival, DB_CAPACITY_RPS);
      setText(apiAStat.current, `${Math.min(999, Math.round((values.apiA / API_CAPACITY_RPS) * 100))}% CPU${overA ? " · over capacity" : ""}`);
      if (apiAStat.current) apiAStat.current.style.color = healthColor(values.apiA, API_CAPACITY_RPS);
      setText(apiBStat.current, controls.kill ? "offline · no traffic" : `${Math.round((values.apiB / API_CAPACITY_RPS) * 100)}% CPU${overB ? " · over capacity" : ""}`);
      if (apiBStat.current) apiBStat.current.style.color = controls.kill ? BAD : healthColor(values.apiB, API_CAPACITY_RPS);
      setText(dbStat.current, `${overDb ? "queuing" : "healthy"} · ${dbLoad} req/s`);
      if (dbStat.current) dbStat.current.style.color = healthColor(values.db, DB_CAPACITY_RPS);

      setText(apiANodeText.current, controls.kill ? "carrying all" : `${apiALoad} rps`);
      setText(apiBNodeText.current, controls.kill ? "offline" : `${apiBLoad} rps`);
      setText(dbNodeText.current, overDb ? "queuing" : "healthy");
      if (apiANodeText.current) apiANodeText.current.setAttribute("fill", overA ? "#E3A19C" : "#AFC79B");
      if (apiBNodeText.current) apiBNodeText.current.setAttribute("fill", controls.kill ? "#E3A19C" : overB ? "#E3A19C" : "#AFC79B");
      if (dbNodeText.current) dbNodeText.current.setAttribute("fill", overDb ? "#E7C08A" : "#AFC79B");
      setAttr(routeAEdgeRef.current, "stroke", overA ? BAD : REQUEST_COLOR);
      setAttr(routeBEdgeRef.current, "stroke", controls.kill ? "#46423A" : overB ? BAD : REQUEST_COLOR);
      setAttr(responseEdgeRef.current, "stroke", overDb ? WARN : RESPONSE_COLOR);
      setAttr(apiANode.current, "stroke", overA ? BAD : WARN);
      setAttr(dbNode.current, "stroke", overDb ? WARN : GOOD);

      const barWidth = (value: number, capacity: number): string =>
        Math.min(72, Math.max(0, (value / capacity) * 72)).toFixed(1);
      setAttr(apiBarA.current, "width", barWidth(values.apiA, API_CAPACITY_RPS));
      setAttr(apiBarB.current, "width", barWidth(values.apiB, API_CAPACITY_RPS));
      setAttr(dbBar.current, "width", barWidth(values.db, DB_CAPACITY_RPS));
      setAttr(apiBarA.current, "fill", healthColor(values.apiA, API_CAPACITY_RPS));
      setAttr(apiBarB.current, "fill", healthColor(values.apiB, API_CAPACITY_RPS));
      setAttr(dbBar.current, "fill", healthColor(values.db, DB_CAPACITY_RPS));

      setText(shieldStatus.current, controls.shield ? "shield · on" : "shield · off");
      setText(
        shieldVerdict.current,
        !controls.attack ? "" : controls.shield ? "blocked at the edge" : "flood reaching API · A",
      );
      setText(
        attackVerdict.current,
        controls.shield
          ? `${Math.round(values.blocked)} blocked`
          : `${Math.round(values.errorPct)}% errors`,
      );
      if (attackVerdict.current) {
        attackVerdict.current.style.color = controls.shield ? GOOD : BAD;
      }
    };

    const paintPackets = (controls: Controls, progress: number, animate: boolean): void => {
      const speed = controls.spike ? 0.00042 : 0.0002;
      const responseSpeed = speed * (valuesRef.current.db > DB_CAPACITY_RPS ? 0.62 : 0.82);
      let clientPulse = 0;
      let lbPulse = 0;
      let apiAPulse = 0;
      let apiBPulse = 0;
      let dbPulse = 0;
      let shieldPulse = 0;

      requestPackets.current.forEach((dot, index) => {
        if (!dot) return;
        const viaB = index % 2 === 1;
        if (controls.kill && viaB) {
          dot.setAttribute("opacity", "0");
          return;
        }
        const p = animate
          ? (progress * speed + index / REQUEST_COUNT) % 1
          : 0.16 + (index / REQUEST_COUNT) * 0.68;
        place(dot, viaB ? routeB : routeA, viaB ? lengthB : lengthA, p);
        const fade = animate ? Math.min(1, Math.sin(Math.PI * p) * 1.8) : 0.9;
        dot.setAttribute("opacity", fade.toFixed(2));
        lbPulse = Math.max(lbPulse, pulseAt(p, viaB ? lbAtB : lbAtA));
        if (viaB) apiBPulse = Math.max(apiBPulse, pulseAt(p, apiAtB));
        else apiAPulse = Math.max(apiAPulse, pulseAt(p, apiAtA));
        dbPulse = Math.max(dbPulse, pulseAt(p, 0.97));
      });

      responsePackets.current.forEach((dot, index) => {
        if (!dot) return;
        const p = animate
          ? (progress * responseSpeed + index / RESPONSE_COUNT) % 1
          : 0.18 + (index / RESPONSE_COUNT) * 0.64;
        place(dot, response, lengthResponse, p);
        dot.setAttribute("opacity", (animate ? Math.min(1, Math.sin(Math.PI * p) * 1.8) : 0.85).toFixed(2));
        dot.setAttribute("fill", valuesRef.current.db > DB_CAPACITY_RPS ? WARN : RESPONSE_COLOR);
        dbPulse = Math.max(dbPulse, pulseAt(p, 0.04));
        clientPulse = Math.max(clientPulse, pulseAt(p, 0.96));
      });

      attackPackets.current.forEach((dot, index) => {
        if (!dot) return;
        if (!controls.attack) {
          dot.setAttribute("opacity", "0");
          return;
        }
        const raw = animate
          ? (progress * (controls.spike ? 0.00058 : 0.00034) + index / ATTACK_COUNT) % 1
          : 0.3 + (index / ATTACK_COUNT) * 0.4;
        if (controls.shield) {
          // The packet stops on the near side of the shield. It never enters the path beyond it.
          place(dot, entry, lengthEntry, animate ? Math.min(raw, 0.86) : 0.78);
          dot.setAttribute("opacity", animate && raw > 0.86 ? "0" : "0.9");
          shieldPulse = Math.max(shieldPulse, animate ? pulseAt(raw, 0.8) : 0.45);
        } else {
          place(dot, bypass, lengthBypass, raw);
          dot.setAttribute("opacity", (animate ? Math.min(1, Math.sin(Math.PI * raw) * 1.8) : 0.88).toFixed(2));
          apiAPulse = Math.max(apiAPulse, pulseAt(raw, 0.96));
        }
      });

      paintHalos(clientPulse, lbPulse, apiAPulse, apiBPulse, dbPulse, shieldPulse);

      if (animate) {
        const lead = requestPackets.current[0];
        // The first packet stands in for the lifecycle readout; no React state per frame.
        const marker = lead ? Number(lead.getAttribute("cx")) : 0;
        const active = marker < 160 ? 0 : marker < 290 ? 1 : marker < 420 ? 2 : 3;
        steps.current.forEach((step, index) => {
          if (!step) return;
          const value = index === active ? "active" : "idle";
          if (step.getAttribute("data-step-state") !== value) step.setAttribute("data-step-state", value);
        });
      }
    };

    const snapshot = (): void => {
      const controls = controlsRef.current;
      const target = targetsFor(controls);
      valuesRef.current = { ...target };
      paint(valuesRef.current, controls);
      paintPackets(controls, 0, false);
    };
    snapshotRef.current = snapshot;

    if (reducedMotion) {
      snapshot();
      return () => {
        snapshotRef.current = null;
      };
    }

    let frame = 0;
    let last = performance.now();
    const tick = (now: number): void => {
      const dt = Math.min(64, Math.max(0, now - last));
      last = now;
      phaseRef.current += dt;
      const controls = controlsRef.current;
      const target = targetsFor(controls);
      const alpha = 1 - Math.exp(-dt / 210);
      const values = valuesRef.current;

      (Object.keys(target) as Array<keyof Values>).forEach((key) => {
        // `blocked` is a running count, not a level to interpolate toward.
        if (key === "blocked") return;
        values[key] += (target[key] - values[key]) * alpha;
      });
      if (controls.attack && controls.shield) {
        values.blocked += (controls.spike ? 36 : 18) * (dt / 1000);
      }
      if (!controls.attack) values.blocked = 0;
      paint(values, controls);
      paintPackets(controls, phaseRef.current, true);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      snapshotRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    controlsRef.current = { spike, kill, attack, shield };
    if (reducedMotion) snapshotRef.current?.();
  }, [spike, kill, attack, shield, reducedMotion]);

  return (
    <div className="rounded-2xl border border-line/70 bg-app/50 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
          Live model · request → response
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-brass">
          Demo model, not a benchmark
        </span>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-line/60 bg-ink/50">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgb(var(--line)/0.35)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--line)/0.35)_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <svg
          viewBox="0 0 580 264"
          className="relative block w-full"
          role="img"
          aria-label="A client request travels through a load balancer to API A or B and the database, then a response returns along the lower lane. Attack traffic is dropped at the edge shield when the shield is on."
        >
          {/* Edges + flow beams */}
          <g fill="none" strokeWidth="1">
            <path d={EDGE_CLIENT_LB} stroke={REQUEST_COLOR} strokeOpacity="0.3" />
            <path ref={routeAEdgeRef} d={EDGE_LB_A} stroke={REQUEST_COLOR} strokeOpacity="0.32" />
            <path ref={routeBEdgeRef} d={EDGE_LB_B} stroke={REQUEST_COLOR} strokeOpacity="0.32" />
            <path d={EDGE_A_DB} stroke={REQUEST_COLOR} strokeOpacity="0.3" />
            <path d={EDGE_B_DB} stroke={REQUEST_COLOR} strokeOpacity="0.3" />
            <path ref={responseEdgeRef} d={RESPONSE_PATH} stroke={RESPONSE_COLOR} strokeOpacity="0.34" />
            <path d={ATTACK_ENTRY} stroke={ATTACK_COLOR} strokeOpacity={attack ? 0.5 : 0.14} strokeDasharray="2 5" />
            <path
              d={ATTACK_BYPASS}
              stroke={ATTACK_COLOR}
              strokeOpacity={attack && !shield ? 0.42 : 0.08}
              strokeDasharray="2 5"
            />
            <path d={EDGE_LB_A} stroke={REQUEST_COLOR} strokeOpacity="0.5" className="animate-dash" />
            <path d={EDGE_LB_B} stroke={REQUEST_COLOR} strokeOpacity="0.5" className="animate-dash" />
            <path d={EDGE_A_DB} stroke={REQUEST_COLOR} strokeOpacity="0.46" className="animate-dash" />
            <path d={EDGE_B_DB} stroke={REQUEST_COLOR} strokeOpacity="0.46" className="animate-dash" />
            <path d={RESPONSE_PATH} stroke={RESPONSE_COLOR} strokeOpacity="0.42" className="animate-dash" />
          </g>

          {/* Invisible, continuous motion paths */}
          <g fill="none" stroke="none" opacity="0">
            <path ref={routeARef} d={ROUTE_A} />
            <path ref={routeBRef} d={ROUTE_B} />
            <path ref={responseRef} d={RESPONSE_PATH} />
            <path ref={attackEntryRef} d={ATTACK_ENTRY} />
            <path ref={attackBypassRef} d={ATTACK_BYPASS} />
          </g>

          {/* Arrival halos — written by the animation frame, never by React per frame */}
          <g fill="none" stroke={REQUEST_COLOR} opacity="0.08">
            <rect ref={haloClient} x="12" y="104" width="80" height="56" rx="12" />
            <rect ref={haloLB} x="128" y="104" width="100" height="56" rx="12" />
            <rect ref={haloA} x="268" y="48" width="100" height="52" rx="12" />
            <rect ref={haloB} x="268" y="144" width="100" height="52" rx="12" />
            <rect ref={haloDB} x="442" y="104" width="120" height="56" rx="12" />
          </g>
          <rect
            ref={haloShield}
            x="146"
            y="46"
            width="100"
            height="38"
            rx="12"
            fill="none"
            stroke={ATTACK_COLOR}
            opacity="0.08"
          />

          {/* Nodes */}
          <g>
            <rect x="16" y="108" width="72" height="48" rx="8" fill="#141310" stroke="#46423A" />
            <text x="52" y="130" textAnchor="middle" fill="#EEEAE3" fontSize="11" fontFamily="ui-monospace, monospace">Client</text>
            <text x="52" y="143" textAnchor="middle" fill="#7A7468" fontSize="8" fontFamily="ui-monospace, monospace">browser</text>

            <rect x="132" y="108" width="92" height="48" rx="8" fill="#141310" stroke="#9A7642" />
            <text x="178" y="128" textAnchor="middle" fill="#E6CC9F" fontSize="10" fontFamily="ui-monospace, monospace">Load</text>
            <text x="178" y="141" textAnchor="middle" fill="#E6CC9F" fontSize="10" fontFamily="ui-monospace, monospace">balancer</text>

            <rect ref={apiANode} x="272" y="52" width="92" height="44" rx="8" fill="#141310" stroke={WARN} />
            <text x="318" y="70" textAnchor="middle" fill="#EEEAE3" fontSize="10" fontFamily="ui-monospace, monospace">API · A</text>
            <text ref={apiANodeText} x="318" y="84" textAnchor="middle" fill="#AFC79B" fontSize="9" fontFamily="ui-monospace, monospace">
              {Math.round(INITIAL_VALUES.apiA)} rps
            </text>
            <rect x="282" y="89" width="72" height="2" rx="1" fill="#2C2A23" />
            <rect ref={apiBarA} x="282" y="89" width="43" height="2" rx="1" fill={GOOD} />

            <rect
              x="272"
              y="148"
              width="92"
              height="44"
              rx="8"
              fill="#141310"
              stroke={kill ? BAD : WARN}
              strokeDasharray={kill ? "3 4" : undefined}
            />
            <text x="318" y="166" textAnchor="middle" fill={kill ? "#A8A296" : "#EEEAE3"} fontSize="10" fontFamily="ui-monospace, monospace">
              {kill ? "API · B down" : "API · B"}
            </text>
            <text ref={apiBNodeText} x="318" y="180" textAnchor="middle" fill="#AFC79B" fontSize="9" fontFamily="ui-monospace, monospace">
              {Math.round(INITIAL_VALUES.apiB)} rps
            </text>
            <rect x="282" y="187" width="72" height="2" rx="1" fill="#2C2A23" />
            <rect ref={apiBarB} x="282" y="187" width="43" height="2" rx="1" fill={GOOD} />

            <rect ref={dbNode} x="446" y="108" width="112" height="48" rx="8" fill="#141310" stroke={GOOD} />
            <text x="502" y="128" textAnchor="middle" fill="#EEEAE3" fontSize="10" fontFamily="ui-monospace, monospace">Database</text>
            <text ref={dbNodeText} x="502" y="141" textAnchor="middle" fill="#AFC79B" fontSize="9" fontFamily="ui-monospace, monospace">healthy</text>
            <rect x="458" y="149" width="72" height="2" rx="1" fill="#2C2A23" />
            <rect ref={dbBar} x="458" y="149" width="29" height="2" rx="1" fill={GOOD} />

            <rect x="150" y="50" width="92" height="30" rx="7" fill="#141310" stroke={shield ? GOOD : BAD} />
            <text x="196" y="62" textAnchor="middle" fill="#EEEAE3" fontSize="9" fontFamily="ui-monospace, monospace">edge shield</text>
            <text ref={shieldStatus} x="196" y="74" textAnchor="middle" fill={shield ? "#AFC79B" : "#E3A19C"} fontSize="8" fontFamily="ui-monospace, monospace">
              shield · on
            </text>
            <text x="196" y="14" textAnchor="middle" fill={attack ? "#E3A19C" : "#7A7468"} fontSize="9" fontFamily="ui-monospace, monospace">
              untrusted flood
            </text>
            <text ref={shieldVerdict} x="318" y="100" textAnchor="middle" fill={GOOD} fontSize="8" fontFamily="ui-monospace, monospace" />
            <text x="276" y="243" textAnchor="middle" fill={RESPONSE_COLOR} fontSize="8" fontFamily="ui-monospace, monospace">
              response · API → LB → client
            </text>
          </g>

          {/* Packets are placed by rAF; React never updates them per frame. */}
          <g>
            {Array.from({ length: REQUEST_COUNT }, (_, index) => (
              <circle
                key={`request-${index}`}
                ref={(element) => { requestPackets.current[index] = element; }}
                r="3"
                cx="88"
                cy="132"
                fill={REQUEST_COLOR}
                opacity="0"
              />
            ))}
            {Array.from({ length: RESPONSE_COUNT }, (_, index) => (
              <circle
                key={`response-${index}`}
                ref={(element) => { responsePackets.current[index] = element; }}
                r="2.6"
                cx="502"
                cy="156"
                fill={RESPONSE_COLOR}
                opacity="0"
              />
            ))}
            {Array.from({ length: ATTACK_COUNT }, (_, index) => (
              <circle
                key={`attack-${index}`}
                ref={(element) => { attackPackets.current[index] = element; }}
                r="2.6"
                cx="196"
                cy="20"
                fill={ATTACK_COLOR}
                opacity="0"
              />
            ))}
          </g>
        </svg>
      </div>

      <ol className="mt-3 grid grid-cols-4 gap-2" aria-label="Packet lifecycle">
        {STEPS.map((step, index) => (
          <li
            key={step}
            ref={(element) => { steps.current[index] = element; }}
            data-step-state={index === 0 ? "active" : "idle"}
            className="flex items-center gap-1.5 border-t border-line/70 pt-2 font-mono text-[9px] uppercase tracking-[0.1em] text-content-tertiary transition-colors duration-300 data-[step-state=active]:border-brass data-[step-state=active]:text-brass-bright"
          >
            <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
            <span className="truncate">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line/60 pt-4 sm:grid-cols-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">Client sends</p>
          <p ref={arrivalText} className="mt-1 font-mono text-[13px] tabular-nums text-success">120 req/s</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">API · A load</p>
          <p ref={apiAStat} className="mt-1 font-mono text-[13px] tabular-nums text-success">60% CPU</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">API · B load</p>
          <p ref={apiBStat} className="mt-1 font-mono text-[13px] tabular-nums text-success">60% CPU</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">DB sees · retries in</p>
          <p ref={dbStat} className="mt-1 font-mono text-[13px] tabular-nums text-success">healthy · 120 req/s</p>
        </div>
      </div>

      {attack && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-line/60 bg-app-raised/40 px-3 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">Edge shield</span>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-content-secondary">
            <input
              type="checkbox"
              checked={shield}
              onChange={(event) => setShield(event.target.checked)}
              className="h-3.5 w-3.5 accent-brass"
            />
            {shield ? "on — dropping at the edge" : "off — reaching the API"}
          </label>
          <span ref={attackVerdict} className="ml-auto font-mono text-[11px] tabular-nums text-success">
            0 blocked
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSpike((value) => !value)}
          aria-pressed={spike}
          className={`rounded-full border px-3.5 py-2 text-[12px] font-medium transition-colors ${
            spike
              ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
              : "border-line-strong bg-app-raised/50 text-content-secondary hover:border-brass/50 hover:text-content"
          }`}
        >
          Spike traffic 3×
        </button>
        <button
          type="button"
          onClick={() => setKill((value) => !value)}
          aria-pressed={kill}
          className={`rounded-full border px-3.5 py-2 text-[12px] font-medium transition-colors ${
            kill
              ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
              : "border-line-strong bg-app-raised/50 text-content-secondary hover:border-brass/50 hover:text-content"
          }`}
        >
          Kill an API node
        </button>
        <button
          type="button"
          onClick={() => setAttack((value) => !value)}
          aria-pressed={attack}
          className={`rounded-full border px-3.5 py-2 text-[12px] font-medium transition-colors ${
            attack
              ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
              : "border-line-strong bg-app-raised/50 text-content-secondary hover:border-brass/50 hover:text-content"
          }`}
        >
          Simulate attack
        </button>
      </div>
    </div>
  );
}
