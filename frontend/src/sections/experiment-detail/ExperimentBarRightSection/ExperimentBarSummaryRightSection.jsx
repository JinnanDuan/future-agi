import { Button } from "@mui/material";
import React from "react";
import { useExperimentDetailContext } from "../experiment-context";
import { trackEvent, Events } from "src/utils/Mixpanel";
import Iconify from "src/components/iconify";

const ExperimentBarSummaryRightSection = () => {
  const { setChooseWinnerOpen } = useExperimentDetailContext();

  return (
    <Button
      variant="contained"
      color="primary"
      startIcon={<Iconify icon="mdi:crown-outline" />}
      onClick={() => {
        trackEvent(Events.expWinnerClick);
        setChooseWinnerOpen(true);
      }}
    >
      Choose winner
    </Button>
  );
};

export default ExperimentBarSummaryRightSection;
