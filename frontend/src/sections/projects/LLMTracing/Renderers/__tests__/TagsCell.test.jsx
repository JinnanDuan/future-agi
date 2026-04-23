import { describe, it, expect } from "vitest";
import { render, screen } from "src/utils/test-utils";
import TagsCell from "../TagsCell";

describe("TagsCell", () => {
  it("renders tag chips for an array of strings", () => {
    render(<TagsCell value={["production", "v2"]} />);
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  it("shows overflow count for more than 2 tags", () => {
    render(<TagsCell value={["a", "b", "c", "d"]} />);
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.queryByText("c")).not.toBeInTheDocument();
  });

  it("renders nothing for empty array", () => {
    const { container } = render(<TagsCell value={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for null value", () => {
    const { container } = render(<TagsCell value={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for undefined value", () => {
    const { container } = render(<TagsCell value={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders single tag without overflow", () => {
    render(<TagsCell value={["solo"]} />);
    expect(screen.getByText("solo")).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });
});
