import {
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import React, { useEffect } from "react";
import { FormSearchSelectFieldState } from "src/components/FromSearchSelectField";
import SvgColor from "src/components/svg-color";
import { ShowComponent } from "src/components/show";
import {
  useAlertFilterOptions,
  useAlertFilterShallow,
  useAlertFilterStore,
} from "../store/useAlertFilterStore";
import { useProjectList } from "../../LLMTracing/common";
import { useAlertStore } from "../store/useAlertStore";

export default function AlertFilters() {
  const theme = useTheme();
  const mainPage = useAlertStore((state) => state.mainPage);
  const {
    activeFilters,
    addFilter,
    updateFilterTypeByIndex,
    removeFilterByIndex,
    updateFilterValueByIndex,
  } = useAlertFilterShallow();
  const availableFilterOptions = useAlertFilterOptions(mainPage);
  const { data: projectList } = useProjectList("", mainPage);
  const setProjectOptions = useAlertFilterStore((s) => s.setProjectOptions);

  useEffect(() => {
    if (projectList && Array.isArray(projectList)) {
      setProjectOptions(projectList);
    }
  }, [projectList, setProjectOptions]);

  return (
    <Stack
      sx={{
        padding: theme.spacing(2),
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: theme.spacing(0.5),
      }}
    >
      <Stack gap={2}>
        {activeFilters?.map((filter, index) => (
          <Stack key={index} direction={"row"} alignItems={"center"} gap={3}>
            <FormSearchSelectFieldState
              size="small"
              options={availableFilterOptions}
              value={filter?.filterType}
              onChange={(e) =>
                updateFilterTypeByIndex(index, e.target.value, mainPage)
              }
            />
            <Typography>is</Typography>
            <ShowComponent condition={filter?.type === "text"}>
              <TextField
                sx={{
                  width: "200px",
                }}
                label={"Value"}
                placeholder="Value"
                size="small"
                value={filter?.filterValue}
                onChange={(e) =>
                  updateFilterValueByIndex(index, e.target.value)
                }
              />
            </ShowComponent>
            <ShowComponent condition={filter?.type === "dropdown"}>
              <FormSearchSelectFieldState
                size="small"
                label="Value"
                multiple={filter?.multiple}
                checkbox={filter?.multiple}
                options={filter?.options}
                value={filter?.filterValue}
                onChange={(e) =>
                  updateFilterValueByIndex(index, e.target.value)
                }
              />
            </ShowComponent>
            <IconButton onClick={() => removeFilterByIndex(index)}>
              <SvgColor src="/assets/icons/ic_delete.svg" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button
        onClick={() => addFilter(mainPage)}
        sx={{
          typography: "s3",
          fontWeight: "fontWeightMedium",
          color: "text.primary",
          padding: theme.spacing(0.75, 3),
          border: "1px solid",
          borderColor: "text.disabled",
        }}
        size="small"
        startIcon={
          <SvgColor
            sx={{
              height: 16,
              width: 16,
              bgcolor: "text.primary",
            }}
            src="/assets/icons/ic_add.svg"
          />
        }
      >
        Add Filter
      </Button>
    </Stack>
  );
}
