import React, { Suspense, useMemo } from "react";
import lazyWithRetry from "src/utils/lazyWithRetry";
import { Navigate, useRoutes } from "react-router-dom";

import { PATH_AFTER_LOGIN } from "src/config-global";

import { mainRoutes } from "./main";
import { authRoutes } from "./auth";
import { dashboardRoutes } from "./dashboard";
import { useAuthContext } from "src/auth/hooks";
import { AuthGuard } from "src/auth/guard";
import { SplashScreen } from "src/components/loading-screen";
import { useWorkspace } from "src/contexts/WorkspaceContext";
import { useDeploymentMode } from "src/hooks/useDeploymentMode";
import SOSLoginPage from "src/pages/SOSLoginPage";

const OAuthConsent = lazyWithRetry(() => import("src/pages/mcp/OAuthConsent"));
const SharedView = lazyWithRetry(() => import("src/pages/shared/SharedView"));

// ----------------------------------------------------------------------

export default function Router() {
  const { user } = useAuthContext();
  const { currentWorkspaceRole } = useWorkspace();
  const { isOSS } = useDeploymentMode();

  const dashboardRoutesArray = useMemo(
    () => dashboardRoutes(user, currentWorkspaceRole, { isOSS }),
    [user, currentWorkspaceRole, isOSS],
  );

  return useRoutes([
    {
      path: "/",
      element: <Navigate to={PATH_AFTER_LOGIN} replace />,
    },
    {
      path: "/sos",
      element: <SOSLoginPage />,
    },

    // MCP OAuth consent (standalone, no dashboard layout, requires auth)
    {
      path: "/mcp/authorize",
      element: (
        <AuthGuard>
          <Suspense fallback={<SplashScreen />}>
            <OAuthConsent />
          </Suspense>
        </AuthGuard>
      ),
    },

    // Auth routes
    ...authRoutes,

    // Dashboard routes
    ...dashboardRoutesArray,

    // Shared resource viewer (public — no dashboard layout, no auth guard)
    {
      path: "/shared/:token",
      element: (
        <Suspense fallback={<SplashScreen />}>
          <SharedView />
        </Suspense>
      ),
    },

    // Main routes
    ...mainRoutes,

    // No match 404
    { path: "*", element: <Navigate to="/404" replace /> },
  ]);
}
