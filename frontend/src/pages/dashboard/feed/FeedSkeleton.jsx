import { Skeleton, Stack } from "@mui/material";
import React from "react";

const FeedSkeleton = () => {
  return (
    <Stack direction={"column"} gap={2} width={"100%"}>
      <Skeleton
        height={40}
        width={"30%"}
        variant="rectangular"
        sx={{ borderRadius: 0.5 }}
      />
      <Skeleton
        height={40}
        width={"30%"}
        variant="rectangular"
        sx={{ borderRadius: 0.5 }}
      />

      <Stack justifyContent={"space-between"} width={"100%"} direction={"row"}>
        <Skeleton
          width={"30%"}
          height={40}
          variant="rectangular"
          sx={{ borderRadius: 0.5 }}
        />
        <Skeleton
          width={"30%"}
          height={40}
          variant="rectangular"
          sx={{ borderRadius: 0.5 }}
        />
      </Stack>
      <Skeleton height={200} variant="rectangular" sx={{ borderRadius: 0.5 }} />
      <Skeleton height={350} variant="rectangular" sx={{ borderRadius: 0.5 }} />
      <Skeleton height={500} variant="rectangular" sx={{ borderRadius: 0.5 }} />
    </Stack>
  );
};

export default FeedSkeleton;
