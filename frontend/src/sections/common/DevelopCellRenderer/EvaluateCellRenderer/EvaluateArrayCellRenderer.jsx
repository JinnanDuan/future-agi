import { Box, Chip, useTheme } from "@mui/material";
import React, { useMemo } from "react";
import RenderMeta from "../RenderMeta";
import PropTypes from "prop-types";

const choicesBorderColourMap = {
  neutral: "primary.main",
  pass: "green.500",
  fail: "red.500",
};

const choicesFontColourMap = {
  neutral: "primary.main",
  pass: "green.500",
  fail: "red.500",
};

const EvaluateArrayCellRenderer = ({
  meta,
  isFutureAgiEval,
  value,
  choicesMap,
}) => {
  const finalArray = useMemo(() => {
    try {
      if (Array.isArray(value)) return value;
      if (typeof value !== "string") return [];
      const trimmed = value.trim();
      if (!trimmed) return [];
      
      if (!(trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        return [trimmed];
      }

      const parsed = JSON.parse(trimmed.replaceAll("'", '"'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return typeof value === "string" && value.trim() ? [value.trim()] : [];
    }
  }, [value]);
  const theme = useTheme();

  return (
    <Box
      sx={{
        padding: 1,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        height: "100%",
      }}
    >
      <Box
        sx={{
          lineHeight: "1.5",
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          overflow: "auto",
        }}
      >
        {finalArray?.length ? (
          finalArray?.map((item) => (
            <Chip
              key={item}
              label={item}
              size="small"
              variant="outlined"
              sx={{
                borderRadius: theme.spacing(0.5),
                borderColor:
                  choicesBorderColourMap[choicesMap[item] ?? "neutral"],
                color: choicesFontColourMap[choicesMap[item] ?? "neutral"],
                fontWeight: 400,
                typography: "s3",
              }}
            />
          ))
        ) : (
          <Chip
            label={"None"}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: theme.spacing(0.5),
              borderColor: choicesBorderColourMap["fail"],
              color: choicesBorderColourMap["fail"],
              fontWeight: 400,
            }}
          />
        )}
      </Box>
      <RenderMeta
        originType="evaluation"
        meta={meta}
        showToken={!isFutureAgiEval}
      />
    </Box>
  );
};

EvaluateArrayCellRenderer.propTypes = {
  meta: PropTypes.object,
  isFutureAgiEval: PropTypes.bool,
  value: PropTypes.any,
  choicesMap: PropTypes.object,
};

export default EvaluateArrayCellRenderer;
