import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mock before vi.mock calls
const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        findUnique: vi.fn(),
      },
      rSVP: {
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
      eventOccurrence: {
        findUnique: vi.fn(),
      },
    },
  };
});

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: "test-athlete-id", email: "athlete@test.com" } },
      })),
    },
  })),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: mockPrisma,
}));

import { POST, GET } from "@/app/api/rsvp/route";

describe("RSVP API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "test-athlete-id",
      email: "athlete@test.com",
      role: "athlete",
    });
  });

  it("should require authentication", async () => {
    // Mock unauthenticated user
    const { createClient } = await import("@/lib/supabase/server");
    const mockGetUser = vi.fn(() => ({
      data: { user: null },
    }));
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: mockGetUser,
      },
    } as any);

    const request = new Request("http://localhost/api/rsvp", {
      method: "POST",
      body: JSON.stringify({
        occurrenceId: "test-occurrence-id",
        status: "going",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    
    // Reset mock
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn(() => ({
          data: { user: { id: "test-athlete-id", email: "athlete@test.com" } },
        })),
      },
    } as any);
  });

  it("should validate occurrence ID", async () => {
    const request = new Request("http://localhost/api/rsvp", {
      method: "POST",
      body: JSON.stringify({
        // Missing occurrenceId
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Occurrence ID is required");
  });

  it("should only allow athletes to RSVP", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "test-coach-id",
      email: "coach@test.com",
      role: "coach",
    });

    const request = new Request("http://localhost/api/rsvp", {
      method: "POST",
      body: JSON.stringify({
        occurrenceId: "test-occurrence-id",
        status: "going",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain("Only athletes can RSVP");
  });

  it("should create RSVP for valid occurrence", async () => {
    mockPrisma.eventOccurrence.findUnique.mockResolvedValue({
      id: "test-occurrence-id",
      date: new Date(Date.now() + 86400000), // Tomorrow
      status: "scheduled",
      event: {
        id: "test-event-id",
        title: "Test Event",
      },
    });

    mockPrisma.rSVP.upsert.mockResolvedValue({
      id: "test-rsvp-id",
      userId: "test-athlete-id",
      occurrenceId: "test-occurrence-id",
      status: "going",
    });

    const request = new Request("http://localhost/api/rsvp", {
      method: "POST",
      body: JSON.stringify({
        occurrenceId: "test-occurrence-id",
        status: "going",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.rsvp).toBeDefined();
  });
});

