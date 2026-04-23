import { describe, it, expect, vi } from "vitest";
import { render, screen } from "src/utils/test-utils";
import ViewConfigModal from "../ViewConfigModal";

// Mock the API hooks
vi.mock("src/api/project/saved-views", () => ({
  useCreateSavedView: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateSavedView: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("ViewConfigModal", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    mode: "create",
    projectId: "test-project-id",
  };

  it("renders Create New View title in create mode", () => {
    render(<ViewConfigModal {...defaultProps} />);
    expect(screen.getByText("Create New View")).toBeInTheDocument();
  });

  it("renders Edit View title in edit mode", () => {
    render(
      <ViewConfigModal
        {...defaultProps}
        mode="edit"
        initialValues={{ id: "123", name: "Test", tab_type: "traces" }}
      />,
    );
    expect(screen.getByText("Edit View")).toBeInTheDocument();
  });

  it("renders name input field", () => {
    render(<ViewConfigModal {...defaultProps} />);
    expect(screen.getByLabelText("Name *")).toBeInTheDocument();
  });

  it("renders type selector", () => {
    render(<ViewConfigModal {...defaultProps} />);
    // MUI Select renders as a combobox role
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("renders visibility radio buttons", () => {
    render(<ViewConfigModal {...defaultProps} />);
    expect(screen.getByLabelText("Personal")).toBeInTheDocument();
    expect(screen.getByLabelText("Shared with team")).toBeInTheDocument();
  });

  it("renders Cancel and Create buttons", () => {
    render(<ViewConfigModal {...defaultProps} />);
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<ViewConfigModal {...defaultProps} open={false} />);
    expect(screen.queryByText("Create New View")).not.toBeInTheDocument();
  });
});
