import { Stack, useTheme } from "@mui/material";
import React, { useMemo } from "react";
import FormSearchSelectFieldState from "src/components/FromSearchSelectField/FormSearchSelectFieldState";
import { useProjectList } from "src/sections/projects/LLMTracing/common";
import { timeFilters } from "./common";
import PropTypes from "prop-types";
import useUsersStore from "./Store/usersStore";

export default function ProjectFilterRow() {
  const theme = useTheme();
  const {
    selectedProjectDay,
    setProjectSelectedDay,
    setSelectedProjectId,
    selectedProjectId,
  } = useUsersStore();

  const { data: projectList } = useProjectList("");
  const projectOptions = useMemo(
    () =>
      projectList?.map((project) => ({
        value: project?.id,
        label: project?.name,
      })),
    [projectList],
  );

  return (
    <>
      <Stack
        direction={"row"}
        alignItems={"center"}
        justifyContent={"space-between"}
      >
        <Stack direction={"row"} gap={theme.spacing(1.5)} alignItems={"center"}>
          <FormSearchSelectFieldState
            size="small"
            label="All projects"
            options={projectOptions}
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          />
          <FormSearchSelectFieldState
            size="small"
            label="All days"
            options={timeFilters}
            value={selectedProjectDay}
            onChange={(e) => setProjectSelectedDay(e.target.value)}
          />
        </Stack>
      </Stack>
    </>
  );
}

ProjectFilterRow.propTypes = {
  primaryTraceFilters: PropTypes.array,
  setPrimaryTraceFilters: PropTypes.func,
  primaryTraceValidatedFilters: PropTypes.array,
};
