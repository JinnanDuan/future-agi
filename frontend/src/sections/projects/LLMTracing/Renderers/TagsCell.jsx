import React from "react";
import PropTypes from "prop-types";
import { Box, Chip } from "@mui/material";
import { normalizeTag } from "src/components/traceDetail/tagUtils";
import TagChip from "src/components/traceDetail/TagChip";

const MAX_VISIBLE = 2;

const TagsCell = ({ value }) => {
  if (!Array.isArray(value) || value.length === 0) return null;

  const visible = value.slice(0, MAX_VISIBLE);
  const overflowCount = value.length - MAX_VISIBLE;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.5,
        overflow: "hidden",
        height: "100%",
      }}
    >
      {visible.map((rawTag, idx) => {
        const tag = normalizeTag(rawTag);
        return (
          <TagChip
            key={`${tag.name}-${idx}`}
            name={tag.name}
            color={tag.color}
            size="small"
            readOnly
          />
        );
      })}
      {overflowCount > 0 && (
        <Chip
          label={`+${overflowCount}`}
          size="small"
          sx={{
            height: 20,
            fontSize: 11,
            "& .MuiChip-label": { px: 0.75 },
            bgcolor: "action.hover",
          }}
        />
      )}
    </Box>
  );
};

TagsCell.propTypes = {
  value: PropTypes.array,
};

export default React.memo(TagsCell);
