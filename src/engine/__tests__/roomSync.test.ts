import { describe, expect, it } from "vitest";
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  colorForName,
  generateRoomCode,
  isValidRoomCode,
  loadRoomConfig,
  normalizeRoomCode,
} from "@/engine/roomSync";

describe("roomSync helpers", () => {
  it("normalizes casing, spaces, and dashes", () => {
    expect(normalizeRoomCode(" ab-cd ef ")).toBe("ABCDEF");
  });

  it("validates only 6-char codes from the safe alphabet", () => {
    expect(isValidRoomCode("ABCDEF")).toBe(true);
    expect(isValidRoomCode("ABCDE")).toBe(false);
    expect(isValidRoomCode("ABCDEFG")).toBe(false);
    expect(isValidRoomCode("ABCDEI")).toBe(false); // I is not in the alphabet
    expect(isValidRoomCode("ABCDE1")).toBe(false); // 1 is not in the alphabet
  });

  it("generates valid, alphabet-only codes", () => {
    for (let i = 0; i < 25; i += 1) {
      const code = generateRoomCode();
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(isValidRoomCode(code)).toBe(true);
      for (const char of code) {
        expect(ROOM_CODE_ALPHABET.includes(char)).toBe(true);
      }
    }
  });

  it("derives a stable color per name", () => {
    expect(colorForName("Ada")).toBe(colorForName(" ada "));
    expect(colorForName("Ada")).toMatch(/^hsl\(\d+ 70% 62%\)$/);
    expect(colorForName("Grace")).not.toBe(colorForName("Ada"));
  });

  it("no-ops outside the browser", () => {
    expect(loadRoomConfig()).toBeNull();
  });
});
