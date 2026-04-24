import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "src/utils/test-utils";
import React from "react";
import ObserveTabBar from "../ObserveTabBar";
import { ObserveHeaderContext } from "src/sections/project/context/ObserveHeaderContext";

const mockCreateSavedView = vi.fn();
vi.mock("src/api/project/saved-views", () => ({
  useGetSavedViews: () => ({ data: { customViews: [] } }),
  useCreateSavedView: () => ({ mutate: mockCreateSavedView }),
  useUpdateSavedView: () => ({ mutate: vi.fn() }),
  useDeleteSavedView: () => ({ mutate: vi.fn() }),
  useReorderSavedViews: () => ({ mutate: vi.fn() }),
}));

const renderWithCtx = (getViewConfig) =>
  render(
    <ObserveHeaderContext.Provider
      value={{
        headerConfig: {},
        setHeaderConfig: () => {},
        activeViewConfig: null,
        setActiveViewConfig: () => {},
        registerGetViewConfig: () => {},
        getViewConfig,
      }}
    >
      <ObserveTabBar
        projectId="p1"
        activeTab="traces"
        onTabChange={() => {}}
      />
    </ObserveHeaderContext.Provider>,
  );

const clickCreateViewButton = () => {
  const btn = document.querySelector("[data-create-view-btn]");
  if (!btn) throw new Error("data-create-view-btn not found");
  fireEvent.click(btn);
};

const typeAndSubmit = async (name) => {
  const input = await screen.findByRole("textbox");
  fireEvent.change(input, { target: { value: name } });
  const saveBtn = screen.getByRole("button", { name: /save|create/i });
  fireEvent.click(saveBtn);
};

describe("ObserveTabBar — Save View snapshots current filters", () => {
  beforeEach(() => mockCreateSavedView.mockReset());

  it("passes ctx.getViewConfig() output as config in createSavedView", async () => {
    const snapshot = {
      filters: [{ columnId: "status" }],
      display: { viewMode: "grid" },
    };
    renderWithCtx(() => snapshot);

    clickCreateViewButton();
    await typeAndSubmit("t1");

    await waitFor(() => expect(mockCreateSavedView).toHaveBeenCalled());
    const payload = mockCreateSavedView.mock.calls[0][0];
    expect(payload.config).toEqual(snapshot);
    expect(payload.tab_type).toBe("traces");
    expect(payload.name).toBe("t1");
    expect(payload.project_id).toBe("p1");
  });

  it("falls back to {} when getViewConfig returns null", async () => {
    renderWithCtx(() => null);

    clickCreateViewButton();
    await typeAndSubmit("t2");

    await waitFor(() => expect(mockCreateSavedView).toHaveBeenCalled());
    expect(mockCreateSavedView.mock.calls[0][0].config).toEqual({});
  });
});
