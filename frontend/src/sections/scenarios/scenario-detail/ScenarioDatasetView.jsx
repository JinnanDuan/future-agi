import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { useGetScenarioDetail } from "src/api/scenarios/scenarios";
import { LoadingScreen } from "src/components/loading-screen";
import SvgColor from "src/components/svg-color";
import GraphPreview from "./GraphPreview";
import PromptPreview from "./PromptPreview";
import { ShowComponent } from "src/components/show";
import DevelopDataV2 from "src/sections/develop-detail/DataTab/DevelopDataV2";
import DevelopDetailProvider from "src/sections/develop-detail/DevelopDetailProvider";
import AddRowScenario from "./AddRowScenario";
import ScenarioDetailRightSection from "./ScenarioDetailRightSection";
import AddColumnScenario from "./AddColumnScenario";

const ScenarioDatasetView = () => {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [addRowScenarioOpen, setAddRowScenarioOpen] = useState(false);
  const [addColumnScenarioOpen, setColumnScenarioOpen] = useState(false);
  // Fetch scenario details
  const { data: scenario, isLoading, error } = useGetScenarioDetail(scenarioId);
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !scenario) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography color="error">
          Error loading scenario: {error.message}
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate("/dashboard/simulate/scenarios")}
        >
          Back to Scenarios
        </Button>
      </Box>
    );
  }

  return (
    <DevelopDetailProvider>
      <Box
        s
        sx={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "background.paper",
          height: "100%",
        }}
      >
        <Box
          sx={{
            padding: 2,
            display: "flex",
            gap: "12px",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            typography="m3"
            fontWeight="fontWeightMedium"
            color="text.disabled"
            onClick={() => navigate("/dashboard/simulate/scenarios")}
            sx={{ cursor: "pointer" }}
          >
            All Scenarios
          </Typography>
          <SvgColor src="/assets/icons/custom/lucide--chevron-right.svg" />
          <Typography typography="m3" fontWeight="fontWeightMedium">
            {scenario?.name}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            paddingX: 2,
            paddingTop: 1,
            gap: 2,
            height: "50%",
          }}
        >
          <ShowComponent
            condition={scenario?.scenarioType !== "dataset" || scenario?.graph}
          >
            <GraphPreview agentType={scenario?.agentType} scenario={scenario} />
          </ShowComponent>
          <PromptPreview scenario={scenario} />
        </Box>
        <Box
          sx={{
            paddingX: 2,
            paddingTop: 2,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography typography="m3" fontWeight="fontWeightSemiBold">
            Generated scenarios
          </Typography>
          <ScenarioDetailRightSection
            scenario={scenario}
            setAddRowScenarioOpen={setAddRowScenarioOpen}
            setColumnScenarioOpen={setColumnScenarioOpen}
          />
        </Box>

        <ShowComponent condition={!scenario?.dataset}>
          <ShowComponent condition={scenario?.status === "Processing"}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                paddingX: 2,
                height: "100%",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={20} />
              <Typography typography="s1">
                We are generating the scenario...
              </Typography>
            </Box>
          </ShowComponent>
          <ShowComponent condition={scenario?.status === "Failed"}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                paddingX: 2,
                height: "100%",
                justifyContent: "center",
              }}
            >
              <Typography typography="s1">
                There was an error generating the scenario.
              </Typography>
            </Box>
          </ShowComponent>
        </ShowComponent>
        <ShowComponent condition={scenario?.dataset}>
          <Box
            sx={{ height: "100vh", display: "flex", flexDirection: "column" }}
          >
            <DevelopDataV2
              datasetId={scenario?.dataset}
              viewOptions={{
                showDrawer: false,
                bottomRow: false,
              }}
            />
            <AddRowScenario
              open={addRowScenarioOpen}
              onClose={() => setAddRowScenarioOpen(false)}
              datasetId={scenario?.dataset}
              scenarioType={scenario?.scenarioType}
              scenarioId={scenarioId}
            />
            <AddColumnScenario
              open={addColumnScenarioOpen}
              onClose={() => setColumnScenarioOpen(false)}
              datasetId={scenario?.dataset}
              scenarioType={scenario?.scenarioType}
              scenarioId={scenarioId}
            />
          </Box>
        </ShowComponent>
      </Box>
    </DevelopDetailProvider>
  );

  // // For dataset type scenarios, redirect to the develop detail view
  // // This approach reuses all existing functionality of DevelopDetailView
  // // Using URL params to ensure the state is preserved
  // const params = new URLSearchParams({
  //   fromScenario: "true",
  //   scenarioId: scenario.id,
  //   scenarioName: scenario.name,
  //   tab: "data",
  // });

  // return (
  //   <Navigate
  //     to={`/dashboard/develop/${datasetId}?${params.toString()}`}
  //     replace
  //   />
  // );
};

export default ScenarioDatasetView;
