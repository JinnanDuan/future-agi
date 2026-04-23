import { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Switch,
  Typography,
  useTheme,
} from "@mui/material";
import Iconify from "src/components/iconify";
import { useUpdateMCPToolGroups } from "src/api/mcp";

const TOOL_GROUP_ICONS = {
  evaluations: "ph:exam-bold",
  datasets: "ph:database-bold",
  experiments: "ph:flask-bold",
  traces: "ph:tree-structure-bold",
  agents: "ph:robot-bold",
  gateway: "ph:arrows-split-bold",
  projects: "ph:folder-bold",
  prompts: "ph:chat-text-bold",
  knowledge: "ph:book-open-bold",
  alerts: "ph:bell-bold",
  users: "ph:users-bold",
  analytics: "ph:chart-line-up-bold",
};

const DEFAULT_TOOL_GROUPS = [
  {
    id: "evaluations",
    name: "Evaluations",
    description: "List, run, and inspect evaluation results",
  },
  {
    id: "datasets",
    name: "Datasets",
    description: "Browse and manage datasets and their rows",
  },
  {
    id: "experiments",
    name: "Experiments",
    description: "View experiment runs, summaries, and comparisons",
  },
  {
    id: "traces",
    name: "Traces",
    description: "Search and analyze traces, spans, and logs",
  },
  {
    id: "agents",
    name: "Agents",
    description: "Manage agent definitions and configurations",
  },
  {
    id: "gateway",
    name: "Gateway",
    description: "View and update gateway routing and model configs",
  },
  {
    id: "projects",
    name: "Projects",
    description: "List and manage projects and workspaces",
  },
  {
    id: "prompts",
    name: "Prompts",
    description: "Browse and version prompt templates",
  },
  {
    id: "knowledge",
    name: "Knowledge Base",
    description: "Query and manage knowledge base documents",
  },
  {
    id: "alerts",
    name: "Alerts",
    description: "View and configure alerting rules",
  },
  {
    id: "users",
    name: "Users & Sessions",
    description: "Inspect user activity and session data",
  },
  {
    id: "analytics",
    name: "Analytics",
    description: "Query usage metrics and performance analytics",
  },
];

ToolGroupSelector.propTypes = {
  config: PropTypes.object,
};

export default function ToolGroupSelector({ config }) {
  const theme = useTheme();
  const updateMutation = useUpdateMCPToolGroups();

  const toolGroups = config?.tool_groups || DEFAULT_TOOL_GROUPS;
  const enabledFromConfig =
    config?.enabled_tool_groups || toolGroups.map((g) => g.id);
  const enabledKey = useMemo(
    () => JSON.stringify(enabledFromConfig),
    [enabledFromConfig],
  );

  const [enabled, setEnabled] = useState(enabledFromConfig);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (enabledFromConfig) {
      setEnabled(enabledFromConfig);
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledKey]);

  const handleToggle = (id) => {
    setEnabled((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      setDirty(true);
      return next;
    });
  };

  const handleSave = () => {
    updateMutation.mutate({ enabled_tool_groups: enabled });
    setDirty(false);
  };

  const allEnabled = enabled.length === toolGroups.length;

  return (
    <Accordion
      variant="outlined"
      disableGutters
      defaultExpanded={false}
      sx={{
        mb: theme.spacing(3),
        borderRadius: "8px !important",
        "&::before": { display: "none" },
        "& .MuiAccordionSummary-root": { borderRadius: 1 },
      }}
    >
      <AccordionSummary
        expandIcon={<Iconify icon="ph:caret-down-bold" width={16} />}
        sx={{ px: 3, py: 0.5 }}
      >
        <Box display="flex" alignItems="center" gap={1.5} flex={1} mr={2}>
          <Iconify
            icon="ph:wrench-bold"
            width={18}
            sx={{ color: "text.secondary" }}
          />
          <Typography
            sx={{
              typography: "s1",
              fontWeight: "fontWeightSemiBold",
              color: "text.primary",
            }}
          >
            Tool Groups
          </Typography>
          <Chip
            label={
              allEnabled
                ? "All enabled"
                : `${enabled.length} of ${toolGroups.length}`
            }
            size="small"
            color={allEnabled ? "success" : "default"}
            variant="outlined"
            sx={{ fontSize: 11, height: 22 }}
          />
          <Typography
            sx={{ typography: "s2", color: "text.disabled", ml: "auto" }}
          >
            Restrict which tools are available to connected clients
          </Typography>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 3, pt: 0, pb: 2.5 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {toolGroups.map((group) => {
            const isEnabled = enabled.includes(group.id);
            return (
              <Box
                key={group.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  py: 1,
                  px: 1,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  opacity: isEnabled ? 1 : 0.5,
                  transition: "opacity 0.15s",
                }}
              >
                <Iconify
                  icon={TOOL_GROUP_ICONS[group.id] || "ph:wrench-bold"}
                  width={16}
                  sx={{
                    color: isEnabled ? "primary.main" : "text.disabled",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    typography: "s2",
                    fontWeight: "fontWeightMedium",
                    color: "text.primary",
                    flex: 1,
                    lineHeight: 1.3,
                  }}
                >
                  {group.name}
                </Typography>
                <Switch
                  size="small"
                  checked={isEnabled}
                  onChange={() => handleToggle(group.id)}
                  sx={{ ml: "auto" }}
                />
              </Box>
            );
          })}
        </Box>

        {dirty && (
          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              variant="contained"
              size="small"
              disabled={updateMutation.isPending}
              onClick={handleSave}
              startIcon={
                updateMutation.isPending ? (
                  <CircularProgress size={14} color="inherit" />
                ) : null
              }
              sx={{ textTransform: "none" }}
            >
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
