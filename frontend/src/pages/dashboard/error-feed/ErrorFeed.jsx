import React from "react";
import OSSUpgradeGate from "src/components/oss-upgrade-gate";
import { useDeploymentMode } from "src/hooks/useDeploymentMode";
import ErrorFeedView from "./ErrorFeedView";

export default function ErrorFeed() {
  const { isOSS } = useDeploymentMode();
  if (isOSS) {
    return <OSSUpgradeGate feature="errorFeed" />;
  }
  return <ErrorFeedView />;
}
