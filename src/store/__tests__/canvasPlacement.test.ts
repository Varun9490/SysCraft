import { describe, expect, it } from "vitest";
import { PLACEMENT_GAP_PX, resolveFreePosition } from "@/store/useCanvasStore";
import { NODE_DEFAULT_WIDTH, NODE_TIER_HEIGHTS } from "@/types/resource";

const W = NODE_DEFAULT_WIDTH;
const H = NODE_TIER_HEIGHTS[2];

function overlaps(
  a: { x: number; y: number },
  b: { x: number; y: number },
  width = W,
  height = H,
): boolean {
  return a.x < b.x + width && a.x + width > b.x && a.y < b.y + height && a.y + height > b.y;
}

describe("resolveFreePosition", () => {
  it("keeps the requested position on an empty canvas", () => {
    const desired = { x: 240, y: 160 };
    expect(resolveFreePosition([], desired)).toEqual(desired);
  });

  it("nudges a second block off the first instead of stacking them", () => {
    const first = { position: { x: 240, y: 160 } };
    const placed = resolveFreePosition([first], { x: 240, y: 160 });
    expect(placed).not.toEqual(first.position);
    expect(overlaps(placed, first.position)).toBe(false);
  });

  it("never overlaps across a burst of adds from the same palette click point", () => {
    const placed: Array<{ position: { x: number; y: number } }> = [];
    for (let index = 0; index < 20; index += 1) {
      const next = resolveFreePosition(placed, { x: 120, y: 120 });
      for (const existing of placed) {
        expect(overlaps(next, existing.position)).toBe(false);
      }
      placed.push({ position: next });
    }
    expect(new Set(placed.map((node) => `${node.position.x},${node.position.y}`)).size).toBe(placed.length);
  });

  it("honours the requested block size when checking collisions", () => {
    const wide = { position: { x: 0, y: 0 } };
    const placed = resolveFreePosition([wide], { x: 0, y: 0 }, { width: 296, height: 148 });
    expect(overlaps(placed, wide.position, 296, 148)).toBe(false);
    // The gap guard means neighbours never touch either.
    const edgeToEdge = Math.abs(placed.x - wide.position.x) - W;
    expect(edgeToEdge).toBeGreaterThanOrEqual(PLACEMENT_GAP_PX);
  });
});
