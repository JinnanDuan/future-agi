import PropTypes from "prop-types";
import { Chip } from "@mui/material";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "default" },
  in_progress: { label: "In Progress", color: "info" },
  completed: { label: "Completed", color: "success" },
  skipped: { label: "Skipped", color: "warning" },
};

export default function ItemStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="soft"
    />
  );
}

ItemStatusBadge.propTypes = {
  status: PropTypes.string,
};
