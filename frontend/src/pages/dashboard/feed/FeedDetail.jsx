import React from "react";
import { Helmet } from "react-helmet-async";
import FeedDetailView from "./FeedDetailView";

export default function FeedDetail() {
  return (
    <>
      <Helmet>
        <title>Feed</title>
      </Helmet>
      <FeedDetailView />
    </>
  );
}
