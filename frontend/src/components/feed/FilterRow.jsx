import { Stack, useTheme } from "@mui/material";
import React, { useMemo } from "react";
import FormSearchSelectFieldState from "src/components/FromSearchSelectField/FormSearchSelectFieldState";
import FormSearchField from "src/components/FormSearchField/FormSearchField";
import { useFeedStore } from "src/pages/dashboard/feed/store/store";
import {
  // generateObserveTraceFilterDefinition,
  useProjectList,
} from "src/sections/projects/LLMTracing/common";
// import SvgColor from "src/components/svg-color";
// import LLMFiltersDrawer from "src/sections/projects/LLMTracing/LLMFiltersDrawer";
import { timeFilters } from "./common";
import PropTypes from "prop-types";

// import axios, { endpoints } from "src/utils/axios";
// import { useQuery } from "@tanstack/react-query";

// const defaultFilterBase = {
//   columnId: "",
//   filterConfig: {
//     filterType: "",
//     filterOp: "",
//     filterValue: "",
//   },
// };

export default function FilterRow() {
  const theme = useTheme();
  const {
    selectedDay,
    searchQuery,
    setSearchQuery,
    selectedProject,
    setSelectedDay,
    setSelectedProject,
    // isFilterOpen,
    // setIsFilterOpen,
  } = useFeedStore();

  // const { data: evalAttributes } = useQuery({
  //   queryKey: ["eval-attributes", "d114d87c-bb14-47d6-b864-3cc2313f84f8"],
  //   queryFn: () =>
  //     axios.post(endpoints.project.getEvalAttributeList(), {
  //       filters: { projectId: "d114d87c-bb14-47d6-b864-3cc2313f84f8" },
  //     }),
  //   select: (data) => data.data?.result,
  // });

  // console.log("🚀 ~ FilterRow ~ evalAttributes:", evalAttributes);

  // const [attributes, setAttributes] = useState([]);
  // console.log("🚀 ~ FilterRow ~ attributes:", attributes);

  // useEffect(() => {
  //   setAttributes(evalAttributes || []);
  // }, [evalAttributes]);

  // Memoized helper for preserving attribute definitions
  // const preserveAttributeDefinitions = useMemo(() => {
  //   return (prevDefinition, newBaseDefinition) => {
  //     const attributionIndex = prevDefinition?.findIndex(
  //       (item) => item?.propertyName === "Attribute",
  //     );

  //     if (prevDefinition?.[attributionIndex]?.dependents?.length > 0) {
  //       // Already has the Attribute block — preserve it
  //       const copy = [...newBaseDefinition];
  //       const copyAttributionIndex = copy?.findIndex(
  //         (item) => item?.propertyName === "Attribute",
  //       );
  //       if (copyAttributionIndex >= 0) {
  //         copy[copyAttributionIndex] = prevDefinition[attributionIndex];
  //       }
  //       return copy;
  //     } else {
  //       // Generate fresh with attributes
  //       return newBaseDefinition;
  //     }
  //   };
  // }, []);

  // const [primaryFilterDefinition, setPrimaryFilterDefinition] = useState(() => {
  //   return generateObserveTraceFilterDefinition([], []).filter(
  //     (f) => f.propertyName !== "Attribute",
  //   );
  // });

  // useEffect(() => {
  //   setPrimaryFilterDefinition((prevDefinition) => {
  //     const newBaseDefinition = generateObserveTraceFilterDefinition(
  //       columns["primary-trace"],
  //       attributes,
  //       primaryTraceFilters,
  //     );
  //     return preserveAttributeDefinitions(prevDefinition, newBaseDefinition);
  //   });
  // }, [columns, attributes, preserveAttributeDefinitions, primaryTraceFilters]);

  const { data: projectList } = useProjectList("");
  const projectOptions = useMemo(
    () =>
      projectList?.map((project) => ({
        value: project?.id,
        label: project?.name,
      })),
    [projectList],
  );

  // const checkHasActiveFilter = (filters) => {
  //   return filters?.some((f) => {
  //     const value = f?.filterConfig?.filterValue;
  //     if (value === null || value === undefined) return false;

  //     if (typeof value === "boolean") return true;
  //     if (typeof value === "number") return true;
  //     if (typeof value === "string") return value.trim() !== "";
  //     if (Array.isArray(value)) return value.length > 0;
  //     if (typeof value === "object") return Object.keys(value).length > 0;

  //     return false;
  //   });
  // };

  // const hasActiveFilter = useMemo(
  //   () => checkHasActiveFilter(primaryTraceFilters),
  //   [primaryTraceFilters],
  // );

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
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          />
          <FormSearchSelectFieldState
            size="small"
            label="All days"
            options={timeFilters}
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          />
          <FormSearchField
            size="small"
            placeholder="Search"
            sx={{ minWidth: "360px" }}
            searchQuery={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Stack>
        {/* <Button
          variant="outlined"
          size="small"
          onClick={() => setIsFilterOpen(true)}
          startIcon={
            hasActiveFilter ? (
              <Badge variant="dot" color="error" overlap="circular">
                <SvgColor
                  src="/assets/icons/components/ic_newfilter.svg"
                  sx={{
                    color: "text.primary",
                    width: "20px",
                    height: "20px",
                  }}
                />
              </Badge>
            ) : (
              <SvgColor
                src="/assets/icons/components/ic_newfilter.svg"
                sx={{
                  color: "text.primary",
                  height: "20px",
                  width: "20px",
                }}
              />
            )
          }
        >
          Filter
        </Button> */}
      </Stack>
      {/* <LLMFiltersDrawer
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        defaultFilter={defaultFilterBase}
        primaryFilters={primaryTraceFilters}
        setPrimaryFilters={setPrimaryTraceFilters}
        primaryFilterDefinition={primaryFilterDefinition}
        setPrimaryFilterDefinition={setPrimaryFilterDefinition}
        hideLabel
      /> */}
    </>
  );
}

FilterRow.propTypes = {
  primaryTraceFilters: PropTypes.array,
  setPrimaryTraceFilters: PropTypes.func,
  primaryTraceValidatedFilters: PropTypes.array,
};
