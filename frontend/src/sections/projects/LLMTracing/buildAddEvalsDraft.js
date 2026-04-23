import { endOfToday, sub } from "date-fns";
import { formatDate } from "src/utils/report-utils";
import { getRandomId } from "src/utils/utils";

const COL_TYPE_TO_CATEGORY = {
  SPAN_ATTRIBUTE: "attribute",
  SYSTEM_METRIC: "system",
  EVALUATION_METRIC: "eval",
  ANNOTATION: "annotation",
};

const readField = (f) => f?.columnId ?? f?.column_id;
const readCfg = (f) => f?.filterConfig ?? f?.filter_config ?? {};
const readType = (cfg) => cfg.filterType ?? cfg.filter_type;
const readOp = (cfg) => cfg.filterOp ?? cfg.filter_op;
const readVal = (cfg) => cfg.filterValue ?? cfg.filter_value;
const readColType = (cfg) => cfg.colType ?? cfg.col_type;

const toFormRows = (sourceFilters = []) => {
  const out = [];
  (sourceFilters || []).forEach((f) => {
    const field = readField(f);
    if (!field || field === "created_at") return;
    const cfg = readCfg(f);
    const category = COL_TYPE_TO_CATEGORY[readColType(cfg)] ?? "system";
    const isAttribute = category === "attribute";
    const raw = readVal(cfg);
    const values = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
        ? raw
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : raw != null
          ? [raw]
          : [];
    values.forEach((v) => {
      if (v === "" || v == null) return;
      out.push({
        id: getRandomId(),
        property: isAttribute ? "attributes" : field,
        propertyId: field,
        fieldCategory: category,
        fieldLabel: field,
        filterConfig: {
          filterType: readType(cfg) === "number" ? "number" : "text",
          filterOp: readOp(cfg) || "equals",
          filterValue: v,
        },
      });
    });
  });
  return out;
};

export function buildAddEvalsDraft({
  observeId,
  rowType,
  mainFilters = [],
  extraFilters = [],
  dateFilter,
  returnTo,
}) {
  const filters = [...toFormRows(mainFilters), ...toFormRows(extraFilters)];
  const startDate =
    dateFilter?.dateFilter?.[0] ?? formatDate(sub(new Date(), { months: 12 }));
  const endDate = dateFilter?.dateFilter?.[1] ?? formatDate(endOfToday());

  const values = {
    name: "",
    project: observeId,
    rowType,
    filters,
    spansLimit: 100000,
    samplingRate: 50,
    evalsDetails: [],
    startDate,
    endDate,
    runType: "historical",
  };

  const draftId = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  try {
    localStorage.setItem(
      `task-draft-${draftId}`,
      JSON.stringify({ savedAt: Date.now(), values }),
    );
  } catch {
    // localStorage unavailable — page will fall back to defaults
  }
  const params = new URLSearchParams({
    project: observeId,
    draft: draftId,
  });
  if (returnTo) {
    params.set("returnTo", returnTo);
  }
  return `/dashboard/tasks/create?${params.toString()}`;
}
