import PropTypes from "prop-types";
import React, { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import Iconify from "src/components/iconify";
import { useItemAnnotations } from "src/api/annotation-queues/annotation-queues";
import { fDateTime } from "src/utils/format-time";

const SOURCE_COLORS = {
  human: "primary",
  automated: "warning",
  imported: "default",
};

function groupByAnnotator(annotations) {
  const groups = {};
  for (const ann of annotations) {
    const key = ann.annotator || ann.annotator_name || "Unknown";
    if (!groups[key])
      groups[key] = {
        name: ann.annotator_name || "Unknown",
        items: [],
      };
    groups[key].items.push(ann);
  }
  return Object.values(groups);
}

AnnotationHistory.propTypes = {
  queueId: PropTypes.string.isRequired,
  itemId: PropTypes.string,
};

export default function AnnotationHistory({ queueId, itemId }) {
  const [open, setOpen] = useState(false);
  const { data: annotations = [] } = useItemAnnotations(queueId, itemId, {
    enabled: !!queueId && !!itemId,
  });

  if (!itemId) return null;

  const groups = groupByAnnotator(annotations);

  return (
    <Box sx={{ mt: 2 }}>
      <Divider sx={{ mb: 1 }} />
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        onClick={() => setOpen(!open)}
        sx={{ cursor: "pointer" }}
      >
        <Typography variant="caption" fontWeight={600} color="text.secondary">
          ANNOTATION HISTORY ({annotations.length})
        </Typography>
        <IconButton size="small">
          <Iconify
            icon={open ? "eva:chevron-up-fill" : "eva:chevron-down-fill"}
            width={16}
          />
        </IconButton>
      </Stack>
      <Collapse in={open}>
        {groups.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No annotations yet
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {groups.map((group, gi) => (
              <Box key={gi}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  {group.name}
                </Typography>
                {group.items.map((ann) => (
                  <Stack
                    key={ann.id}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ pl: 1, py: 0.5 }}
                  >
                    <Typography variant="body2" sx={{ minWidth: 100 }}>
                      {ann.label_name}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ flex: 1 }}
                    >
                      {typeof ann.value === "object"
                        ? JSON.stringify(ann.value)
                        : String(ann.value)}
                    </Typography>
                    <Chip
                      label={ann.score_source || "human"}
                      size="small"
                      color={SOURCE_COLORS[ann.score_source] || "default"}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {ann.created_at ? fDateTime(ann.created_at) : ""}
                    </Typography>
                  </Stack>
                ))}
              </Box>
            ))}
          </Stack>
        )}
      </Collapse>
    </Box>
  );
}
