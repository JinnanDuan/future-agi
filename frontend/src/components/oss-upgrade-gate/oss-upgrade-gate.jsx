import React from "react";
import PropTypes from "prop-types";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Iconify from "src/components/iconify";
import { logger } from "src/utils/logger";

const CONTACT_URL = "https://futureagi.com/talk-to-human";

// Edit copy here — single source of truth for all OSS upgrade messages.
const TAGLINE = "Free to build. Powerful to scale.";

const COPY = {
  errorFeed: {
    description:
      "Unlock auto-clustered error triage and production failure insights when you're ready to ship with confidence.",
  },
  usageSummary: {
    description:
      "Unlock full visibility into your usage, spend, and credits when you're ready to grow.",
  },
  pricing: {
    description:
      "Unlock flexible plans that scale with your team when you're ready to grow.",
  },
  billing: {
    description:
      "Unlock payment methods, invoices, and budget controls when you're ready to grow.",
  },
};

export default function OSSUpgradeGate({ feature }) {
  const copy = COPY[feature];
  if (!copy) {
    logger.warn(`OSSUpgradeGate: unknown feature "${feature}"`);
    return null;
  }
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={2}
      sx={{ height: 1, minHeight: 480, px: 3, textAlign: "center" }}
    >
      <Iconify
        icon="mdi:rocket-launch-outline"
        sx={{ width: 64, height: 64, color: "primary.main" }}
      />
      <Typography variant="h5">{TAGLINE}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
        {copy.description}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        href={CONTACT_URL}
        target="_blank"
        rel="noopener"
      >
        Contact us to upgrade
      </Button>
    </Stack>
  );
}

OSSUpgradeGate.propTypes = {
  feature: PropTypes.oneOf(Object.keys(COPY)).isRequired,
};
