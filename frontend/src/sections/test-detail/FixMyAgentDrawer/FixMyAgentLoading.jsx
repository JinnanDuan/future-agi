import { Box, CircularProgress, Typography, useTheme } from "@mui/material";
import React from "react";
import SvgColor from "../../../components/svg-color";

const FixMyAgentLoading = () => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          width: "47px",
          height: "47px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: "50%",
          backgroundColor: "action.hover",
        }}
      >
        <CircularProgress
          sx={{ width: "23px !important", height: "23px !important" }}
          color="inherit"
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: "30px",
        }}
      >
        <Typography variant="m3" fontWeight="fontWeightMedium">
          Finding suggestions to your issues..
        </Typography>
        <Typography
          sx={{ textAlign: "center", maxWidth: "376px" }}
          variant="s1"
        >
          We are analyzing your agents issues to provide solutions, this might
          take some time
        </Typography>
      </Box>
      <Box sx={{ paddingTop: "50px" }}>
        <Box
          sx={{
            padding: 0.5,
            backgroundColor: "action.hover",
            borderRadius: 0.5,
            gap: 0.5,
            display: "flex",
            alignItems: "center",
          }}
        >
          <SvgColor
            src="/icons/runTest/ic_settings.svg"
            sx={{
              width: 16,
              height: 16,
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.pink[500]} 100%)`,
            }}
          />
          <Typography
            typography="s1"
            fontWeight="fontWeightMedium"
            sx={{
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.pink[500]} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Currently in beta
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default FixMyAgentLoading;
