import PropTypes from "prop-types";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Checkbox,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import Iconify from "src/components/iconify";
import { useAuthContext } from "src/auth/hooks";
import { useOrgMembersInfinite } from "src/api/annotation-queues/annotation-queues";
import { useDebounce } from "src/hooks/use-debounce";

const ROLE_OPTIONS = [
  { value: "annotator", label: "Annotator" },
  { value: "reviewer", label: "Reviewer" },
  { value: "manager", label: "Manager" },
];

AnnotatorPicker.propTypes = {
  value: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.string.isRequired,
      role: PropTypes.string.isRequired,
    }),
  ),
  onChange: PropTypes.func.isRequired,
  creatorId: PropTypes.string,
  isManager: PropTypes.bool,
};

export default function AnnotatorPicker({
  value = [],
  onChange,
  creatorId,
  isManager = true,
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const { user } = useAuthContext();
  const scrollRef = useRef(null);

  const {
    data: members = [],
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrgMembersInfinite(user?.organization?.id, debouncedSearch);

  const selectedMap = useMemo(
    () => new Map(value.map((a) => [a.userId, a.role])),
    [value],
  );

  const handleToggle = (userId) => {
    if (selectedMap.has(userId)) {
      onChange(value.filter((a) => a.userId !== userId));
    } else {
      onChange([...value, { userId, role: "annotator" }]);
    }
  };

  const handleRoleChange = (userId, role) => {
    onChange(value.map((a) => (a.userId === userId ? { ...a, role } : a)));
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {/* Search */}
      <TextField
        size="small"
        fullWidth
        placeholder="Search members..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify
                icon="eva:search-fill"
                sx={{ color: "text.disabled", width: 16, height: 16 }}
              />
            </InputAdornment>
          ),
        }}
      />

      {/* Checkbox list */}
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          maxHeight: 220,
          overflow: "auto",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 0.5,
        }}
      >
        {members.map((m) => {
          const isSelected = selectedMap.has(m.id);
          const isCreator = creatorId && m.id === creatorId;
          // Creator is always selected as Manager; role and selection are locked
          const currentRole = isCreator
            ? "manager"
            : selectedMap.get(m.id) || "annotator";
          const rowReadOnly = !isManager || isCreator;
          return (
            <Box
              key={m.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1,
                py: 0.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderBottom: 0 },
                bgcolor: isSelected ? "action.selected" : "transparent",
                "&:hover": {
                  bgcolor: isSelected
                    ? "action.selected"
                    : !rowReadOnly
                      ? "action.hover"
                      : "transparent",
                },
              }}
            >
              <Checkbox
                checked={isCreator || isSelected}
                onChange={() => !rowReadOnly && handleToggle(m.id)}
                disabled={rowReadOnly}
                size="small"
                sx={{ p: 0.5 }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" noWrap>
                  {m.name || "Unnamed"}
                  {isCreator && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.disabled"
                      sx={{ ml: 0.5 }}
                    >
                      (creator)
                    </Typography>
                  )}
                </Typography>
                {m.email && (
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {m.email}
                  </Typography>
                )}
              </Box>

              <Select
                size="small"
                variant="standard"
                value={currentRole}
                disabled={rowReadOnly}
                onChange={(e) => {
                  e.stopPropagation();
                  if (!rowReadOnly) handleRoleChange(m.id, e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{ fontSize: 12, minWidth: 90 }}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    sx={{ fontSize: 12 }}
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          );
        })}
        {members.length === 0 && !isFetchingNextPage && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: "center" }}
          >
            No members found
          </Typography>
        )}
        {isFetchingNextPage && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
