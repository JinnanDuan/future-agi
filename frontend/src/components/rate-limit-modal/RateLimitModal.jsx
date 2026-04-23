import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Alert,
  AlertTitle,
  IconButton,
  Box,
  Typography,
  useTheme,
  Slide,
} from "@mui/material";
import PropTypes from "prop-types";
import PricingDialog from "./UpgradeNowModal";
import Iconify from "../iconify";
import { useNavigate } from "react-router";
import { useSocket } from "src/hooks/use-socket";
import { ShowComponent } from "../show";
import logger from "src/utils/logger";

const UploadLimitNotification = () => {
  const { socket } = useSocket();
  const [showRateLimiter, setShowRateLimiter] = useState(false);
  const [alertData, setAlertData] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const theme = useTheme();
  const navigate = useNavigate();

  // Store message handler in a ref for proper cleanup
  const messageHandler = useRef((event) => {
    try {
      const data = JSON.parse(event.data);

      // Skip pong messages and filter for relevant notification types
      if (data?.type === "pong") return;

      // Only process rate limit or alert notifications
      if (data?.alert_title || data?.type === "rate_limit_notification") {
        if (window.location.pathname === "/auth/jwt/login") {
          setShowRateLimiter(false);
          return;
        }

        if (showRateLimiter) {
          setShowRateLimiter(false);
        }

        setAlertData(data);

        // Small delay to ensure UI updates properly
        setTimeout(() => {
          setShowRateLimiter(true);
        }, 500);
      }
    } catch (err) {
      logger.error("Error parsing WebSocket data:", err);
      setShowRateLimiter(false);
    }
  });

  // Handle WebSocket messages
  useEffect(() => {
    const messageHandlerValue = messageHandler.current;
    if (socket) {
      // Add event listener with the stored handler
      socket.addEventListener("message", messageHandlerValue);

      // Proper cleanup on component unmount or socket change
      return () => {
        if (socket) {
          socket.removeEventListener("message", messageHandlerValue);
        }
      };
    }
  }, [socket]);

  // Handle pathname changes (hide notification on login page)
  useEffect(() => {
    if (window.location.pathname === "/auth/jwt/login") {
      setShowRateLimiter(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.location.pathname]);

  const handleOpenDialog = useCallback(() => {
    setDialogOpen(true);
    setShowRateLimiter(false);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setShowRateLimiter(false);
  }, []);

  const handleUpgrade = useCallback(() => {
    navigate("/dashboard/settings/pricing");
    handleCloseDialog();
  }, [navigate, handleCloseDialog]);

  return (
    <>
      <ShowComponent condition={showRateLimiter}>
        <Slide
          direction="left"
          in={showRateLimiter}
          mountOnEnter
          unmountOnExit
          timeout={300}
        >
          <Alert
            severity="error"
            icon={
              <Iconify
                icon="fluent:warning-24-regular"
                sx={{ color: theme.palette.red[500] }}
              />
            }
            sx={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.red[500]}`,
              color: "text.primary",
              "& .MuiAlert-icon": {
                color: "#ff4d4f",
              },
              "& .MuiAlert-message": {
                width: "100%",
              },
              width: "100%",
              height: "fit-content",
              minHeight: "100px",
              maxWidth: 510,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              padding: "16px",
              borderRadius: "14px",
              position: "fixed",
              bottom: "64px",
              right: "24px",
              zIndex: 9999,
            }}
          >
            <AlertTitle>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: "600",
                    fontSize: "15px",
                    color: "text.primary",
                  }}
                >
                  {alertData?.alert_title}
                </Typography>
                <IconButton
                  onClick={() => setShowRateLimiter(false)}
                  sx={{
                    padding: "0px",
                    color: "text.primary",
                  }}
                >
                  <Iconify icon="oui:cross" />
                </IconButton>
              </Box>
            </AlertTitle>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontSize: "14px",
                  fontWeight: "400",
                  color: "text.primary",
                }}
              >
                {alertData?.alert_description}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Typography
                  onClick={handleOpenDialog}
                  sx={{
                    textDecoration: "underline",
                    fontSize: "14px",
                    color: "primary.main",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Upgrade now
                </Typography>
              </Box>
            </Box>
          </Alert>
        </Slide>
      </ShowComponent>
      <PricingDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onUpgradeToBusiness={handleUpgrade}
        title={alertData?.subscription_title}
        description={alertData?.subscription_description}
      />
    </>
  );
};

UploadLimitNotification.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  alertData: PropTypes.object,
};

export default UploadLimitNotification;
