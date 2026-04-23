import { Box } from "@mui/material";
import PropTypes from "prop-types";
import { useOptimizeTrialPrompts } from "src/api/tests/testDetails";
import PromptDiffView from "./PromptDiffView";
import PromptPanel from "./PromptPanel";

const PromptDetails = ({ optimizationId, trialId, showDiff }) => {
  const { data: trailPromptData } = useOptimizeTrialPrompts({
    optimizationId,
    trialId,
  });

  if (showDiff) {
    return (
      <PromptDiffView
        originalPrompt={trailPromptData?.basePrompt}
        optimizedPrompt={trailPromptData?.trialPrompt}
      />
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 1, height: "100%" }}>
      <Box sx={{ flex: 1 }}>
        <PromptPanel
          title="OPTIMIZED AGENT PROMPT"
          prompt={trailPromptData?.trialPrompt}
        />
      </Box>
    </Box>
  );
};

PromptDetails.propTypes = {
  optimizationId: PropTypes.string,
  trialId: PropTypes.string,
  showDiff: PropTypes.bool,
};

export default PromptDetails;
