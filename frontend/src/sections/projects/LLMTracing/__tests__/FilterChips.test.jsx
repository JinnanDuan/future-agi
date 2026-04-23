import { describe, it, expect, vi } from "vitest";
import { render, screen } from "src/utils/test-utils";
import FilterChips from "../FilterChips";

// FilterChips uses snake_case extraFilters and splits each chip into three
// <Typography> elements (field / op / value), so we query by function matchers.
const textMatcher = (expected) => (content, node) => {
  // Concatenate the full text of the element and all descendants.
  const hasText = (el) => el?.textContent === expected;
  const elementMatches = hasText(node);
  const childrenDontMatch = Array.from(node?.children || []).every(
    (child) => !hasText(child),
  );
  return elementMatches && childrenDontMatch;
};

describe("FilterChips", () => {
  it("renders nothing when no filters are active", () => {
    const { container } = render(
      <FilterChips
        extraFilters={[]}
        onRemoveFilter={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a chip for an active filter", () => {
    render(
      <FilterChips
        extraFilters={[
          {
            column_id: "latency",
            filter_config: { filter_op: "more_than", filter_value: 7 },
          },
        ]}
        onRemoveFilter={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByText("Latency")).toBeInTheDocument();
    expect(screen.getByText(">")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders multiple chips for multiple filters", () => {
    render(
      <FilterChips
        extraFilters={[
          {
            column_id: "latency",
            filter_config: { filter_op: "more_than", filter_value: 7 },
          },
          {
            column_id: "status",
            filter_config: { filter_op: "equals", filter_value: "ERROR" },
          },
        ]}
        onRemoveFilter={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByText("Latency")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("ERROR")).toBeInTheDocument();
  });

  it("shows a Clear button when chips are present", () => {
    render(
      <FilterChips
        extraFilters={[
          {
            column_id: "latency",
            filter_config: { filter_op: "more_than", filter_value: 7 },
          },
        ]}
        onRemoveFilter={vi.fn()}
        onClearAll={vi.fn()}
      />,
    );
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("calls onClearAll when Clear is clicked", () => {
    const onClearAll = vi.fn();
    render(
      <FilterChips
        extraFilters={[
          {
            column_id: "latency",
            filter_config: { filter_op: "more_than", filter_value: 7 },
          },
        ]}
        onRemoveFilter={vi.fn()}
        onClearAll={onClearAll}
      />,
    );
    screen.getByText("Clear").click();
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  describe("UUID column_id fallback", () => {
    const UUID = "f701b069-6224-46e8-900f-60cc5af4dd20";

    it("uses display_name when provided, even for UUID column_ids", () => {
      render(
        <FilterChips
          extraFilters={[
            {
              column_id: UUID,
              display_name: "Phone Number",
              filter_config: { filter_op: "equals", filter_value: "1234" },
            },
          ]}
          onRemoveFilter={vi.fn()}
          onClearAll={vi.fn()}
        />,
      );
      expect(screen.getByText("Phone Number")).toBeInTheDocument();
      // The mangled _.startCase form must NOT appear.
      expect(
        screen.queryByText(/F 701 B 069 6224 46 E 8/),
      ).not.toBeInTheDocument();
    });

    it("falls back to a distinguishable short-id label for UUIDs without display_name", () => {
      render(
        <FilterChips
          extraFilters={[
            {
              column_id: UUID,
              filter_config: { filter_op: "equals", filter_value: "1234" },
            },
          ]}
          onRemoveFilter={vi.fn()}
          onClearAll={vi.fn()}
        />,
      );
      // Short-id label is unambiguous (different UUIDs → different labels).
      expect(screen.getByText("Column f701b069")).toBeInTheDocument();
      // The mangled _.startCase form must NOT appear.
      expect(
        screen.queryByText(/F 701 B 069 6224 46 E 8/),
      ).not.toBeInTheDocument();
    });

    it("renders distinct labels for two different UUID filters without display_name", () => {
      const UUID_A = "aaaaaaaa-1111-2222-3333-444444444444";
      const UUID_B = "bbbbbbbb-5555-6666-7777-888888888888";
      render(
        <FilterChips
          extraFilters={[
            {
              column_id: UUID_A,
              filter_config: { filter_op: "equals", filter_value: "x" },
            },
            {
              column_id: UUID_B,
              filter_config: { filter_op: "equals", filter_value: "y" },
            },
          ]}
          onRemoveFilter={vi.fn()}
          onClearAll={vi.fn()}
        />,
      );
      expect(screen.getByText("Column aaaaaaaa")).toBeInTheDocument();
      expect(screen.getByText("Column bbbbbbbb")).toBeInTheDocument();
    });

    it("keeps snake_case start-case pretty-print for non-UUID column_ids", () => {
      render(
        <FilterChips
          extraFilters={[
            {
              column_id: "total_cost",
              filter_config: { filter_op: "equals", filter_value: 5 },
            },
          ]}
          onRemoveFilter={vi.fn()}
          onClearAll={vi.fn()}
        />,
      );
      expect(screen.getByText("Total Cost")).toBeInTheDocument();
    });
  });
});
