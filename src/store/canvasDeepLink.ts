import { SEED_RESOURCES } from "@/data/seedResources";
import { getCustomResource } from "@/store/customResourceRegistry";

/**
 * Wiki → canvas deep link.
 *
 * The primitives library advertises a "Drag onto canvas" action. That promise
 * used to be a plain navigation to /canvas, so the reader landed on an empty
 * grid with the primitive they just read about nowhere in sight. The link now
 * carries the primitive ids (`/canvas?add=postgres_db`) and the canvas drops
 * them on arrival.
 *
 * This module owns the parsing + validation rules so both the link builder
 * and the canvas dropper agree on exactly what a valid request looks like.
 */

export const CANVAS_ADD_PARAM = "add";

const KNOWN_RESOURCE_IDS = new Set(SEED_RESOURCES.map((resource) => resource.id));

/** A resource id is droppable when it is a seeded primitive or a custom one. */
export function isDroppableResource(resourceId: string): boolean {
  if (KNOWN_RESOURCE_IDS.has(resourceId)) return true;
  return getCustomResource(resourceId) != null;
}

/**
 * Parse `?add=` into a de-duplicated list of known primitive ids.
 * Unknown ids are dropped (never crash the canvas) and order is preserved.
 */
export function parseCanvasAddParam(search: string): string[] {
  if (!search) return [];
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return [];
  }
  const raw = params.get(CANVAS_ADD_PARAM);
  if (!raw) return [];

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const piece of raw.split(",")) {
    const id = piece.trim();
    if (!id || id.length > 64 || seen.has(id)) continue;
    if (!isDroppableResource(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/** Build the canvas URL that drops the given primitives on arrival. */
export function canvasHrefWithAdd(resourceIds: string[], extra?: { pathname?: string; search?: string }) {
  const pathname = extra?.pathname ?? "/canvas";
  const params = new URLSearchParams(extra?.search ?? "");
  const valid = resourceIds.filter((id) => isDroppableResource(id));
  if (valid.length > 0) params.set(CANVAS_ADD_PARAM, valid.join(","));
  const query = params.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}
