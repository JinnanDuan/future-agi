import React, { useMemo, forwardRef } from "react";
import { Box } from "@mui/material";
import SessionGrid from "../../SessionsView/Session-grid";
import PropTypes from "prop-types";
import { useUrlState } from "src/routes/hooks/use-url-state";
import useTraceSessionStore from "../Store/useTraceSessionStore";
import { useParams } from "react-router";

const UserSessionsTab = forwardRef(
  ({ sessionColumns, setSessionColumns, sessionUpdateObj, filters }, ref) => {
    const [selectedProjectId] = useUrlState("projectId", null);
    const { cellHeight } = useTraceSessionStore();
    const { userId: selectedUserId } = useParams();

    const filtersWithUserId = useMemo(() => {
      const hasUserIdFilter = filters?.some((f) => f.columnId === "user_id");

      if (hasUserIdFilter || !selectedUserId) {
        return filters;
      }

      return [
        ...filters,
        {
          columnId: "user_id",
          filterConfig: {
            filterOp: "equals",
            filterType: "text",
            filterValue: selectedUserId,
          },
        },
      ];
    }, [filters, selectedUserId]);

    return (
      <Box
        sx={{
          height: "50vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          display="flex"
          flexDirection="column"
          sx={{
            // paddingY: theme.spacing(2),
            flex: 1,
            height: "100%",
          }}
        >
          <SessionGrid
            columns={sessionColumns}
            setColumns={setSessionColumns}
            ref={ref}
            updateObj={sessionUpdateObj}
            filters={filtersWithUserId}
            projectId={selectedProjectId}
            cellHeight={cellHeight}
          />
        </Box>
      </Box>
    );
  },
);
UserSessionsTab.displayName = "UserSessionsTab";
UserSessionsTab.propTypes = {
  sessionColumns: PropTypes.array,
  setSessionColumns: PropTypes.func,
  sessionUpdateObj: PropTypes.object,
  filters: PropTypes.array,
};

export default UserSessionsTab;
