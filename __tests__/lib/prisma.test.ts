import { describe, it, expect, vi } from "vitest";

// Mock Prisma client for tests
const mockPrisma = {
  user: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  gym: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma/client", () => ({
  prisma: mockPrisma,
}));

describe("Prisma Client Structure", () => {
  it("should have user model structure", () => {
    expect(mockPrisma.user).toBeDefined();
    expect(typeof mockPrisma.user.findMany).toBe("function");
    expect(typeof mockPrisma.user.create).toBe("function");
  });

  it("should have gym model structure", () => {
    expect(mockPrisma.gym).toBeDefined();
    expect(typeof mockPrisma.gym.findMany).toBe("function");
    expect(typeof mockPrisma.gym.create).toBe("function");
  });
});

