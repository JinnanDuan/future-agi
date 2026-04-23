import React from "react";
import PropTypes from "prop-types";
import { Box, Divider, Typography } from "@mui/material";
import SvgColor from "src/components/svg-color";

const colorMap = (type) => {
  if (type === "conversation")
    return {
      color: "primary.main",
      icon: "/assets/icons/navbar/ic_prompt.svg",
      name: "Conversation",
    };
  if (type === "end")
    return {
      color: "red.600",
      icon: "/assets/icons/components/ic_end_call.svg",
      name: "End Call",
    };
  if (type === "transfer")
    return {
      color: "orange.600",
      icon: "/assets/icons/components/ic_transfer_call.svg",
      name: "Transfer Call",
    };
  if (type === "endChat")
    return {
      color: "red.600",
      icon: "/assets/icons/ic_end_chat.svg",
      name: "End Chat",
    };
  if (type === "transferChat")
    return {
      color: "orange.600",
      icon: "/assets/icons/ic_transfer_chat.svg",
      name: "Transfer Chat",
    };
};

const NodeHeader = ({ type, title }) => {
  const { color, icon, name } = colorMap(type);
  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <Box
          sx={{
            backgroundColor: color,
            padding: 1,
            borderRadius: "2px",
            width: "24px",
            height: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SvgColor
            src={icon}
            sx={{
              width: "16px",
              height: "16px",
              color: "common.white",
              flexShrink: 0,
            }}
          />
        </Box>
        <Typography typography="s2" fontWeight="fontWeightMedium">
          {title || name}
        </Typography>
      </Box>
      <Divider />
    </>
  );
};

NodeHeader.propTypes = {
  type: PropTypes.string,
  title: PropTypes.string,
};

export default NodeHeader;
