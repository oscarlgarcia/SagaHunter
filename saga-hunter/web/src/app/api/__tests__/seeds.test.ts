import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    seed: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
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

describe("GET /api/seeds", async () => {
  const { GET } = await import("../seeds/route");

  it("returns all seeds without filters", async () => {
    mockFindMany.mockResolvedValue([{ id: "1", title: "Seed 1" }]);
    const req = createRequest("http://localhost:3000/api/seeds");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("Seed 1");
  });

  it("filters by sourceType", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = createRequest("http://localhost:3000/api/seeds?sourceType=news");
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sourceType: "news" }),
      })
    );
  });

  it("filters by status", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = createRequest("http://localhost:3000/api/seeds?status=discovered");
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "discovered" }),
      })
    );
  });

  it("sorts by score", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = createRequest("http://localhost:3000/api/seeds?sortBy=score");
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { narrativeScore: { sort: "desc", nulls: "last" } },
      })
    );
  });

  it("searches by title", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = createRequest("http://localhost:3000/api/seeds?search=mystery");
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { title: { contains: "mystery", mode: "insensitive" } },
            { rawText: { contains: "mystery", mode: "insensitive" } },
          ],
        }),
      })
    );
  });
});

describe("GET /api/seeds/[id]", async () => {
  const { GET } = await import("../seeds/[id]/route");

  it("returns seed by id with enrichments", async () => {
    mockFindUnique.mockResolvedValue({ id: "1", title: "Test", enrichments: [], story: null });
    const req = createRequest("http://localhost:3000/api/seeds/1");
    const res = await GET(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Test");
  });

  it("returns 404 when seed not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost:3000/api/seeds/999");
    const res = await GET(req, { params: { id: "999" } });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/seeds/[id]", async () => {
  const { PATCH } = await import("../seeds/[id]/route");

  it("updates seed status", async () => {
    mockUpdate.mockResolvedValue({ id: "1", status: "developing" });
    const req = createRequest("http://localhost:3000/api/seeds/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "developing" }),
    });
    const res = await PATCH(req, { params: { id: "1" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("developing");
  });
});
