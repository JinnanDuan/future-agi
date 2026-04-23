import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Iconify from "src/components/iconify";

function formatAnnotationValue(value, labelType, labelSettings) {
  if (value === null || value === undefined) return "No annotation";
  const settings = labelSettings || {};

  switch (labelType) {
    case "categorical": {
      const selected = value?.selected;
      if (Array.isArray(selected)) return selected.join(", ") || "—";
      return String(value);
    }
    case "star": {
      const rating = value?.rating;
      const max = settings.no_of_stars || 5;
      if (rating == null) return "—";
      return `${rating} / ${max} stars`;
    }
    case "thumbs_up_down": {
      const v = value?.value;
      if (v === "up") return "👍 Up";
      if (v === "down") return "👎 Down";
      return "—";
    }
    case "numeric": {
      const num = value?.value ?? value;
      return num != null ? String(num) : "—";
    }
    case "text":
      return value?.text || String(value) || "—";
    default:
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
  }
}

ReviewPanel.propTypes = {
  annotations: PropTypes.array,
  labels: PropTypes.array,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  isPending: PropTypes.bool,
  reviewStatus: PropTypes.string,
  itemId: PropTypes.string,
};

export default function ReviewPanel({
  annotations = [],
  labels = [],
  onApprove,
  onReject,
  isPending,
  reviewStatus,
  itemId,
}) {
  const [notes, setNotes] = useState("");

  // Reset notes when navigating between items
  useEffect(() => {
    setNotes("");
  }, [itemId]);

  return (
    <Box
      sx={{
        p: 3,
        overflow: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        Review Annotations
      </Typography>

      {reviewStatus && (
        <Chip
          label={reviewStatus.replace("_", " ")}
          color={
            reviewStatus === "approved"
              ? "success"
              : reviewStatus === "rejected"
                ? "error"
                : "warning"
          }
          size="small"
          sx={{ mb: 2, alignSelf: "flex-start" }}
        />
      )}

      {/* Show submitted annotations read-only */}
      <Stack spacing={1.5} sx={{ flex: 1 }}>
        {labels.map((ql) => {
          const labelId = ql.label_id;
          const ann = annotations.find((a) => a.label_id === labelId);
          const displayValue = ann
            ? formatAnnotationValue(
                ann.value,
                ann.label_type || ql.type,
                ann.label_settings || ql.settings,
              )
            : "No annotation";
          return (
            <Box
              key={ql.id}
              sx={{
                p: 1.5,
                borderRadius: 0.5,
                bgcolor: "background.neutral",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {ql.name}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {displayValue}
              </Typography>
              {ann?.notes && (
                <Typography variant="caption" color="text.secondary">
                  Note: {ann.notes}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Review notes */}
      <TextField
        fullWidth
        size="small"
        multiline
        minRows={2}
        maxRows={4}
        placeholder="Review notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Actions */}
      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          color="success"
          fullWidth
          disabled={isPending}
          onClick={() => onApprove(notes)}
          startIcon={<Iconify icon="eva:checkmark-circle-2-fill" width={18} />}
        >
          Approve
        </Button>
        <Button
          variant="contained"
          color="error"
          fullWidth
          disabled={isPending}
          onClick={() => onReject(notes)}
          startIcon={<Iconify icon="eva:close-circle-fill" width={18} />}
        >
          Reject
        </Button>
      </Stack>
    </Box>
  );
}
