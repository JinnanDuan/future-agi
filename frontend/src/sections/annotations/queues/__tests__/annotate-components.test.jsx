/**
 * Phase 2B-3C – Annotation workspace component tests.
 * Tests: LabelInput, AnnotateHeader, AnnotateFooter, AnnotationHistory
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent, waitFor } from "src/utils/test-utils";
import LabelInput from "../annotate/label-input";
import AnnotateHeader from "../annotate/annotate-header";
import AnnotateFooter from "../annotate/annotate-footer";
import AnnotationHistory from "../annotate/annotation-history";

vi.mock("src/components/iconify", () => ({
  default: ({ icon, ...props }) => (
    <span data-testid="iconify" data-icon={icon} {...props} />
  ),
}));

vi.mock("src/utils/format-time", () => ({
  fDateTime: () => "Jan 1, 2025 12:00",
}));

// Mock API hook for annotation history
vi.mock("src/api/annotation-queues/annotation-queues", () => ({
  useItemAnnotations: vi.fn(() => ({ data: [] })),
}));

// ---------------------------------------------------------------------------
// LabelInput
// ---------------------------------------------------------------------------
describe("LabelInput", () => {
  it("renders label name", () => {
    render(
      <LabelInput
        label={{ name: "Quality", type: "star", settings: { no_of_stars: 5 } }}
        value={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Quality")).toBeInTheDocument();
  });

  it("shows required indicator", () => {
    render(
      <LabelInput
        label={{ name: "Test", type: "text", settings: {}, required: true }}
        value={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows description when provided", () => {
    render(
      <LabelInput
        label={{
          name: "Test",
          type: "text",
          settings: {},
          description: "Help text",
        }}
        value={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("Help text")).toBeInTheDocument();
  });

  describe("star type", () => {
    it("renders star icons for each star", () => {
      render(
        <LabelInput
          label={{ name: "Stars", type: "star", settings: { no_of_stars: 5 } }}
          value={{ rating: 3 }}
          onChange={() => {}}
        />,
      );
      // Custom StarInput renders Iconify star icons
      const starIcons = screen
        .getAllByTestId("iconify")
        .filter(
          (el) =>
            el.getAttribute("data-icon") === "solar:star-bold" ||
            el.getAttribute("data-icon") === "solar:star-line-duotone",
        );
      expect(starIcons).toHaveLength(5);
    });
  });

  describe("categorical type (single)", () => {
    it("renders radio options", () => {
      render(
        <LabelInput
          label={{
            name: "Cat",
            type: "categorical",
            settings: { options: ["Good", "Bad"], multi_choice: false },
          }}
          value={{ selected: [] }}
          onChange={() => {}}
        />,
      );
      expect(screen.getByText("Good")).toBeInTheDocument();
      expect(screen.getByText("Bad")).toBeInTheDocument();
    });
  });

  describe("numeric type", () => {
    it("renders slider and text input", () => {
      render(
        <LabelInput
          label={{
            name: "Score",
            type: "numeric",
            settings: { min: 0, max: 10, step: 1 },
          }}
          value={{ value: 5 }}
          onChange={() => {}}
        />,
      );
      // MUI Slider has role slider
      expect(screen.getByRole("slider")).toBeInTheDocument();
      expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    });
  });

  describe("text type", () => {
    it("renders textarea", () => {
      render(
        <LabelInput
          label={{
            name: "Comment",
            type: "text",
            settings: { placeholder: "Write here...", max_length: 500 },
          }}
          value={{ text: "" }}
          onChange={() => {}}
        />,
      );
      expect(screen.getByPlaceholderText("Write here...")).toBeInTheDocument();
    });

    it("calls onChange on text input (debounced)", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <LabelInput
          label={{
            name: "Comment",
            type: "text",
            settings: { placeholder: "Enter text..." },
          }}
          value={{ text: "" }}
          onChange={onChange}
        />,
      );
      await user.type(screen.getByPlaceholderText("Enter text..."), "A");
      // DebouncedTextInput fires onChange after 300ms debounce
      await waitFor(
        () => {
          expect(onChange).toHaveBeenCalledWith({ text: "A" });
        },
        { timeout: 1000 },
      );
    });
  });

  describe("thumbs_up_down type", () => {
    it("renders Yes and No labels", () => {
      render(
        <LabelInput
          label={{ name: "Vote", type: "thumbs_up_down", settings: {} }}
          value={{}}
          onChange={() => {}}
        />,
      );
      expect(screen.getByText("Yes")).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
    });

    it("calls onChange with 'up' when Yes clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <LabelInput
          label={{ name: "Vote", type: "thumbs_up_down", settings: {} }}
          value={{}}
          onChange={onChange}
        />,
      );
      await user.click(screen.getByText("Yes"));
      expect(onChange).toHaveBeenCalledWith({ value: "up" });
    });
  });
});

// ---------------------------------------------------------------------------
// AnnotateHeader
// ---------------------------------------------------------------------------
describe("AnnotateHeader", () => {
  it("renders queue name", () => {
    render(
      <AnnotateHeader
        queueName="My Queue"
        progress={{ total: 10, completed: 3 }}
        onBack={() => {}}
        onSkip={() => {}}
        isSkipping={false}
      />,
    );
    expect(screen.getByText("My Queue")).toBeInTheDocument();
  });

  it("renders progress", () => {
    render(
      <AnnotateHeader
        queueName="Q"
        progress={{ total: 10, completed: 3 }}
        onBack={() => {}}
        onSkip={() => {}}
        isSkipping={false}
      />,
    );
    expect(screen.getByText("3/10 (30%)")).toBeInTheDocument();
  });

  it("renders Skip button", () => {
    render(
      <AnnotateHeader
        queueName="Q"
        progress={{}}
        onBack={() => {}}
        onSkip={() => {}}
        isSkipping={false}
      />,
    );
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("calls onSkip when Skip button clicked", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(
      <AnnotateHeader
        queueName="Q"
        progress={{}}
        onBack={() => {}}
        onSkip={onSkip}
        isSkipping={false}
      />,
    );
    await user.click(screen.getByRole("button", { name: /skip/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("disables Skip when isSkipping", () => {
    render(
      <AnnotateHeader
        queueName="Q"
        progress={{}}
        onBack={() => {}}
        onSkip={() => {}}
        isSkipping={true}
      />,
    );
    expect(screen.getByRole("button", { name: /skip/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// AnnotateFooter
// ---------------------------------------------------------------------------
describe("AnnotateFooter", () => {
  it("renders position indicator", () => {
    render(
      <AnnotateFooter
        currentPosition={3}
        total={10}
        onPrev={() => {}}
        onNext={() => {}}
        hasPrev={true}
        hasNext={true}
      />,
    );
    expect(screen.getByText("Item 3 of 10")).toBeInTheDocument();
  });

  it("renders Previous and Next buttons", () => {
    render(
      <AnnotateFooter
        currentPosition={1}
        total={5}
        onPrev={() => {}}
        onNext={() => {}}
        hasPrev={false}
        hasNext={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: /previous/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("disables Previous when hasPrev=false", () => {
    render(
      <AnnotateFooter
        currentPosition={1}
        total={5}
        onPrev={() => {}}
        onNext={() => {}}
        hasPrev={false}
        hasNext={true}
      />,
    );
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  it("disables Next when hasNext=false", () => {
    render(
      <AnnotateFooter
        currentPosition={5}
        total={5}
        onPrev={() => {}}
        onNext={() => {}}
        hasPrev={true}
        hasNext={false}
      />,
    );
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("calls onPrev and onNext on click", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <AnnotateFooter
        currentPosition={3}
        total={5}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev={true}
        hasNext={true}
      />,
    );
    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPrev).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onNext).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// AnnotationHistory
// ---------------------------------------------------------------------------
describe("AnnotationHistory", () => {
  it("returns null when itemId is falsy", () => {
    const { container } = render(
      <AnnotationHistory queueId="q-1" itemId={null} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders collapsed by default with annotation count", () => {
    render(<AnnotationHistory queueId="q-1" itemId="item-1" />);
    expect(screen.getByText(/ANNOTATION HISTORY/)).toBeInTheDocument();
  });

  it("shows 'No annotations yet' when expanded with no data", async () => {
    const user = userEvent.setup();
    render(<AnnotationHistory queueId="q-1" itemId="item-1" />);

    await user.click(screen.getByText(/ANNOTATION HISTORY/));
    expect(screen.getByText("No annotations yet")).toBeInTheDocument();
  });
});
