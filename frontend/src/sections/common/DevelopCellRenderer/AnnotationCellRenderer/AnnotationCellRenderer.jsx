import { Box, Chip, useTheme } from "@mui/material";
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import RenderAnnotationInfo from "./RenderAnnotationInfo";

const AnnotationCellRenderer = ({ value, annotationData }) => {
  const theme = useTheme();
  const finalArray = useMemo(() => {
    try {
      return JSON.parse(value?.replaceAll("'", '"'));
    } catch (e) {
      return [];
    }
  }, [value]);

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
          flex: 1,
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          overflow: "hidden",
        }}
      >
        {finalArray?.map((item) => (
          <Chip
            key={item}
            label={item}
            size="small"
            color="primary"
            sx={{
              backgroundColor: theme.palette.action.hover,
              color: theme.palette.primary.main,
              fontWeight: 400,
            }}
          />
        ))}
      </Box>
      <RenderAnnotationInfo annotationData={annotationData} />
    </Box>
  );
};

AnnotationCellRenderer.propTypes = {
  value: PropTypes.any,
  annotationData: PropTypes.object,
};

export default AnnotationCellRenderer;
