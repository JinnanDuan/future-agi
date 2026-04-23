import PropTypes from "prop-types";
import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useExportToDataset } from "src/api/annotation-queues/annotation-queues";

const STATUS_OPTIONS = [
  { value: "completed", label: "Completed only" },
  { value: "", label: "All items" },
  { value: "pending", label: "Pending only" },
  { value: "in_progress", label: "In Progress only" },
];

export default function ExportToDatasetDialog({ open, onClose, queueId }) {
  const [mode, setMode] = useState("new");
  const [datasetName, setDatasetName] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [statusFilter, setStatusFilter] = useState("completed");

  const { mutate: exportToDataset, isPending } = useExportToDataset();

  const handleExport = () => {
    const payload = {
      queueId,
      status_filter: statusFilter,
    };
    if (mode === "new") {
      payload.dataset_name = datasetName;
    } else {
      payload.dataset_id = datasetId;
    }

    exportToDataset(payload, {
      onSuccess: () => {
        onClose();
        setDatasetName("");
        setDatasetId("");
        setMode("new");
        setStatusFilter("completed");
      },
    });
  };

  const isValid = mode === "new" ? !!datasetName.trim() : !!datasetId.trim();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export to Dataset</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
            <FormControlLabel
              value="new"
              control={<Radio />}
              label="Create new dataset"
            />
            <FormControlLabel
              value="existing"
              control={<Radio />}
              label="Add to existing dataset"
            />
          </RadioGroup>

          {mode === "new" ? (
            <TextField
              label="Dataset name"
              fullWidth
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              required
            />
          ) : (
            <TextField
              label="Dataset ID"
              fullWidth
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              required
              placeholder="Paste dataset UUID"
            />
          )}

          <TextField
            select
            label="Items to export"
            fullWidth
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="caption" color="text.secondary">
            Annotations will be stored in each row&apos;s metadata field.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={isPending || !isValid}
        >
          {isPending ? "Exporting..." : "Export"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ExportToDatasetDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  queueId: PropTypes.string.isRequired,
};
