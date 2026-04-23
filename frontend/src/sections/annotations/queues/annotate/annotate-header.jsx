/* eslint-disable react/prop-types */
import PropTypes from "prop-types";
import {
  Box,
  Button,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Iconify from "src/components/iconify";

AnnotateHeader.propTypes = {
  queueName: PropTypes.string,
  progress: PropTypes.shape({
    total: PropTypes.number,
    completed: PropTypes.number,
    userProgress: PropTypes.shape({
      total: PropTypes.number,
      completed: PropTypes.number,
    }),
  }),
  onBack: PropTypes.func.isRequired,
  onSkip: PropTypes.func.isRequired,
  isSkipping: PropTypes.bool,
  isReviewMode: PropTypes.bool,
  isAssignedToOther: PropTypes.bool,
};

export default function AnnotateHeader({
  queueName,
  progress,
  onBack,
  onSkip,
  isSkipping,
  isReviewMode,
  isAssignedToOther,
}) {
  const userProgress = progress?.user_progress;
  const hasUserProgress = userProgress && userProgress.total > 0;

  // Show user's own progress if they have assigned items, otherwise overall
  const displayTotal = hasUserProgress
    ? userProgress.total
    : progress?.total ?? 0;
  const displayCompleted = hasUserProgress
    ? userProgress.completed
    : progress?.completed ?? 0;
  const pct =
    displayTotal > 0 ? Math.round((displayCompleted / displayTotal) * 100) : 0;
  const progressLabel = hasUserProgress ? "Your Progress" : "Overall Progress";

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{
        px: 3,
        py: 1.5,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={onBack} size="small">
          <Iconify icon="eva:arrow-back-fill" />
        </IconButton>
        <Typography variant="h6">{queueName || "Queue"}</Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={2}>
        <Box sx={{ minWidth: 180 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mb: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              {progressLabel}
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {displayCompleted}/{displayTotal} ({pct}%)
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
        {!isReviewMode && (
          <Tooltip title="Press S to skip">
            <span>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={onSkip}
                disabled={isSkipping || isAssignedToOther}
                startIcon={<Iconify icon="eva:skip-forward-fill" width={16} />}
              >
                Skip
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  );
}
