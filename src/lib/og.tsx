import { ImageResponse } from "next/og";

/**
 * Shared OG-image design. One visual language for every card: warm charcoal
 * canvas, brass accent, big title, quiet metadata. Rendered with satori
 * (jsh: none) so every style is inline — Tailwind does not apply here.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

const INK = "rgb(12,11,9)";
const SURFACE = "rgb(20,19,16)";
const LINE = "rgb(44,41,34)";
const LINE_STRONG = "rgb(70,65,54)";
const CONTENT = "rgb(238,234,227)";
const SECONDARY = "rgb(168,162,150)";
const TERTIARY = "rgb(122,116,104)";
const BRASS = "rgb(205,168,106)";
const BRASS_BRIGHT = "rgb(219,187,134)";

function wrapTitle(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) {
    const skipped = words.slice(lines.join(" ").split(" ").length);
    if (skipped.length > 0) {
      const last = lines[maxLines - 1];
      if (last.length < maxChars - 1) {
        lines[maxLines - 1] = `${last}...`;
      }
    }
  }
  return lines.length > 0 ? lines : [title];
}

/** Decorative dot grid, top-right quadrant. */
function DotGrid() {
  const dots: React.ReactNode[] = [];
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 6; row++) {
      dots.push(
        <div
          key={`${col}-${row}`}
          style={{
            display: "flex",
            position: "absolute",
            left: 720 + col * 38,
            top: 48 + row * 38,
            width: 3,
            height: 3,
            borderRadius: 2,
            backgroundColor: LINE_STRONG,
          }}
        />,
      );
    }
  }
  return <div style={{ display: "flex" }}>{dots}</div>;
}

export interface OgCard {
  /** Title text — auto-wrapped to three lines max. */
  title: string;
  /** Optional quiet line under the title. */
  subtitle?: string;
  /** Small brass tag above the title, e.g. "DESIGN LAB · STANDARD". */
  badge?: string;
  /** Right-aligned stat chip row under the badge. */
  stats?: string[];
}

export function renderOgCard(card: OgCard): ImageResponse {
  const titleLines = wrapTitle(card.title, 22, 3);
  const fontSize = titleLines.length >= 3 ? 70 : titleLines.length === 2 ? 78 : 86;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: INK,
          padding: "56px 64px",
          position: "relative",
          backgroundImage: `linear-gradient(180deg, ${SURFACE} 0%, ${INK} 58%)`,
        }}
      >
        <DotGrid />
        {/* Night-city silhouette along the bottom */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 96,
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          {[48, 82, 34, 64, 96, 40, 72, 28, 58, 44, 88, 36, 66, 30, 50, 76].map((h, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                width: `${100 / 17}%`,
                height: h,
                backgroundColor: i % 3 === 0 ? SURFACE : "transparent",
                borderTop: `2px solid ${LINE}`,
              }}
            />
          ))}
        </div>

        {/* Header row: wordmark + badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: BRASS,
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                fontWeight: 700,
                color: INK,
              }}
            >
              Sc
            </div>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: CONTENT }}>
              Sys<span style={{ color: BRASS }}>Craft</span>
            </div>
          </div>
          {card.badge && (
            <div
              style={{
                display: "flex",
                padding: "10px 22px",
                borderRadius: 999,
                border: `1px solid ${BRASS}`,
                backgroundColor: "rgba(205,168,106,0.12)",
                color: BRASS_BRIGHT,
                fontSize: 21,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              {card.badge}
            </div>
          )}
        </div>

        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22, position: "relative", maxWidth: 1010 }}>
          <div style={{ display: "flex", width: 84, height: 5, backgroundColor: BRASS, borderRadius: 3 }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize,
              fontWeight: 700,
              lineHeight: 1.12,
              color: CONTENT,
              letterSpacing: -1.5,
            }}
          >
            {titleLines.map((line, i) => (
              <div key={i} style={{ display: "flex" }}>
                {line}
              </div>
            ))}
          </div>
          {card.subtitle && (
            <div
              style={{
                display: "flex",
                maxWidth: 880,
                fontSize: 26,
                lineHeight: 1.4,
                color: SECONDARY,
              }}
            >
              {card.subtitle}
            </div>
          )}
        </div>

        {/* Footer: stat chips left, domain right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            {card.stats?.map((stat) => (
              <div
                key={stat}
                style={{
                  display: "flex",
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: `1px solid ${LINE}`,
                  backgroundColor: SURFACE,
                  color: SECONDARY,
                  fontSize: 21,
                }}
              >
                {stat}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 21, color: TERTIARY }}>sys-craft-3vzz.vercel.app</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
