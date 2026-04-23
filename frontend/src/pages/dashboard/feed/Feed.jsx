import React from "react";
import { Helmet } from "react-helmet-async";
import FeedView from "./FeedView";

export default function Feed() {
  return (
    <>
      <Helmet>
        <title>Feed</title>
      </Helmet>
      <FeedView />
    </>
  );
}
