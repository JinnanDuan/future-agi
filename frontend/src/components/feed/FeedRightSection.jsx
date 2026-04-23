import { Box, Stack, Typography, useTheme } from "@mui/material";
import PropTypes from "prop-types";
import React from "react";
// import { priorityMapper } from "./common";
import HeadingAndSubHeading from "../HeadingAndSubheading/HeadingAndSubheading";
// import Thread from "./Thread";

// const comments = [
//   {
//     id: 1,
//     status: "unresolved",
//     title: "Unresolved",
//     author: "Sanjana",
//     timestamp: "6 days ago",
//     hasAvatar: true,
//   },
//   {
//     id: 2,
//     status: "resolved",
//     title: "Resolved",
//     author: "Sanjana",
//     timestamp: "6 days ago",
//   },
//   {
//     id: 3,
//     status: "ongoing",
//     title: "Marked as Ongoing",
//     author: "Sanjana",
//     timestamp: "6 days ago",
//   },
//   {
//     id: 4,
//     status: "first-seen",
//     title: "First seen",
//     subtitle: "Marked as urgent",
//     timestamp: "6 days ago",
//   },
// ];

export default function FeedRightSection({
  sx,
  // priority,
  // assignee = [],
  lastSeenHuman,
  firstSeenHuman,
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        ...sx,
        padding: theme.spacing(2),
      }}
    >
      <Stack direction={"column"} gap={theme.spacing(2)}>
        {/* <HeadingAndSubHeading
          heading={
            <Typography
              typography={"s2"}
              color={"text.disabled"}
              fontWeight={"fontWeightRegular"}
            >
              Priority
            </Typography>
          }
          subHeading={
            <Stack
              direction="row"
              sx={{
                bgcolor: priorityMapper?.[priority]?.bgColor,
                padding: theme.spacing(0.5, 1),
                gap: theme.spacing(1),
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              <Box
                component="img"
                sx={{ height: 20, width: 20 }}
                src={priorityMapper?.[priority]?.icon}
              />
              <Typography
                typography="s1"
                fontWeight="fontWeightMedium"
                color={theme.palette.common.black}
                sx={{ textTransform: "capitalize" }}
              >
                {priority}
              </Typography>
            </Stack>
          }
        /> */}
        {/* <FeedDetailCard
          label={"Assignee"}
          content={
            <Typography
              typography={"s1"}
              fontWeight={"fontWeightRegular"}
              color={"text.primary"}
            >
              {assignee?.join(", ")}
            </Typography>
          }
        /> */}
        {/* <Divider
          sx={{
            borderColor: "divider",
          }}
        /> */}
        <HeadingAndSubHeading
          heading={
            <Typography
              typography={"s2"}
              color={"text.disabled"}
              fontWeight={"fontWeightRegular"}
            >
              Last seen
            </Typography>
          }
          subHeading={
            <Typography
              typography={"s1"}
              fontWeight={"fontWeightRegular"}
              color={"text.primary"}
            >
              {lastSeenHuman}
            </Typography>
          }
        />
        <HeadingAndSubHeading
          heading={
            <Typography
              typography={"s2"}
              color={"text.disabled"}
              fontWeight={"fontWeightRegular"}
            >
              First seen
            </Typography>
          }
          subHeading={
            <Typography
              typography={"s1"}
              fontWeight={"fontWeightRegular"}
              color={"text.primary"}
            >
              {firstSeenHuman}
            </Typography>
          }
        />
        {/* <FeedDetailCard
          label={"Activity"}
          content={
            <Thread
              sx={{
                padding: theme.spacing(1.5),
              }}
              data={comments}
            />
          }
        /> */}
      </Stack>
    </Box>
  );
}

FeedRightSection.propTypes = {
  sx: PropTypes.object,
  priority: PropTypes.oneOf(["high", "low", "mid", "urgent"]),
  assignee: PropTypes.array,
  lastSeenHuman: PropTypes.string,
  firstSeenHuman: PropTypes.string,
};
