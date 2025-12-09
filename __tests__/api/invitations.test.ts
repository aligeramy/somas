import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/invitations/route";
import { prisma } from "@/lib/prisma/client";

// Mock dependencies
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: "test-user-id", email: "owner@test.com" } },
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
          email: "owner@test.com",
          role: "owner",
          gymId: "test-gym-id",
          gym: {
            id: "test-gym-id",
            name: "Test Gym",
          },
        }),
      ),
    },
    invitation: {
      create: vi.fn(() =>
        Promise.resolve({
          id: "test-invitation-id",
          email: "test@example.com",
          token: "test-token",
        }),
      ),
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
  },
}));

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: vi.fn(() => Promise.resolve({ id: "test-email-id" })),
      };
      constructor(apiKey: string) {}
    },
  };
});

describe("Invitations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate required fields", async () => {
    const request = new Request("http://localhost/api/invitations", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Emails array is required");
  });

  it("should validate role", async () => {
    const request = new Request("http://localhost/api/invitations", {
      method: "POST",
      body: JSON.stringify({
        emails: ["test@example.com"],
        role: "invalid-role",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Valid role");
  });
});

