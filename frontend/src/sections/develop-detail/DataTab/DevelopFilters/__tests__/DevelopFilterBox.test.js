/**
 * Tests for panelFilterToStore / unwrapScalarValue.
 *
 * Regression coverage for TH-4400: the AI-query path in
 * TraceFilterPanel wraps every LLM-returned value in an array
 * (`[val]`) to match the trace chip-picker contract. The dataset
 * rows endpoint (`_apply_filters` in develop_dataset.py) expects
 * SCALARS for text/number/date/boolean columns — it does
 * `filter_value.lower()` / `float(filter_value)` directly. An array
 * value crashes inside a try/except the view swallows, so the user
 * sees every row unfiltered instead of a filtered result.
 *
 * The fix unwraps single-element arrays for scalar column types at
 * the panel→store boundary, so the store's filter shape always
 * matches what the backend expects regardless of whether the row
 * came from a manual edit or the AI query.
 */
import { describe, it, expect } from "vitest";
import {
  panelFilterToStore,
  unwrapScalarValue,
} from "../DevelopFilterBox";

describe("unwrapScalarValue", () => {
  it("unwraps single-element arrays for scalar string fields", () => {
    expect(unwrapScalarValue(["english"], "string", "is")).toBe("english");
  });

  it("unwraps single-element arrays for number fields", () => {
    expect(unwrapScalarValue([5], "number", "equal_to")).toBe(5);
  });

  it("unwraps single-element arrays for boolean fields", () => {
    expect(unwrapScalarValue([true], "boolean", "is")).toBe(true);
  });

  it("unwraps single-element arrays for date fields", () => {
    expect(unwrapScalarValue(["2026-04-21"], "date", "on")).toBe(
      "2026-04-21",
    );
  });

  it("preserves arrays for `array` fieldType", () => {
    // Array columns store JSON lists — the backend expects a list here.
    expect(unwrapScalarValue(["a", "b"], "array", "contains")).toEqual([
      "a",
      "b",
    ]);
  });

  it("preserves arrays for between / not_between range ops", () => {
    // Numeric between needs [min, max]; collapsing would lose the range.
    expect(unwrapScalarValue([1, 10], "number", "between")).toEqual([1, 10]);
    expect(unwrapScalarValue([1, 10], "number", "not_between")).toEqual([
      1,
      10,
    ]);
  });

  it("coerces empty arrays to '' so validateFilter rejects the row", () => {
    // Prevents `undefined` leaking into the store and hitting the
    // backend as `null` — `validateFilter` only checks `!== ''`.
    expect(unwrapScalarValue([], "string", "is")).toBe("");
    expect(unwrapScalarValue([undefined], "string", "is")).toBe("");
    expect(unwrapScalarValue([null], "string", "is")).toBe("");
  });

  it("passes non-array scalars through untouched", () => {
    expect(unwrapScalarValue("casual", "string", "is")).toBe("casual");
    expect(unwrapScalarValue(5, "number", "equal_to")).toBe(5);
    expect(unwrapScalarValue(false, "boolean", "is")).toBe(false);
  });
});

describe("panelFilterToStore — AI-path regression (TH-4400)", () => {
  it("unwraps array-wrapped scalar text values", () => {
    // This is exactly what TraceFilterPanel.handleAiFilter emits for a
    // dataset text column after the LLM returns `value: "english"`.
    const panel = {
      field: "col_lang",
      fieldCategory: "dataset",
      fieldType: "string",
      operator: "is",
      value: ["english"],
    };
    const out = panelFilterToStore(panel);
    expect(out.columnId).toBe("col_lang");
    expect(out.filterConfig).toMatchObject({
      filterType: "text",
      filterOp: "equals",
      filterValue: "english",
    });
  });

  it("unwraps array-wrapped numeric equals values", () => {
    const out = panelFilterToStore({
      field: "col_score",
      fieldCategory: "dataset",
      fieldType: "number",
      operator: "equal_to",
      value: [0.8],
    });
    expect(out.filterConfig).toMatchObject({
      filterType: "number",
      filterOp: "equals",
      filterValue: 0.8,
    });
  });

  it("keeps [min, max] tuple for numeric between", () => {
    const out = panelFilterToStore({
      field: "col_score",
      fieldType: "number",
      operator: "between",
      value: [0, 1],
    });
    expect(out.filterConfig.filterOp).toBe("between");
    expect(out.filterConfig.filterValue).toEqual([0, 1]);
  });

  it("keeps array values for array columns", () => {
    // Array column = JSON list — `contains` works against list membership.
    const out = panelFilterToStore({
      field: "col_tags",
      fieldType: "array",
      operator: "contains",
      value: ["urgent"],
    });
    expect(out.filterConfig).toMatchObject({
      filterType: "array",
      filterOp: "contains",
      filterValue: ["urgent"],
    });
  });

  it("round-trips a manual scalar entry unchanged", () => {
    // Manual DatasetColumnValuePicker emits strings directly — must not
    // be accidentally wrapped, unwrapped, or altered by this path.
    const out = panelFilterToStore({
      field: "col_lang",
      fieldType: "string",
      operator: "contains",
      value: "casual",
    });
    expect(out.filterConfig).toMatchObject({
      filterType: "text",
      filterOp: "contains",
      filterValue: "casual",
    });
  });

  it("coerces [undefined] from a stray AI response to '' (row gets rejected)", () => {
    const out = panelFilterToStore({
      field: "col_lang",
      fieldType: "string",
      operator: "is",
      value: [undefined],
    });
    expect(out.filterConfig.filterValue).toBe("");
  });
});
