import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    enrichment: {
      findMany: mockFindMany,
    },
  })),
}));

function createRequest(url: string) {
  return new Request(url) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/enrichments", async () => {
  const { GET } = await import("../enrichments/route");

  it("returns 400 when seedId is missing", async () => {
    const req = createRequest("http://localhost:3000/api/enrichments");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("seedId query parameter is required");
  });

  it("returns enrichments for a given seedId", async () => {
    mockFindMany.mockResolvedValue([
      { id: "e1", seedId: "s1", agentName: "angle_finder", data: { genre: "mystery" }, createdAt: new Date().toISOString() },
    ]);
    const req = createRequest("http://localhost:3000/api/enrichments?seedId=s1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].agentName).toBe("angle_finder");
  });

  it("returns empty array when seed has no enrichments", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = createRequest("http://localhost:3000/api/enrichments?seedId=s1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});
