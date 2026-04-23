import React, { useEffect, useMemo, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { AgGridReact } from "ag-grid-react";
import { useFeedStore } from "src/pages/dashboard/feed/store/store";
import { useAgThemeWith } from "src/hooks/use-ag-theme";
import { AG_THEME_OVERRIDES } from "src/theme/ag-theme";
import { useDebounce } from "src/hooks/use-debounce";
import axios, { endpoints } from "src/utils/axios";
import logger from "src/utils/logger";
import PropTypes from "prop-types";
import { useNavigate } from "react-router";
import NoRowsOverlay from "src/sections/project-detail/CompareDrawer/NoRowsOverlay";
import { APP_CONSTANTS } from "src/utils/constants";

const defaultColDef = {
  lockVisible: true,
  sortable: false,
  filter: false,
  resizable: true,
  suppressMultiSort: true,
  suppressHeaderMenuButton: true,
  suppressHeaderContextMenu: true,
};

const gridOptions = {
  pagination: true,
  rowSelection: { mode: "multiRow" },
  paginationAutoPageSize: true,
};

export default function FeedTable() {
  const agTheme = useAgThemeWith(AG_THEME_OVERRIDES.noHeaderBorder);
  const { columnDefs, setGridRef, searchQuery, selectedProject, selectedDay } =
    useFeedStore();
  const navigate = useNavigate();

  const agGridRef = useRef();
  const debouncedSearchTerm = useDebounce(searchQuery, 300);

  const dataSource = useMemo(
    () => ({
      getRows: async (params) => {
        params.api.hideOverlay();
        const { request } = params;
        const pageSize = request.endRow - request.startRow;
        const pageNumber = Math.floor(request.startRow / pageSize);

        // const sortModel = request?.sortModel?.[0] || {};
        // const { colId: sort_by, sort: sort_direction } = sortModel;

        try {
          const filterParams = {};
          if (selectedProject) {
            filterParams["project_id"] = selectedProject;
          }
          if (selectedDay) {
            filterParams["days"] = selectedDay;
          }
          if (debouncedSearchTerm.trim() !== "") {
            filterParams["search"] = debouncedSearchTerm;
          }
          const urlParams = {
            page_number: pageNumber,
            page_size: pageSize,
            ...filterParams,
          };

          const { data } = await axios.get(endpoints.feed.getFeed, {
            params: urlParams,
          });
          const { result } = data;

          const rows = result?.clusters ?? [];
          // keep track of all the pages
          //   setCurrentPageAlertList((prev) => [...prev, ...rows]);
          //   setTotalRows(data?.result?.metadata?.totalRows ?? 0);
          //   const excludedKeys = ["created_at", "updated_at"];

          //   const filteredColumns = data?.result?.columnConfig?.filter(
          //     (col) => !excludedKeys.includes(col.id),
          //   );

          //   setColumns(filteredColumns);
          //   setHasData(
          //     rows.length > 0 || debouncedSearchTerm || extractedFilterObject,
          //   );

          params.success({
            rowData: rows,
            rowCount: result?.pagination?.total_count,
          });

          if (pageNumber === 0 && rows?.length === 0) {
            params.api?.showNoRowsOverlay();
          } else {
            params.api.hideOverlay();
          }

          // const displayedNodes = [];
          // params.api.forEachNode((node) => {
          //   if (node.displayed) {
          //     displayedNodes.push(node);
          //   }
          // });
        } catch (error) {
          params.fail();
          logger.error("failed to fetch table data", error);
          params.api?.showNoRowsOverlay();
          //   setCurrentPageAlertList([]);
          //   handleCancelSelection();
        }
      },
      getRowId: (data) => data.id,
    }),
    [selectedProject, selectedDay, debouncedSearchTerm],
  );

  useEffect(() => {
    if (agGridRef.current) {
      setGridRef(agGridRef);
    }
  }, [setGridRef]);

  return (
    <Box className="ag-theme-quartz" sx={{ height: "calc(100vh - 215px)" }}>
      <AgGridReact
        rowHeight={65}
        ref={agGridRef}
        columnDefs={columnDefs}
        theme={agTheme}
        defaultColDef={defaultColDef}
        {...gridOptions}
        serverSideInitialRowCount={10}
        rowModelType="serverSide"
        serverSideStoreType="partial"
        suppressContextMenu={true}
        cacheBlockSize={10}
        serverSideDatasource={dataSource}
        suppressServerSideFullWidthLoadingRow={true}
        noRowsOverlayComponent={() =>
          NoRowsOverlay(
            <Typography
              typography="m3"
              color="text.primary"
              fontWeight="fontWeightMedium"
            >
              Everything seems good for last {selectedDay}{" "}
              {selectedDay < 2 ? "day" : "days"}!
            </Typography>,
          )
        }
        // onRowSelected={onSelectionChanged}
        getRowId={({ data }) => data?.clusterId}
        isApplyServerSideTransaction={() => true}
        suppressRowTransform={true}
        suppressAnimationFrame={true}
        onCellClicked={(event) => {
          if (
            event?.column?.getColId() === APP_CONSTANTS.AG_GRID_SELECTION_COLUMN
          ) {
            // pass
          } else {
            if (event?.data?.clusterId) {
              navigate(`${event.data?.clusterId}`);
            }
          }
        }}
      />
    </Box>
  );
}

FeedTable.propTypes = {
  filters: PropTypes.array,
};
