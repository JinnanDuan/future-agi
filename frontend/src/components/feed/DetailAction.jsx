import React from "react";
import {
  // Box,
  Button,
  // Divider,
  IconButton,
  // Menu,
  // MenuItem,
  Stack,
  // Typography,
  useTheme,
} from "@mui/material";
// import FormSearchField from "../../../../components/FormSearchField/FormSearchField";
import SvgColor from "src/components/svg-color";
import CustomTooltip from "src/components/tooltip/CustomTooltip";
import FormSearchSelectFieldState from "src/components/FromSearchSelectField/FormSearchSelectFieldState";
import { timeFilters } from "src/components/feed/common";
import PropTypes from "prop-types";
import { useFeedDetailStore } from "src/pages/dashboard/feed/store/store";
import { useQueryClient } from "@tanstack/react-query";

// const deleteOptions = [
//   {
//     icon: "/assets/icons/ic_delete.svg",
//     label: "Delete",
//   },
//   {
//     icon: "/assets/icons/ic_delete_discard.svg",
//     label: "Delete and discard future events",
//   },
// ];

// const DeleteIconButton = () => {
//   const theme = useTheme();
//   const [anchorEl, setAnchorEl] = useState(null);
//   const open = Boolean(anchorEl);

//   const handleOpen = (e) => setAnchorEl(e.currentTarget);
//   const handleClose = () => setAnchorEl(null);
//   return (
//     <>
//       <IconButton
//         onClick={handleOpen}
//         size="small"
//         sx={{
//           border: "1px solid",
//           borderColor: "divider",
//           borderRadius: theme.spacing(0.5),
//         }}
//       >
//         <SvgColor
//           src="/assets/icons/navbar/ic_ellipsis.svg"
//           sx={{
//             height: 20,
//             width: 20,
//             color: "text.primary",
//           }}
//         />
//       </IconButton>
//       <Menu
//         anchorEl={anchorEl}
//         open={open}
//         onClose={handleClose}
//         anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
//         transformOrigin={{ horizontal: "left", vertical: "top" }}
//         PaperProps={{
//           elevation: 3,
//           sx: { borderRadius: 1, px: theme.spacing(1), minWidth: 200 },
//         }}
//       >
//         {deleteOptions?.map((option, index) => (
//           <MenuItem
//             key={index}
//             onClick={() => {
//               // handleItemClick(option)
//               handleClose();
//             }}
//             sx={{
//               display: "flex",
//               alignItems: "center",
//               gap: 1,
//               transition: "all 0.2s ease-in-out",
//               "& .action-label": {
//                 transition: "all 0.2s ease-in-out",
//               },
//               "&:hover, &:active": {
//                 fontWeight: "fontWeightMedium",
//                 "& .action-label": {
//                   fontWeight: "fontWeightMedium",
//                 },
//               },
//             }}
//           >
//             <Stack
//               direction="row"
//               sx={{
//                 padding: theme.spacing(0.5, 1),
//                 gap: theme.spacing(1),
//                 cursor: "pointer",
//                 width: "fit-content",
//               }}
//             >
//               <SvgColor
//                 sx={{ height: 20, width: 20, color: "red.500" }}
//                 src={option.icon}
//               />
//               <Typography
//                 typography="s2"
//                 fontWeight="fontWeightRegular"
//                 color={"red.500"}
//                 sx={{ textTransform: "capitalize" }}
//               >
//                 {option.label}
//               </Typography>
//             </Stack>
//           </MenuItem>
//         ))}
//       </Menu>
//     </>
//   );
// };

export default function DetailAction({ feedDetails }) {
  const { traceNavigation } = feedDetails ?? {};
  const { setCurrentTraceId } = useFeedDetailStore();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const { timeRange, setTimeRange } = useFeedDetailStore();

  const handleTraceNavigation = (traceId) => {
    setCurrentTraceId(traceId);
    queryClient.invalidateQueries({ queryKey: ["trace-detail", traceId] });
  };

  return (
    <Stack
      direction={"row"}
      alignItems={"center"}
      justifyContent={"space-between"}
    >
      {/* <Stack direction={"row"} gap={theme.spacing(1.5)} alignItems={"center"}>
        <Button size="small" color="primary" variant="contained">
          Resolve
        </Button>
        <Button
          size="small"
          variant="outlined"
          endIcon={
            <SvgColor
              src={"/assets/icons/custom/lucide--chevron-down.svg"}
              sx={{
                color: "text.primary",
                ml: theme.spacing(0.5),
              }}
            />
          }
        >
          Archive
        </Button>
        <IconButton
          size="small"
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: theme.spacing(0.5),
          }}
        >
          <SvgColor
            src="/assets/icons/navbar/ic_bell.svg"
            sx={{
              height: 20,
              width: 20,
              color: "text.primary",
            }}
          />
        </IconButton>
        <DeleteIconButton />
      </Stack>
      <Divider sx={{ borderColor: "divider" }} /> */}
      <Stack direction={"row"} gap={theme.spacing(1.5)} alignItems={"center"}>
        <FormSearchSelectFieldState
          size="small"
          label="Filter Time range"
          options={[...timeFilters, { label: "Since first seen", value: null }]}
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        />

        {/* <FormSearchField
          size="small"
          placeholder="Search"
          sx={{ minWidth: "360px" }}
          InputProps={{
            sx: {
              height: 34,
            },
          }}
          searchQuery={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        /> */}
        {/* <Button
          variant="outlined"
          size="small"
          //   onClick={() => setIsFilterOpen(true)}
          startIcon={
            hasActiveFilter ? (
              <Badge variant="dot" color="error" overlap="circular">
                <SvgColor
                  src="/assets/icons/components/ic_newfilter.svg"
                  sx={{
                    color: "text.primary",
                    width: "20px",
                    height: "20px",
                  }}
                />
              </Badge>
            ) : (
              <SvgColor
                src="/assets/icons/components/ic_newfilter.svg"
                sx={{
                  color: "text.primary",
                  height: "20px",
                  width: "20px",
                }}
              />
            )
          }
        >
          Filter
        </Button> */}
      </Stack>
      <Stack direction={"row"} alignItems={"center"} gap={1}>
        <CustomTooltip show title="Prev Event" arrow size="small">
          <IconButton
            sx={{
              borderRadius: 1,
            }}
            onClick={() => {
              handleTraceNavigation(traceNavigation?.previous);
            }}
            disabled={!traceNavigation?.previous}
          >
            <SvgColor
              // @ts-ignore
              src="/assets/icons/custom/lucide--chevron-right.svg"
              sx={{
                height: 20,
                width: 20,
                transform: "rotate(180deg)",
              }}
            />
          </IconButton>
        </CustomTooltip>
        <CustomTooltip show title="Next Event" arrow size="small">
          <IconButton
            sx={{
              borderRadius: 1,
            }}
            onClick={() => {
              handleTraceNavigation(traceNavigation?.next);
            }}
            disabled={!traceNavigation?.next}
          >
            <SvgColor
              // @ts-ignore
              src="/assets/icons/custom/lucide--chevron-right.svg"
              sx={{
                height: 20,
                width: 20,
              }}
            />
          </IconButton>
        </CustomTooltip>
        <CustomTooltip
          show
          title="Earliest event matching filter"
          arrow
          size="small"
        >
          <Button
            size="small"
            variant="outlined"
            sx={{
              borderRadius: 0.75,
            }}
            disabled={!traceNavigation?.first}
            onClick={() => {
              handleTraceNavigation(traceNavigation?.first);
            }}
          >
            First
          </Button>
        </CustomTooltip>
        <CustomTooltip
          show
          title="Newest event matching filter"
          arrow
          size="small"
        >
          <Button
            size="small"
            variant="outlined"
            sx={{
              borderRadius: 0.75,
            }}
            disabled={!traceNavigation?.latest}
            onClick={() => {
              handleTraceNavigation(traceNavigation?.latest);
            }}
          >
            Latest
          </Button>
        </CustomTooltip>
      </Stack>
    </Stack>
  );
}

DetailAction.propTypes = {
  feedDetails: PropTypes.object,
};
