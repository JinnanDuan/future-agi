import { AgentPromptOptimizerStatus } from "../FixMyAgentDrawer/common";
import { getStatusColor } from "./common";
import SvgColor from "src/components/svg-color/svg-color";
import PropTypes from "prop-types";
import { Box, useTheme } from "@mui/material";

const CustomStepIcon = ({ step, isFailedStep }) => {
  const theme = useTheme();
  const colors = getStatusColor(
    isFailedStep ? AgentPromptOptimizerStatus.FAILED : step?.status,
    theme,
  );
  const iconColor = colors?.icon;
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: colors?.bg,
        flexShrink: 0,
      }}
    >
      <SvgColor
        sx={{ color: iconColor, width: 14 }}
        src={
          isFailedStep
            ? "/assets/icons/ic_failed.svg"
            : "/assets/icons/ic_check_with_circle_tick.svg"
        }
      />
    </Box>
  );
};

CustomStepIcon.propTypes = {
  step: PropTypes.shape({
    status: PropTypes.string.isRequired, // Ensure `status` is validated as a required string
    name: PropTypes.string,
    description: PropTypes.string,
    updatedAt: PropTypes.string,
  }).isRequired,
  isFailedStep: PropTypes.bool,
};
export default CustomStepIcon;
