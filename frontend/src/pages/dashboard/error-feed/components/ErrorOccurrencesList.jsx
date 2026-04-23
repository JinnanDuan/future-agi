import React from "react";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { format } from "date-fns";
import Iconify from "src/components/iconify";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

function ScoreBadge({ score }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (score == null)
    return (
      <Typography sx={{ fontSize: "12px", color: "text.disabled" }}>
        —
      </Typography>
    );

  const getColor = (s) => {
    if (s >= 0.7) return theme.palette.success;
    if (s >= 0.5) return theme.palette.warning;
    return theme.palette.error;
  };
  const pal = getColor(score);

  return (
    <Chip
      label={score.toFixed(2)}
      size="small"
      sx={{
        height: 20,
        fontSize: "11px",
        fontWeight: 600,
        borderRadius: "4px",
        bgcolor: isDark
          ? alpha(pal.main, 0.15)
          : pal.alert ?? alpha(pal.main, 0.1),
        color: isDark ? pal.light : pal.dark,
        fontFeatureSettings: "'tnum'",
        "& .MuiChip-label": { px: "6px" },
      }}
    />
  );
}
ScoreBadge.propTypes = { score: PropTypes.number };

export default function ErrorOccurrencesList({ occurrences }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  if (!occurrences?.length) {
    return (
      <Stack alignItems="center" justifyContent="center" py={6} gap={1}>
        <Iconify
          icon="mdi:history"
          width={32}
          sx={{ color: "text.disabled" }}
        />
        <Typography typography="s2" color="text.disabled">
          No occurrences recorded yet
        </Typography>
      </Stack>
    );
  }

  return (
    <TableContainer
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow
            sx={{
              "& .MuiTableCell-head": {
                bgcolor: isDark ? "background.neutral" : "background.default",
                borderBottom: "1px solid",
                borderColor: "divider",
                py: 1,
                px: 1.5,
              },
            }}
          >
            {[
              "Time",
              "Trace ID",
              "User",
              "Session",
              "Eval Score",
              "Latency",
              "",
            ].map((h) => (
              <TableCell key={h}>
                <Typography
                  typography="s3"
                  fontWeight="fontWeightMedium"
                  color="text.secondary"
                >
                  {h}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {occurrences.map((occ) => {
            const ts = new Date(occ.timestamp);
            return (
              <TableRow
                key={occ.id}
                hover
                sx={{
                  height: 44,
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: isDark ? alpha("#fff", 0.03) : alpha("#000", 0.02),
                  },
                  "& .MuiTableCell-body": {
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    px: 1.5,
                    py: 0,
                  },
                }}
              >
                <TableCell>
                  <Tooltip title={ts.toISOString()} arrow>
                    <Typography
                      typography="s3"
                      color="text.secondary"
                      noWrap
                      sx={{ fontFeatureSettings: "'tnum'" }}
                    >
                      {format(ts, "MMM d, HH:mm:ss")}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Typography
                    typography="s3"
                    color="primary.main"
                    sx={{
                      cursor: "pointer",
                      "&:hover": { textDecoration: "underline" },
                      whiteSpace: "nowrap",
                    }}
                  >
                    {occ.traceId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography typography="s3" color="text.secondary" noWrap>
                    {occ.user}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography typography="s3" color="text.disabled" noWrap>
                    {occ.session}
                  </Typography>
                </TableCell>
                <TableCell>
                  <ScoreBadge score={occ.evalScore} />
                </TableCell>
                <TableCell>
                  <Typography
                    typography="s3"
                    color={
                      occ.latencyMs > 3000 ? "warning.dark" : "text.secondary"
                    }
                    sx={{ fontFeatureSettings: "'tnum'" }}
                  >
                    {occ.latencyMs}ms
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Open trace" arrow>
                    <IconButton
                      size="small"
                      sx={{
                        opacity: 0,
                        transition: "opacity 0.15s",
                        ".MuiTableRow-root:hover &": { opacity: 1 },
                      }}
                    >
                      <Iconify icon="mdi:arrow-top-right" width={14} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

ErrorOccurrencesList.propTypes = {
  occurrences: PropTypes.array,
};
