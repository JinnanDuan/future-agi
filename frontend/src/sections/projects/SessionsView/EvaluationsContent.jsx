import { Chip, Stack, Typography } from "@mui/material";
import PropTypes from "prop-types";
import React from "react";

const getEvaluationMetricColor = (value) => {
  const numericValue =
    typeof value?.score === "number" ? value.score : parseFloat(value?.score);
  if (numericValue < 50) {
    return { backgroundColor: "red.o10", borderColor: "red.500" };
  }
  return { backgroundColor: "green.o10", borderColor: "green.500" };
};

export default function EvaluationsContent({ evaluationMetrics = {} }) {
  const hasEvaluations = Object.keys(evaluationMetrics).length > 0;

  return (
    <Stack
      direction={"column"}
      sx={{
        overflow: "auto",
        paddingY: 2,
      }}
      alignItems={"flex-start"}
    >
      {!hasEvaluations ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontStyle: "italic",
            padding: "8px",
          }}
        >
          No evaluations available
        </Typography>
      ) : (
        Object.keys(evaluationMetrics).map((key, index) => {
          const { backgroundColor, borderColor } = getEvaluationMetricColor(
            evaluationMetrics[key],
          );
          return (
            <Chip
              key={index}
              label={
                <Typography
                  typography="s2"
                  sx={{ color: borderColor }}
                  fontWeight={"fontWeightMedium"}
                >{`${evaluationMetrics[key].name}: ${evaluationMetrics[key].score}%`}</Typography>
              }
              sx={{
                backgroundColor: backgroundColor,
                height: "24px",
                borderRadius: "8px",
                margin: "4px",
                padding: "4px",
                "&:hover": {
                  backgroundColor,
                  borderColor,
                },
              }}
            />
          );
        })
      )}
    </Stack>
  );
}

EvaluationsContent.propTypes = {
  evaluationMetrics: PropTypes.object,
};
