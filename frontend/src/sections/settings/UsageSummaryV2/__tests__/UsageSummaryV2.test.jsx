import { describe, it, expect, vi } from "vitest";

vi.mock("src/utils/axios", () => ({
  default: { get: vi.fn() },
  endpoints: {
    settings: {
      v2: {
        usageOverview: "/usage/v2/usage-overview/",
        usageTimeSeries: "/usage/v2/usage-time-series/",
        usageWorkspaceBreakdown: "/usage/v2/usage-workspace-breakdown/",
        notifications: "/usage/v2/notifications/",
      },
    },
  },
}));

vi.mock("src/utils/format-number", () => ({
  fCurrency: (val) => `$${Number(val || 0).toFixed(2)}`,
}));

vi.mock("react-apexcharts", () => ({
  default: () => null,
}));

describe("UsageSummaryV2", () => {
  it("should be importable", async () => {
    const module = await import("../UsageSummaryV2");
    expect(module.default).toBeDefined();
  });
});

describe("WorkspaceBreakdown", () => {
  it("should be importable", async () => {
    const module = await import("../WorkspaceBreakdown");
    expect(module.default).toBeDefined();
  });
});
