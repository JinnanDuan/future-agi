import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PropTypes from "prop-types";
import React, { useCallback, useState } from "react";
import Iconify from "src/components/iconify";

const FILTER_FIELDS = [
  { value: "name", label: "Name", type: "string" },
  { value: "tags", label: "Tags", type: "string" },
];

const OPERATORS = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
];

const ProjectFilterPanel = ({
  anchorEl,
  open,
  onClose,
  currentFilters,
  onApply,
}) => {
  const [rows, setRows] = useState(currentFilters || []);

  const handleAddRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { field: "name", operator: "contains", value: "" },
    ]);
  }, []);

  const handleRemoveRow = useCallback((idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleChange = useCallback((idx, key, val) => {
    setRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: val } : row)),
    );
  }, []);

  const handleApply = useCallback(() => {
    const valid = rows.filter((r) => r.value.trim());
    onApply(valid.length > 0 ? valid : null);
    onClose();
  }, [rows, onApply, onClose]);

  const handleClear = useCallback(() => {
    setRows([]);
    onApply(null);
    onClose();
  }, [onApply, onClose]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{
        paper: {
          sx: { p: 2, minWidth: 400, maxWidth: 500, borderRadius: "10px" },
        },
      }}
    >
      <Stack spacing={1.5}>
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Filters</Typography>

        {rows.map((row, idx) => (
          <Stack key={idx} direction="row" spacing={0.75} alignItems="center">
            <Select
              size="small"
              value={row.field}
              onChange={(e) => handleChange(idx, "field", e.target.value)}
              sx={{ minWidth: 90, fontSize: 12, height: 32 }}
            >
              {FILTER_FIELDS.map((f) => (
                <MenuItem key={f.value} value={f.value} sx={{ fontSize: 12 }}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>

            <Select
              size="small"
              value={row.operator}
              onChange={(e) => handleChange(idx, "operator", e.target.value)}
              sx={{ minWidth: 100, fontSize: 12, height: 32 }}
            >
              {OPERATORS.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: 12 }}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>

            <TextField
              size="small"
              placeholder="Value"
              value={row.value}
              onChange={(e) => handleChange(idx, "value", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              sx={{ flex: 1 }}
              InputProps={{ sx: { fontSize: 12, height: 32 } }}
            />

            <IconButton size="small" onClick={() => handleRemoveRow(idx)}>
              <Iconify icon="mdi:close" width={14} />
            </IconButton>
          </Stack>
        ))}

        <Button
          size="small"
          startIcon={<Iconify icon="mdi:plus" width={14} />}
          onClick={handleAddRow}
          sx={{
            alignSelf: "flex-start",
            textTransform: "none",
            fontSize: 12,
            color: "text.secondary",
          }}
        >
          Add filter
        </Button>

        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <Button
            size="small"
            onClick={handleClear}
            sx={{ textTransform: "none", fontSize: 12 }}
          >
            Clear all
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleApply}
            sx={{
              textTransform: "none",
              fontSize: 12,
              px: 2,
              bgcolor: "#573fcc",
              "&:hover": { bgcolor: "#4a35b0" },
            }}
          >
            Apply
          </Button>
        </Stack>
      </Stack>
    </Popover>
  );
};

ProjectFilterPanel.propTypes = {
  anchorEl: PropTypes.any,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  currentFilters: PropTypes.array,
  onApply: PropTypes.func.isRequired,
};

export default ProjectFilterPanel;
