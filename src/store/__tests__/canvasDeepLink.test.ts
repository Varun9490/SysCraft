import { describe, expect, it } from "vitest";
import { canvasHrefWithAdd, isDroppableResource, parseCanvasAddParam } from "../canvasDeepLink";

describe("parseCanvasAddParam", () => {
  it("reads a single primitive id", () => {
    expect(parseCanvasAddParam("?add=postgres_db")).toEqual(["postgres_db"]);
  });

  it("reads a comma separated list and preserves order", () => {
    expect(parseCanvasAddParam("?add=postgres_db,redis_cache,api_gateway")).toEqual([
      "postgres_db",
      "redis_cache",
      "api_gateway",
    ]);
  });

  it("accepts a search string without the leading question mark", () => {
    expect(parseCanvasAddParam("add=postgres_db")).toEqual(["postgres_db"]);
  });

  it("drops unknown ids, duplicates and empty entries", () => {
    expect(parseCanvasAddParam("?add=postgres_db,postgres_db,,not_a_primitive")).toEqual([
      "postgres_db",
    ]);
  });

  it("returns nothing when the param is missing or the input is junk", () => {
    expect(parseCanvasAddParam("")).toEqual([]);
    expect(parseCanvasAddParam("?other=1")).toEqual([]);
    expect(parseCanvasAddParam("?add=")).toEqual([]);
  });
});

describe("isDroppableResource", () => {
  it("accepts seeded primitives and rejects unknown ids", () => {
    expect(isDroppableResource("postgres_db")).toBe(true);
    expect(isDroppableResource("definitely_not_a_block")).toBe(false);
  });
});

describe("canvasHrefWithAdd", () => {
  it("builds a canvas link carrying the primitive", () => {
    expect(canvasHrefWithAdd(["postgres_db"])).toBe("/canvas?add=postgres_db");
  });

  it("keeps extra query params and appends the add param", () => {
    expect(canvasHrefWithAdd(["postgres_db"], { search: "from=wiki" })).toBe(
      "/canvas?from=wiki&add=postgres_db",
    );
  });

  it("returns a plain canvas link when nothing valid was requested", () => {
    expect(canvasHrefWithAdd(["nope"])).toBe("/canvas");
    expect(canvasHrefWithAdd([])).toBe("/canvas");
  });
});
