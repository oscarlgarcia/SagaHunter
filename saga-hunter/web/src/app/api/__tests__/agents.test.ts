import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    agentConfig: {
      findMany: mockFindMany,
      update: mockUpdate,
    },
  })),
}));

function createRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/agents", async () => {
  const { GET } = await import("../agents/route");

  it("returns agents ordered by name", async () => {
    mockFindMany.mockResolvedValue([{ agentName: "news_aggregator", enabled: true }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { agentName: "asc" } });
  });
});

describe("PATCH /api/agents", async () => {
  const { PATCH } = await import("../agents/route");

  it("toggles agent enabled", async () => {
    mockUpdate.mockResolvedValue({ agentName: "news_aggregator", enabled: false });
    const req = createRequest("http://localhost:3000/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName: "news_aggregator", enabled: false }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enabled).toBe(false);
  });
});
