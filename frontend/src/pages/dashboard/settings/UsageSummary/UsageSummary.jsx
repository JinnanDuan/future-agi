import React from "react";
import { Helmet } from "react-helmet-async";
import OSSUpgradeGate from "src/components/oss-upgrade-gate";
import { useDeploymentMode } from "src/hooks/useDeploymentMode";
import UsageSummaryV2 from "src/sections/settings/UsageSummaryV2/UsageSummaryV2";

export default function UsageSummary() {
  const { isOSS } = useDeploymentMode();
  return (
    <>
      <Helmet>
        <title>Usage & Billing</title>
      </Helmet>
      {isOSS ? <OSSUpgradeGate feature="usageSummary" /> : <UsageSummaryV2 />}
    </>
  );
}
