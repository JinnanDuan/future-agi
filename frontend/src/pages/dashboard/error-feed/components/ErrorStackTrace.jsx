import React, { useState } from "react";
import {
  Box,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import Iconify from "src/components/iconify";
import PropTypes from "prop-types";

function CodeLine({ line, isError, lineNo }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      component="div"
      sx={{
        display: "flex",
        alignItems: "stretch",
        bgcolor: isError
          ? isDark
            ? alpha("#DB2F2D", 0.12)
            : alpha("#DB2F2D", 0.06)
          : "transparent",
        borderLeft: isError ? "2px solid #DB2F2D" : "2px solid transparent",
        "&:hover": {
          bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02),
        },
      }}
    >
      {/* Line number */}
      <Box
        sx={{
          minWidth: 44,
          textAlign: "right",
          pr: 1.5,
          pl: 1,
          color: isError ? (isDark ? "#E87876" : "#DB2F2D") : "text.disabled",
          fontSize: "11px",
          fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          lineHeight: "20px",
          userSelect: "none",
          opacity: 0.7,
        }}
      >
        {lineNo}
      </Box>
      {/* Code */}
      <Box
        component="pre"
        sx={{
          m: 0,
          flex: 1,
          fontSize: "12px",
          fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          lineHeight: "20px",
          color: isError ? (isDark ? "#FCA5A5" : "#A42322") : "text.primary",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "pre",
          pr: 2,
        }}
      >
        {line}
      </Box>
    </Box>
  );
}
CodeLine.propTypes = {
  line: PropTypes.string,
  isError: PropTypes.bool,
  lineNo: PropTypes.number,
};

function FrameCard({ frame, index, defaultOpen }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(defaultOpen);

  const isApp = frame.isApp;
  const shortFile = frame.filename.split("/").slice(-2).join("/");

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: isApp
          ? isDark
            ? alpha(theme.palette.primary.main, 0.35)
            : alpha(theme.palette.primary.main, 0.2)
          : "divider",
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: isDark ? "background.neutral" : "background.paper",
      }}
    >
      {/* Frame header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: 1.5,
          py: 1,
          cursor: "pointer",
          bgcolor: isApp
            ? isDark
              ? alpha(theme.palette.primary.main, 0.08)
              : alpha(theme.palette.primary.main, 0.04)
            : isDark
              ? "background.accent"
              : "background.default",
          "&:hover": {
            bgcolor: isDark ? alpha("#fff", 0.04) : alpha("#000", 0.03),
          },
        }}
        onClick={() => setOpen(!open)}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography
            sx={{
              fontSize: "11px",
              fontWeight: 600,
              color: "text.disabled",
              fontFamily: "monospace",
              opacity: 0.7,
            }}
          >
            #{index + 1}
          </Typography>
          {isApp && (
            <Chip
              label="app"
              size="small"
              sx={{
                height: 16,
                fontSize: "10px",
                fontWeight: 600,
                bgcolor: isDark
                  ? alpha(theme.palette.primary.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
                borderRadius: "3px",
                "& .MuiChip-label": { px: "5px" },
              }}
            />
          )}
          <Typography
            sx={{
              fontSize: "12px",
              fontWeight: 600,
              color: "text.primary",
              fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            }}
          >
            {frame.function}
          </Typography>
          <Typography
            sx={{
              fontSize: "11px",
              color: "text.disabled",
              fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            }}
          >
            {shortFile}:{frame.lineno}
          </Typography>
        </Stack>
        <Iconify
          icon={open ? "mdi:chevron-up" : "mdi:chevron-down"}
          width={16}
          sx={{ color: "text.disabled", flexShrink: 0 }}
        />
      </Stack>

      {/* Code context */}
      <Collapse in={open}>
        <Divider sx={{ borderColor: "divider" }} />
        <Box
          sx={{
            bgcolor: isDark ? alpha("#000", 0.25) : alpha("#000", 0.02),
            overflowX: "auto",
            py: 0.5,
          }}
        >
          {frame.context?.map((ctx) => (
            <CodeLine
              key={ctx.line}
              line={ctx.code}
              isError={ctx.isError}
              lineNo={ctx.line}
            />
          ))}
        </Box>
        {/* Full path */}
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            bgcolor: isDark ? "background.accent" : "background.default",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            sx={{
              fontSize: "11px",
              color: "text.disabled",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {frame.filename}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
FrameCard.propTypes = {
  frame: PropTypes.object,
  index: PropTypes.number,
  defaultOpen: PropTypes.bool,
};

export default function ErrorStackTrace({ stackTrace, errorName, errorType }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = stackTrace
      ?.map((f) => `  at ${f.function} (${f.filename}:${f.lineno})`)
      .join("\n");
    navigator.clipboard.writeText(`${errorName}\n${text}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!stackTrace?.length) {
    return (
      <Stack alignItems="center" justifyContent="center" py={6} gap={1}>
        <Iconify
          icon="mdi:code-not-equal"
          width={32}
          sx={{ color: "text.disabled" }}
        />
        <Typography typography="s2" color="text.disabled">
          No stack trace available for this error
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack gap={1.5}>
      {/* Exception header */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 1,
          border: "1px solid",
          borderColor: isDark ? alpha("#DB2F2D", 0.3) : alpha("#DB2F2D", 0.2),
          bgcolor: isDark ? alpha("#DB2F2D", 0.08) : alpha("#DB2F2D", 0.04),
        }}
      >
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          gap={1}
        >
          <Stack gap={0.5}>
            <Typography
              sx={{
                fontSize: "13px",
                fontWeight: 700,
                color: isDark ? "#FCA5A5" : "#A42322",
                fontFamily:
                  "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
              }}
            >
              {errorType}
            </Typography>
            <Typography
              sx={{
                fontSize: "12px",
                color: "text.secondary",
                lineHeight: 1.5,
                fontFamily:
                  "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
              }}
            >
              {errorName}
            </Typography>
          </Stack>
          <Tooltip title={copied ? "Copied!" : "Copy stack trace"} arrow>
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{
                flexShrink: 0,
                border: "1px solid",
                borderColor: isDark
                  ? alpha("#DB2F2D", 0.3)
                  : alpha("#DB2F2D", 0.2),
                borderRadius: "6px",
              }}
            >
              <Iconify
                icon={copied ? "mdi:check" : "mdi:content-copy"}
                width={14}
                sx={{ color: isDark ? "#E87876" : "#A42322" }}
              />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filter: show app frames only */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography
          typography="s2"
          fontWeight="fontWeightMedium"
          color="text.secondary"
        >
          {stackTrace.length} frames
        </Typography>
        <Chip
          label={`${stackTrace.filter((f) => f.isApp).length} app frames`}
          size="small"
          icon={<Iconify icon="mdi:filter-outline" width={12} />}
          sx={{
            height: 22,
            fontSize: "11px",
            borderRadius: "4px",
            bgcolor: "action.hover",
            color: "text.secondary",
            "& .MuiChip-icon": { color: "text.disabled", ml: "6px" },
          }}
        />
      </Stack>

      {/* Frames */}
      <Stack gap={0.75}>
        {stackTrace.map((frame, i) => (
          <FrameCard
            key={frame.id}
            frame={frame}
            index={i}
            defaultOpen={i === 0}
          />
        ))}
      </Stack>
    </Stack>
  );
}

ErrorStackTrace.propTypes = {
  stackTrace: PropTypes.array,
  errorName: PropTypes.string,
  errorType: PropTypes.string,
};
