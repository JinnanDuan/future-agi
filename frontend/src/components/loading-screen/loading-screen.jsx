import React from "react";
import PropTypes from "prop-types";

import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import { useLocation } from "react-router";
import LoadingTemplate from "../../sections/workbench/LoadingTemplate";

// ----------------------------------------------------------------------

export default function LoadingScreen({ sx, ...other }) {
  const location = useLocation();
  if (location?.state?.fromOption === "use-template") {
    return <LoadingTemplate sx={{ mt: "46px" }} />;
  }
  return (
    <Box
      sx={{
        px: 5,
        width: 1,
        flexGrow: 1,
        minHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...sx,
      }}
      {...other}
    >
      <LinearProgress color="inherit" sx={{ width: 1, maxWidth: 360 }} />
    </Box>
  );
}

LoadingScreen.propTypes = {
  sx: PropTypes.object,
};
