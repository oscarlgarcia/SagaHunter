import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    feed: {
      findMany: mockFindMany,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
  })),
}));

function createRequest(url: string, init?: RequestInit) {
  return new Request(url, init) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/feeds", async () => {
  const { GET } = await import("../feeds/route");

  it("returns feeds ordered by name", async () => {
    mockFindMany.mockResolvedValue([{ id: "1", name: "BBC" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } });
  });
});

describe("POST /api/feeds", async () => {
  const { POST } = await import("../feeds/route");

  it("creates a new feed", async () => {
    const feedData = { name: "Test Feed", url: "http://test.com/rss", sourceType: "news", language: "en" };
    mockCreate.mockResolvedValue({ id: "1", ...feedData });
    const req = createRequest("http://localhost:3000/api/feeds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedData),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Test Feed");
  });
});

describe("PATCH /api/feeds/[id]", async () => {
  const { PATCH } = await import("../feeds/[id]/route");

  it("updates a feed", async () => {
    mockUpdate.mockResolvedValue({ id: "1", enabled: false });
    const req = createRequest("http://localhost:3000/api/feeds/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    });
    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.enabled).toBe(false);
  });
});

describe("DELETE /api/feeds/[id]", async () => {
  const { DELETE } = await import("../feeds/[id]/route");

  it("deletes a feed", async () => {
    mockDelete.mockResolvedValue({ id: "1" });
    const req = createRequest("http://localhost:3000/api/feeds/1", { method: "DELETE" });
    const res = await DELETE(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
