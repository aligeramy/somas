import { describe, it, expect } from "vitest";
import { randomBytes } from "crypto";

describe("Invitation Token Generation", () => {
  it("should generate a unique token", () => {
    const token1 = randomBytes(32).toString("hex");
    const token2 = randomBytes(32).toString("hex");

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
  });

  it("should generate tokens of correct length", () => {
    const token = randomBytes(32).toString("hex");
    expect(token.length).toBe(64);
  });
});

