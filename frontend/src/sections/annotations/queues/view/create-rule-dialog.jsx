/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCreateAutomationRule } from "src/api/annotation-queues/annotation-queues";
import LLMFilterBox from "src/sections/projects/LLMTracing/LLMFilterBox";
import { getRandomId } from "src/utils/utils";

export const SOURCE_OPTIONS = [
  { value: "dataset_row", label: "Dataset Row" },
  { value: "trace", label: "Trace" },
  { value: "observation_span", label: "Span" },
  { value: "trace_session", label: "Session" },
  { value: "call_execution", label: "Simulation" },
];

// Default empty filter matching the LLMFilterBox format
export const DEFAULT_FILTER = {
  columnId: "",
  filterConfig: {
    filterType: "",
    filterOp: "",
    filterValue: "",
  },
};

// ---------------------------------------------------------------------------
// Filter definitions per source type.
// propertyId values use the same camelCase identifiers as the tracing /
// session / simulation views.  The backend evaluate_rule() maps these to
// Django ORM lookups via FIELD_MAPPING.
// ---------------------------------------------------------------------------

const TRACE_FILTER_DEF = [
  {
    propertyName: "Trace Id",
    propertyId: "traceId",
    filterType: { type: "text" },
    maxUsage: 1,
  },
  {
    propertyName: "Trace Name",
    propertyId: "traceName",
    filterType: { type: "text" },
    maxUsage: 1,
  },
  {
    propertyName: "Node Type",
    propertyId: "nodeType",
    maxUsage: 1,
    multiSelect: true,
    filterType: {
      type: "option",
      options: [
        { label: "Chain", value: "chain" },
        { label: "Retriever", value: "retriever" },
        { label: "Generation", value: "generation" },
        { label: "LLM", value: "llm" },
        { label: "Tool", value: "tool" },
        { label: "Agent", value: "agent" },
        { label: "Embedding", value: "embedding" },
      ],
    },
  },
  {
    propertyName: "User Id",
    propertyId: "userId",
    filterType: { type: "text" },
    maxUsage: 1,
  },
  {
    propertyName: "Status",
    propertyId: "status",
    filterType: {
      type: "option",
      options: [
        { label: "OK", value: "OK" },
        { label: "Error", value: "ERROR" },
        { label: "Unset", value: "UNSET" },
      ],
    },
  },
  {
    propertyName: "Project Name",
    propertyId: "projectName",
    filterType: { type: "text" },
    maxUsage: 1,
  },
];

// Span uses the same filters as trace per user specification
const SPAN_FILTER_DEF = TRACE_FILTER_DEF;

const SESSION_FILTER_DEF = [
  {
    propertyName: "Duration",
    propertyId: "duration",
    filterType: { type: "number" },
  },
  {
    propertyName: "Total Cost",
    propertyId: "totalCost",
    filterType: { type: "number" },
  },
  {
    propertyName: "Start Time",
    propertyId: "startTime",
    filterType: { type: "date" },
  },
  {
    propertyName: "End Time",
    propertyId: "endTime",
    filterType: { type: "date" },
  },
  {
    propertyName: "User Id",
    propertyId: "userId",
    filterType: { type: "text" },
    maxUsage: 1,
  },
  {
    propertyName: "Project Name",
    propertyId: "projectName",
    filterType: { type: "text" },
    maxUsage: 1,
  },
];

const SIMULATION_FILTER_DEF = [
  {
    propertyName: "Status",
    propertyId: "status",
    filterType: {
      type: "option",
      options: [
        { label: "Completed", value: "completed" },
        { label: "Failed", value: "failed" },
        { label: "In Progress", value: "in_progress" },
        { label: "Pending", value: "pending" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
  },
  {
    propertyName: "Persona",
    propertyId: "persona",
    filterType: { type: "text" },
    maxUsage: 1,
  },
  {
    propertyName: "Agent Definition",
    propertyId: "agentDefinition",
    filterType: { type: "text" },
    maxUsage: 1,
  },
  {
    propertyName: "Call Type",
    propertyId: "callType",
    filterType: {
      type: "option",
      options: [
        { label: "Voice", value: "voice" },
        { label: "Chat", value: "text" },
      ],
    },
  },
];

const DATASET_ROW_FILTER_DEF = [
  {
    propertyName: "Dataset Name",
    propertyId: "datasetName",
    filterType: { type: "text" },
    maxUsage: 1,
  },
  {
    propertyName: "Row Order",
    propertyId: "order",
    filterType: { type: "number" },
  },
  {
    propertyName: "Created At",
    propertyId: "createdAt",
    filterType: { type: "date" },
  },
];

export function getFilterDefinitionForSource(sourceType) {
  switch (sourceType) {
    case "trace":
      return TRACE_FILTER_DEF;
    case "observation_span":
      return SPAN_FILTER_DEF;
    case "trace_session":
      return SESSION_FILTER_DEF;
    case "call_execution":
      return SIMULATION_FILTER_DEF;
    case "dataset_row":
      return DATASET_ROW_FILTER_DEF;
    default:
      return TRACE_FILTER_DEF;
  }
}

export default function CreateRuleDialog({ open, onClose, queueId }) {
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("trace");
  const [filters, setFilters] = useState([
    { ...DEFAULT_FILTER, id: getRandomId() },
  ]);
  const [filterDef, setFilterDef] = useState(TRACE_FILTER_DEF);

  const { mutate: createRule, isPending } = useCreateAutomationRule();

  // Reset state when dialog is closed
  useEffect(() => {
    if (!open) {
      setName("");
      setSourceType("trace");
      setFilters([{ ...DEFAULT_FILTER, id: getRandomId() }]);
      setFilterDef(TRACE_FILTER_DEF);
    }
  }, [open]);

  const handleSourceChange = (newSource) => {
    setSourceType(newSource);
    setFilterDef(getFilterDefinitionForSource(newSource));
    // Reset filters when source changes
    setFilters([{ ...DEFAULT_FILTER, id: getRandomId() }]);
  };

  const handleCreate = () => {
    // Convert LLMFilterBox format to backend rules format.
    // propertyId values are view-level camelCase identifiers; the backend
    // maps them to Django ORM lookups via FIELD_MAPPING.
    const validRules = filters
      .filter((f) => f.columnId && f.filterConfig?.filterOp)
      .filter((f) => {
        const op = f.filterConfig?.filterOp;
        // Null operators don't need a value
        if (op === "is_null" || op === "is_not_null") return true;
        return (
          f.filterConfig?.filterValue !== "" &&
          f.filterConfig?.filterValue !== undefined
        );
      })
      .map((f) => ({
        field: f.columnId,
        op: f.filterConfig.filterOp,
        value: f.filterConfig.filterValue,
        filterType: f.filterConfig.filterType,
      }));

    createRule(
      {
        queueId,
        name,
        source_type: sourceType,
        conditions: {
          operator: "and",
          rules: validRules,
        },
        enabled: true,
      },
      {
        onSuccess: () => {
          onClose();
          setName("");
          setFilters([{ ...DEFAULT_FILTER, id: getRandomId() }]);
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Automation Rule</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Rule name"
            fullWidth
            value={name}
            size="small"
            onChange={(e) => setName(e.target.value)}
            required
          />

          <TextField
            select
            label="Source type"
            fullWidth
            size="small"
            value={sourceType}
            onChange={(e) => handleSourceChange(e.target.value)}
          >
            {SOURCE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="subtitle2">Conditions</Typography>
          <LLMFilterBox
            filters={filters}
            defaultFilter={{ ...DEFAULT_FILTER, id: getRandomId() }}
            setFilters={setFilters}
            filterDefinition={filterDef}
            setFilterDefinition={setFilterDef}
            resetFiltersAndClose={() => {
              setFilters([{ ...DEFAULT_FILTER, id: getRandomId() }]);
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreate}
          disabled={isPending || !name.trim()}
        >
          {isPending ? "Creating..." : "Create Rule"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
