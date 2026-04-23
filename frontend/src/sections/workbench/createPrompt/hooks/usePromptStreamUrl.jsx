import { useMemo } from "react";
import { HOST_API } from "src/config-global";
import { useAuthContext } from "src/auth/hooks";

/**
 * @returns {string} - Full WebSocket URL
 */
export const usePromptStreamUrl = () => {
  const { user } = useAuthContext();
  const hostApi = HOST_API;
  const token = user?.accessToken || "";

  return useMemo(() => {
    if (!hostApi || !token) return "";

    const isSecure = HOST_API.includes("https");
    const wsHost = HOST_API.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const protocol = isSecure ? "wss" : "ws";
    const baseUrl = `${protocol}://${wsHost}/ws/prompt-stream/?token=${token}`;
    return baseUrl;
  }, [hostApi, token]);
};
