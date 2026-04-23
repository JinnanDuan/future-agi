/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo, useRef } from "react";
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
import { useUpdateAutomationRule } from "src/api/annotation-queues/annotation-queues";
import LLMFilterBox from "src/sections/projects/LLMTracing/LLMFilterBox";
import { getRandomId } from "src/utils/utils";
import {
  SOURCE_OPTIONS,
  DEFAULT_FILTER,
  getFilterDefinitionForSource,
} from "./create-rule-dialog";

/**
 * Convert backend rule conditions back to LLMFilterBox filter format.
 * Backend: { operator, rules: [{ field, op, value, filterType }] }
 * LLMFilterBox: [{ id, columnId, filterConfig: { filterType, filterOp, filterValue } }]
 */
function conditionsToFilters(conditions) {
  const rules = conditions?.rules || [];
  if (rules.length === 0) {
    return [{ ...DEFAULT_FILTER, id: getRandomId() }];
  }
  return rules.map((r) => ({
    id: getRandomId(),
    columnId: r.field || "",
    filterConfig: {
      filterType: r.filterType || "text",
      filterOp: r.op || "",
      filterValue: r.value ?? "",
    },
  }));
}

export default function EditRuleDialog({ open, onClose, queueId, rule }) {
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("trace");
  const [filters, setFilters] = useState([
    { ...DEFAULT_FILTER, id: getRandomId() },
  ]);
  const [filterDef, setFilterDef] = useState([]);

  const { mutate: updateRule, isPending } = useUpdateAutomationRule();
  const initializedRuleIdRef = useRef(null);

  // Populate form when rule changes or dialog opens — only once per rule ID
  useEffect(() => {
    if (rule && open && initializedRuleIdRef.current !== rule.id) {
      initializedRuleIdRef.current = rule.id;
      const src = rule.source_type || "trace";
      setName(rule.name || "");
      setSourceType(src);
      setFilterDef(getFilterDefinitionForSource(src));
      setFilters(conditionsToFilters(rule.conditions));
    }
    if (!open) {
      initializedRuleIdRef.current = null;
    }
  }, [rule, open]);

  const currentFilterDef = useMemo(
    () => getFilterDefinitionForSource(sourceType),
    [sourceType],
  );

  const handleSourceChange = (newSource) => {
    setSourceType(newSource);
    setFilterDef(getFilterDefinitionForSource(newSource));
    setFilters([{ ...DEFAULT_FILTER, id: getRandomId() }]);
  };

  const handleSave = () => {
    const validRules = filters
      .filter((f) => f.columnId && f.filterConfig?.filterOp)
      .filter((f) => {
        const op = f.filterConfig?.filterOp;
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

    updateRule(
      {
        queueId,
        ruleId: rule.id,
        name,
        source_type: sourceType,
        conditions: {
          operator: "and",
          rules: validRules,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Automation Rule</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <TextField
            label="Rule name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <TextField
            select
            label="Source type"
            fullWidth
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
            filterDefinition={
              filterDef.length > 0 ? filterDef : currentFilterDef
            }
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
          onClick={handleSave}
          disabled={isPending || !name.trim()}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
