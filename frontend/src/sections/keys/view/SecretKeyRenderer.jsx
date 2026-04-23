import { Box, IconButton } from "@mui/material";
import React from "react";
import PropTypes from "prop-types";
import { enqueueSnackbar } from "notistack";
import { copyToClipboard } from "src/utils/utils";
import SvgColor from "src/components/svg-color";
import { Events, PropertyName, trackEvent } from "src/utils/Mixpanel";

const maskString = (str) => {
  const start = str.slice(0, 4);
  const end = str.slice(-4);
  return start + "**********" + end;
};

const SecretKeyRenderer = ({ value }) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        height: "100%",
        gap: "12px",
      }}
    >
      {maskString(value)}
      <IconButton
        onClick={() => {
          copyToClipboard(value);
          trackEvent(Events.apikeyCopied, {
            [PropertyName.click]: "copied",
          });
          enqueueSnackbar("Copied to clipboard", {
            variant: "success",
          });
        }}
        size="small"
      >
        <SvgColor
          src="/assets/icons/ic_copy.svg"
          sx={{ width: "16px", height: "16px", color: "text.primary" }}
        />
      </IconButton>
    </Box>
  );
};

SecretKeyRenderer.propTypes = {
  value: PropTypes.string,
};

export default SecretKeyRenderer;
