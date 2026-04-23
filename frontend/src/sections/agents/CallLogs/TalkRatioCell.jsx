import React from "react";
import PropTypes from "prop-types";
import { Box, Tooltip, Typography } from "@mui/material";

const TalkRatioCell = (params) => {
  const data = params?.data;
  const ratio = data?.talk_ratio;
  if (!ratio) {
    return (
      <Typography
        variant="body2"
        sx={{ fontSize: 13, color: "text.disabled", px: 2 }}
      >
        -
      </Typography>
    );
  }

  const userPct = ratio.user_pct ?? 0;
  const botPct = ratio.bot_pct ?? 0;

  return (
    <Tooltip
      title={`User: ${ratio.user ?? 0}s (${userPct}%) | Bot: ${ratio.bot ?? 0}s (${botPct}%)`}
      arrow
      placement="bottom"
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 2,
          height: "100%",
        }}
      >
        {/* Stacked bar */}
        <Box
          sx={{
            display: "flex",
            width: 60,
            height: 6,
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "divider",
          }}
        >
          <Box
            sx={{
              width: `${userPct}%`,
              bgcolor: "info.main",
              transition: "width 200ms",
            }}
          />
          <Box
            sx={{
              width: `${botPct}%`,
              bgcolor: "secondary.main",
              transition: "width 200ms",
            }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{ fontSize: 11, color: "text.secondary", whiteSpace: "nowrap" }}
        >
          {userPct}:{botPct}
        </Typography>
      </Box>
    </Tooltip>
  );
};

TalkRatioCell.propTypes = { data: PropTypes.object };

export default React.memo(TalkRatioCell);
