import React, { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  Divider,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import Iconify from "src/components/iconify";
import PropTypes from "prop-types";

// ── Score gauge ─────────────────────────────────────────────────────────────
function ScoreBar({ label, score, thresholdLabel }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const getColor = (s) => {
    if (s >= 0.8) return theme.palette.success.main;
    if (s >= 0.6) return theme.palette.warning.dark;
    return theme.palette.error.main;
  };
  const color = getColor(score);
  const pct = Math.round(score * 100);

  return (
    <Stack gap={0.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography
          typography="s2"
          color="text.secondary"
          fontWeight="fontWeightMedium"
        >
          {label}
        </Typography>
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Typography
            sx={{
              fontSize: "13px",
              fontWeight: 700,
              color,
              fontFeatureSettings: "'tnum'",
            }}
          >
            {score.toFixed(2)}
          </Typography>
          {thresholdLabel && (
            <Typography sx={{ fontSize: "11px", color: "text.disabled" }}>
              {thresholdLabel}
            </Typography>
          )}
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 5,
          borderRadius: 2,
          bgcolor: isDark ? alpha(color, 0.15) : alpha(color, 0.12),
          "& .MuiLinearProgress-bar": {
            bgcolor: color,
            borderRadius: 2,
          },
        }}
      />
    </Stack>
  );
}
ScoreBar.propTypes = {
  label: PropTypes.string,
  score: PropTypes.number,
  thresholdLabel: PropTypes.string,
};

// ── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({ role, content }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isUser = role === "user";
  const isSystem = role === "system";

  const config = {
    user: {
      icon: "mdi:account-circle",
      iconColor: isDark ? "#78AAFA" : "#2F7CF7",
      bg: isDark ? alpha("#2F7CF7", 0.1) : alpha("#2F7CF7", 0.06),
      border: isDark ? alpha("#2F7CF7", 0.25) : alpha("#2F7CF7", 0.15),
    },
    system: {
      icon: "mdi:cog-outline",
      iconColor: isDark ? "#938FA3" : "#605C70",
      bg: isDark ? alpha("#938FA3", 0.1) : alpha("#938FA3", 0.06),
      border: isDark ? alpha("#938FA3", 0.25) : alpha("#938FA3", 0.15),
    },
    assistant: {
      icon: "mdi:robot-outline",
      iconColor: isDark ? "#A792FD" : "#7857FC",
      bg: isDark ? alpha("#7857FC", 0.1) : alpha("#7857FC", 0.05),
      border: isDark ? alpha("#7857FC", 0.25) : alpha("#7857FC", 0.15),
    },
  };
  const cfg = config[role] ?? config.user;

  const [expanded, setExpanded] = useState(!isSystem);
  const isLong = content?.length > 200;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: cfg.border,
        borderRadius: 1,
        bgcolor: cfg.bg,
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1.5, py: 0.75, cursor: isLong ? "pointer" : "default" }}
        onClick={() => isLong && setExpanded(!expanded)}
      >
        <Stack direction="row" alignItems="center" gap={0.75}>
          <Iconify icon={cfg.icon} width={14} sx={{ color: cfg.iconColor }} />
          <Typography
            sx={{
              fontSize: "11px",
              fontWeight: 600,
              color: cfg.iconColor,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {role}
          </Typography>
        </Stack>
        {isLong && (
          <Iconify
            icon={expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
            width={14}
            sx={{ color: "text.disabled" }}
          />
        )}
      </Stack>
      <Divider sx={{ borderColor: cfg.border }} />
      <Box sx={{ px: 1.5, py: 1 }}>
        <Typography
          sx={{
            fontSize: "12px",
            lineHeight: 1.6,
            color: "text.primary",
            fontFamily: isSystem
              ? "'Fira Code', 'Cascadia Code', monospace"
              : "inherit",
            ...(isLong && !expanded
              ? {
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }
              : {}),
          }}
        >
          {content}
        </Typography>
      </Box>
    </Box>
  );
}
MessageBubble.propTypes = {
  role: PropTypes.oneOf(["user", "system", "assistant"]),
  content: PropTypes.string,
};

// ── Metric tile ─────────────────────────────────────────────────────────────
function MetricTile({ label, value, icon, highlight }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: isDark ? "background.neutral" : "background.default",
        minWidth: 0,
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.75} mb={0.5}>
        <Iconify icon={icon} width={13} sx={{ color: "text.disabled" }} />
        <Typography
          sx={{
            fontSize: "11px",
            color: "text.disabled",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
      </Stack>
      <Typography
        sx={{
          fontSize: "14px",
          fontWeight: 600,
          color: highlight ?? "text.primary",
          fontFeatureSettings: "'tnum'",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
MetricTile.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  icon: PropTypes.string,
  highlight: PropTypes.string,
};

// ── Ground truth diff ───────────────────────────────────────────────────────
function GroundTruthDiff({ expected, actual }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Stack gap={1}>
      <Box
        sx={{
          p: 1.25,
          borderRadius: 1,
          border: "1px solid",
          borderColor: isDark
            ? alpha(theme.palette.success.main, 0.3)
            : alpha(theme.palette.success.main, 0.2),
          bgcolor: isDark
            ? alpha(theme.palette.success.main, 0.08)
            : alpha(theme.palette.success.main, 0.04),
        }}
      >
        <Stack direction="row" alignItems="center" gap={0.75} mb={0.75}>
          <Iconify
            icon="mdi:check-circle-outline"
            width={13}
            sx={{ color: theme.palette.success.main }}
          />
          <Typography
            sx={{
              fontSize: "11px",
              fontWeight: 600,
              color: theme.palette.success.main,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Expected (Ground Truth)
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontSize: "12px",
            color: "text.primary",
            lineHeight: 1.6,
            fontFamily: "monospace",
          }}
        >
          {expected}
        </Typography>
      </Box>
      <Box
        sx={{
          p: 1.25,
          borderRadius: 1,
          border: "1px solid",
          borderColor: isDark
            ? alpha(theme.palette.error.main, 0.3)
            : alpha(theme.palette.error.main, 0.2),
          bgcolor: isDark
            ? alpha(theme.palette.error.main, 0.08)
            : alpha(theme.palette.error.main, 0.04),
        }}
      >
        <Stack direction="row" alignItems="center" gap={0.75} mb={0.75}>
          <Iconify
            icon="mdi:close-circle-outline"
            width={13}
            sx={{ color: theme.palette.error.main }}
          />
          <Typography
            sx={{
              fontSize: "11px",
              fontWeight: 600,
              color: theme.palette.error.main,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Predicted (Model Output)
          </Typography>
        </Stack>
        <Typography
          sx={{
            fontSize: "12px",
            color: "text.primary",
            lineHeight: 1.6,
            fontFamily: "monospace",
          }}
        >
          {actual}
        </Typography>
      </Box>
    </Stack>
  );
}
GroundTruthDiff.propTypes = {
  expected: PropTypes.string,
  actual: PropTypes.string,
};

// ── Tab panel ───────────────────────────────────────────────────────────────
function TabPanel({ children, value, index }) {
  return value === index ? <Box pt={2}>{children}</Box> : null;
}
TabPanel.propTypes = {
  children: PropTypes.node,
  value: PropTypes.number,
  index: PropTypes.number,
};

// ── Main component ──────────────────────────────────────────────────────────
export default function ErrorAIContext({
  aiContext,
  groundTruth,
  predicted,
  error,
}) {
  const [tab, setTab] = useState(0);
  const theme = useTheme();

  if (!aiContext) {
    return (
      <Stack alignItems="center" justifyContent="center" py={6} gap={1}>
        <Iconify
          icon="mdi:robot-outline"
          width={32}
          sx={{ color: "text.disabled" }}
        />
        <Typography typography="s2" color="text.disabled">
          No AI context available for this error
        </Typography>
      </Stack>
    );
  }

  const metrics = [
    {
      label: "Input tokens",
      value: aiContext.inputTokens?.toLocaleString(),
      icon: "mdi:arrow-right-circle-outline",
    },
    {
      label: "Output tokens",
      value: aiContext.outputTokens?.toLocaleString(),
      icon: "mdi:arrow-left-circle-outline",
    },
    {
      label: "Total tokens",
      value: aiContext.totalTokens?.toLocaleString(),
      icon: "mdi:database-outline",
    },
    {
      label: "Latency",
      value: `${aiContext.latencyMs}ms`,
      icon: "mdi:clock-outline",
      highlight:
        aiContext.latencyMs > 3000 ? theme.palette.warning.dark : undefined,
    },
    {
      label: "Temperature",
      value: aiContext.temperature,
      icon: "mdi:thermometer",
    },
    {
      label: "Stop reason",
      value: aiContext.stopReason,
      icon: "mdi:stop-circle-outline",
    },
  ];

  return (
    <Stack gap={0}>
      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          minHeight: 36,
          borderBottom: "1px solid",
          borderColor: "divider",
          "& .MuiTab-root": {
            fontSize: "12px",
            minHeight: 36,
            py: 0,
            textTransform: "none",
            fontWeight: 500,
          },
        }}
      >
        <Tab label="Eval Scores" />
        <Tab label="Messages" />
        <Tab
          label={
            <Stack direction="row" alignItems="center" gap={0.5}>
              Ground Truth
              {groundTruth && (
                <Chip
                  label="diff"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: "10px",
                    bgcolor: "error.alert",
                    color: "error.dark",
                    borderRadius: "3px",
                    "& .MuiChip-label": { px: "5px" },
                  }}
                />
              )}
            </Stack>
          }
        />
        <Tab label="Metrics" />
      </Tabs>

      {/* Eval scores */}
      <TabPanel value={tab} index={0}>
        <Stack gap={1.5}>
          {Object.entries(aiContext.evalScores ?? {}).map(([key, val]) => {
            const label = key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (s) => s.toUpperCase());
            return (
              <ScoreBar
                key={key}
                label={label}
                score={val}
                thresholdLabel={val < 0.6 ? "↓ below threshold" : undefined}
              />
            );
          })}
        </Stack>
      </TabPanel>

      {/* Messages */}
      <TabPanel value={tab} index={1}>
        <Stack gap={1}>
          {aiContext.systemPrompt && (
            <MessageBubble role="system" content={aiContext.systemPrompt} />
          )}
          {aiContext.userMessage && (
            <MessageBubble role="user" content={aiContext.userMessage} />
          )}
          {aiContext.assistantMessage && (
            <MessageBubble
              role="assistant"
              content={aiContext.assistantMessage}
            />
          )}
        </Stack>
      </TabPanel>

      {/* Ground truth */}
      <TabPanel value={tab} index={2}>
        {groundTruth && predicted ? (
          <GroundTruthDiff expected={groundTruth} actual={predicted} />
        ) : (
          <Stack alignItems="center" justifyContent="center" py={4} gap={1}>
            <Typography typography="s2" color="text.disabled">
              No ground truth data for this error type
            </Typography>
          </Stack>
        )}
      </TabPanel>

      {/* Metrics */}
      <TabPanel value={tab} index={3}>
        <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1}>
          {metrics.map((m) => (
            <MetricTile key={m.label} {...m} />
          ))}
        </Box>
      </TabPanel>
    </Stack>
  );
}

ErrorAIContext.propTypes = {
  aiContext: PropTypes.object,
  groundTruth: PropTypes.string,
  predicted: PropTypes.string,
  error: PropTypes.object,
};
