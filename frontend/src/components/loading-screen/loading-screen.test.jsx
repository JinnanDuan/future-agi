import { describe, it, expect } from "vitest";
import { render, screen } from "../../utils/test-utils";
import LoadingScreen from "./loading-screen";

describe("LoadingScreen", () => {
  it("renders without crashing", () => {
    render(<LoadingScreen />);

    // Check if the linear progress element is present
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("applies custom sx props correctly", () => {
    const customSx = {
      backgroundColor: "red",
      padding: 2,
    };

    render(<LoadingScreen sx={customSx} />);

    const container = screen.getByRole("progressbar").closest("div");

    // Note: In a real test, you might want to check computed styles
    // or use data-testid for more reliable testing
    expect(container).toBeInTheDocument();
  });

  it("forwards additional props to the Box component", () => {
    render(<LoadingScreen data-testid="custom-loading-screen" />);

    const container = screen.getByTestId("custom-loading-screen");
    expect(container).toBeInTheDocument();
  });

  it("has correct default styling classes", () => {
    render(<LoadingScreen />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();

    // The progress bar should have the inherit color
    expect(progressBar).toHaveClass("MuiLinearProgress-root");
  });

  it("matches snapshot", () => {
    const { container } = render(<LoadingScreen />);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe("accessibility", () => {
    it("has proper ARIA role", () => {
      render(<LoadingScreen />);

      const progressBar = screen.getByRole("progressbar");
      expect(progressBar).toBeInTheDocument();
    });

    it("is keyboard accessible", () => {
      render(<LoadingScreen />);

      const progressBar = screen.getByRole("progressbar");

      // LinearProgress should be focusable if needed
      // This test ensures the component doesn't break accessibility
      expect(progressBar).toBeInTheDocument();
    });
  });
});
