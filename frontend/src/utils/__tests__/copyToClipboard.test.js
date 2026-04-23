import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard } from "../utils";
import { logger } from "../logger";

describe("copyToClipboard", () => {
  let writeTextMock;
  let loggerErrorSpy;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });
    // Silence expected error logging from the "does not throw" path so it
    // doesn't pollute test output.
    loggerErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it("copies a string as-is", async () => {
    await copyToClipboard("hello");
    expect(writeTextMock).toHaveBeenCalledWith("hello");
  });

  it("serializes an object to pretty-printed JSON", async () => {
    const obj = { model: "gpt-4", temp: 0.7 };
    await copyToClipboard(obj);
    expect(writeTextMock).toHaveBeenCalledWith(JSON.stringify(obj, null, 2));
  });

  it("serializes an array to pretty-printed JSON", async () => {
    const arr = [1, 2, 3];
    await copyToClipboard(arr);
    expect(writeTextMock).toHaveBeenCalledWith(JSON.stringify(arr, null, 2));
  });

  it("passes null through without serialization", async () => {
    await copyToClipboard(null);
    expect(writeTextMock).toHaveBeenCalledWith(null);
  });

  it("passes undefined through without serialization", async () => {
    await copyToClipboard(undefined);
    expect(writeTextMock).toHaveBeenCalledWith(undefined);
  });

  it("passes a number through without serialization", async () => {
    await copyToClipboard(42);
    expect(writeTextMock).toHaveBeenCalledWith(42);
  });

  it("does not throw on clipboard error", async () => {
    writeTextMock.mockRejectedValue(new Error("denied"));
    await expect(copyToClipboard("text")).resolves.toBeUndefined();
  });
});
