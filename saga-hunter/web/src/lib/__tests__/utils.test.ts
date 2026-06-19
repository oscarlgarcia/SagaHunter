import { describe, it, expect } from "vitest";
import { formatScore, scoreColor, statusColor, cn } from "../utils";

describe("formatScore", () => {
  it("returns -- for null", () => {
    expect(formatScore(null)).toBe("--");
  });

  it("formats score", () => {
    expect(formatScore(75)).toBe("75/100");
  });

  it("handles zero", () => {
    expect(formatScore(0)).toBe("0/100");
  });
});

describe("scoreColor", () => {
  it("returns gray for null", () => {
    expect(scoreColor(null)).toBe("text-gray-400");
  });

  it("returns green for high scores", () => {
    expect(scoreColor(80)).toBe("text-green-600");
    expect(scoreColor(100)).toBe("text-green-600");
  });

  it("returns yellow for medium scores", () => {
    expect(scoreColor(60)).toBe("text-yellow-600");
    expect(scoreColor(79)).toBe("text-yellow-600");
  });

  it("returns gray for low scores", () => {
    expect(scoreColor(0)).toBe("text-gray-500");
    expect(scoreColor(59)).toBe("text-gray-500");
  });
});

describe("statusColor", () => {
  it("returns blue for discovered", () => {
    expect(statusColor("discovered")).toBe("bg-blue-100 text-blue-800");
  });

  it("returns yellow for analyzing", () => {
    expect(statusColor("analyzing")).toBe("bg-yellow-100 text-yellow-800");
  });

  it("returns purple for analyzed", () => {
    expect(statusColor("analyzed")).toBe("bg-purple-100 text-purple-800");
  });

  it("returns green for developing", () => {
    expect(statusColor("developing")).toBe("bg-green-100 text-green-800");
  });

  it("returns dark for published", () => {
    expect(statusColor("published")).toBe("bg-gray-800 text-white");
  });

  it("returns gray default for unknown", () => {
    expect(statusColor("unknown")).toBe("bg-gray-100 text-gray-800");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden")).toBe("base");
  });

  it("merges tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
