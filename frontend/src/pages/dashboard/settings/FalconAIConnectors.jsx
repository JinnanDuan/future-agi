import { Helmet } from "react-helmet-async";
import ConnectorSettingsPage from "src/sections/settings/falcon-ai-connectors/ConnectorSettingsPage";

export default function FalconAIConnectors() {
  return (
    <>
      <Helmet>
        <title>Falcon AI Connectors | FutureAGI</title>
      </Helmet>
      <ConnectorSettingsPage />
    </>
  );
}
