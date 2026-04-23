import PropTypes from "prop-types";
import { IconButton, Stack, Typography } from "@mui/material";
import Iconify from "src/components/iconify";

AnnotateFooter.propTypes = {
  currentPosition: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  hasPrev: PropTypes.bool.isRequired,
  hasNext: PropTypes.bool.isRequired,
  isLoadingNext: PropTypes.bool,
};

export default function AnnotateFooter({
  currentPosition,
  total,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  isLoadingNext = false,
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{
        px: 3,
        py: 1,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <IconButton
        size="small"
        disabled={!hasPrev}
        onClick={onPrev}
        aria-label="Previous"
      >
        <Iconify icon="eva:arrow-ios-back-fill" width={20} />
      </IconButton>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ minWidth: 140, textAlign: "center", userSelect: "none" }}
      >
        Item {currentPosition} of {total}
      </Typography>
      <IconButton
        size="small"
        disabled={!hasNext || isLoadingNext}
        onClick={onNext}
        aria-label="Next"
      >
        <Iconify icon="eva:arrow-ios-forward-fill" width={20} />
      </IconButton>
    </Stack>
  );
}
