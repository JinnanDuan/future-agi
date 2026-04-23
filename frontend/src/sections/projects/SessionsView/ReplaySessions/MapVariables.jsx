import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { chatEvalColumns } from "src/components/run-tests/common";
import EvaluationMappingFormContent from "../../../common/EvaluationDrawer/EvaluationMappingFormContent";
import { useFormContext, useWatch } from "react-hook-form";
import { useEvaluationKeys } from "./useEvaluationKeys";
import Loading from "./Loading";

const MapVariables = () => {
  const { control, formState } = useFormContext();
  const model = useWatch({
    control,
    name: "model",
  });
  const { observeId } = useParams();

  const {
    projectEvals,
    filteredRequiredKeys,
    groupedRequiredKeys,
    transformedOptionalKeys,
    isFutureagiBuilt,
    modelsToShow,
    isLoading,
  } = useEvaluationKeys(observeId, null, null, {
    alwaysFetch: true,
    alwaysCompute: true,
  });

  const [showAll, setShowAll] = useState(false);

  const visibleItems = showAll ? projectEvals : projectEvals.slice(0, 10);

  if (isLoading) {
    return <Loading />;
  }

  if (projectEvals.length === 0 && !isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Typography typography={"s1"} fontWeight={"fontWeightMedium"}>
          Nothing to map. Proceed to run the simulation.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: "background.paper",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: 2,
      }}
    >
      <EvaluationMappingFormContent
        _module={"replay-sessions"}
        control={control}
        members={projectEvals}
        filteredRequiredKeys={filteredRequiredKeys}
        filteredColumns={model === "" ? [] : chatEvalColumns}
        showTest={false}
        onTest={() => {}}
        formState={formState}
        selectedEval={{
          isGroupEvals: true,
        }}
        hideBackButtons={true}
        filteredVisibleItems={visibleItems}
        setShowAll={setShowAll}
        isFutureagiBuilt={isFutureagiBuilt}
        modelsToShow={modelsToShow}
        groupedRequiredKeys={groupedRequiredKeys}
        transformedOptionalKeys={transformedOptionalKeys}
        showAll={showAll}
        hideGroupHeader={true}
        hideAddGroupButton={true}
        hideKnowledgeBase
      />
    </Box>
  );
};

export default MapVariables;
