import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "@/app/api/events/route";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: "test-user-id", email: "coach@test.com" } },
      })),
    },
  })),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(() =>
        Promise.resolve({
          id: "test-user-id",
          email: "coach@test.com",
          role: "coach",
          gymId: "test-gym-id",
          gym: {
            id: "test-gym-id",
            name: "Test Gym",
          },
        }),
      ),
    },
    event: {
      create: vi.fn(() =>
        Promise.resolve({
          id: "test-event-id",
          title: "Test Event",
          gymId: "test-gym-id",
        }),
      ),
      findMany: vi.fn(() => Promise.resolve([])),
    },
    eventOccurrence: {
      createMany: vi.fn(() => Promise.resolve({ count: 5 })),
    },
  },
}));

describe("Events API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate required fields", async () => {
    const request = new Request("http://localhost/api/events", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("should require title, startTime, and endTime", async () => {
    const request = new Request("http://localhost/api/events", {
      method: "POST",
      body: JSON.stringify({
        title: "Test Event",
        // Missing startTime and endTime
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("required");
  });
});

