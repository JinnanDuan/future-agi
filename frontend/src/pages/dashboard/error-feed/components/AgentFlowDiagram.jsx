import React, { useState } from "react";
import {
  Box,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import PropTypes from "prop-types";

const NODE_COLORS = {
  invocation: { bg: "#2F7CF7", border: "#1a5fd4", text: "#fff", icon: "⚡" },
  agent_run: { bg: "#7857FC", border: "#5a3dd4", text: "#fff", icon: "🤖" },
  call_llm: { bg: "#F5A623", border: "#d4881a", text: "#fff", icon: "💬" },
  execute_tool: { bg: "#5ACE6D", border: "#3aab50", text: "#fff", icon: "🔧" },
};

const NODE_W = 130;
const NODE_H = 44;

function FlowNode({ node, isActive, onClick }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const baseColors = NODE_COLORS[node.type] || NODE_COLORS.agent_run;
  const colors = node.pathColor
    ? { ...baseColors, bg: node.pathColor, border: node.pathColor }
    : baseColors;

  return (
    <Tooltip
      title={
        <Stack gap={0.25}>
          <Typography fontSize="12px" fontWeight={600}>
            {node.label}
          </Typography>
          <Typography fontSize="11px" color="inherit" sx={{ opacity: 0.8 }}>
            {node.spans} span{node.spans !== 1 ? "s" : ""}
          </Typography>
        </Stack>
      }
      arrow
      placement="right"
    >
      <Box
        onClick={() => onClick?.(node)}
        sx={{
          position: "absolute",
          left: node.x,
          top: node.y,
          width: NODE_W,
          height: NODE_H,
          borderRadius: "8px",
          bgcolor: isActive
            ? isDark
              ? alpha("#fff", 0.07)
              : alpha("#000", 0.05)
            : isDark
              ? alpha("#fff", 0.03)
              : alpha("#000", 0.02),
          border: "1.5px solid",
          borderColor: isActive
            ? isDark
              ? alpha(colors.bg, 0.65)
              : alpha(colors.bg, 0.55)
            : "divider",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          px: 1.25,
          gap: 0.75,
          transition: "all 0.15s ease",
          "&:hover": {
            bgcolor: isDark ? alpha("#fff", 0.07) : alpha("#000", 0.05),
            borderColor: isDark ? alpha(colors.bg, 0.6) : alpha(colors.bg, 0.5),
            transform: "translateY(-1px)",
            boxShadow: `0 4px 12px ${alpha(baseColors.bg, 0.15)}`,
          },
        }}
      >
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: "5px",
            bgcolor: isDark
              ? alpha(baseColors.bg, 0.1)
              : alpha(baseColors.bg, 0.07),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            flexShrink: 0,
          }}
        >
          {colors.icon}
        </Box>
        <Stack gap={0} flex={1} minWidth={0}>
          <Typography
            fontSize="11px"
            fontWeight={600}
            color={isActive ? colors.text : "text.primary"}
            noWrap
            sx={{ lineHeight: 1.3 }}
          >
            {node.label}
          </Typography>
          <Typography
            fontSize="10px"
            color="text.disabled"
            sx={{ lineHeight: 1.2 }}
          >
            ×{node.spans} span{node.spans !== 1 ? "s" : ""}
          </Typography>
        </Stack>
      </Box>
    </Tooltip>
  );
}

FlowNode.propTypes = {
  node: PropTypes.object.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func,
};

function EdgeArrow({ from, to, label, color, nodes }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const fromNode = nodes.find((n) => n.id === from);
  const toNode = nodes.find((n) => n.id === to);
  if (!fromNode || !toNode) return null;

  // Right-center of from → left-center of to (horizontal flow)
  const x1 = fromNode.x + NODE_W;
  const y1 = fromNode.y + NODE_H / 2;
  const x2 = toNode.x;
  const y2 = toNode.y + NODE_H / 2;

  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  // Straight if y positions are nearly the same
  const isStraight = Math.abs(y1 - y2) < 5;

  const strokeColor =
    color || (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)");
  const textColor = color
    ? isDark
      ? alpha(color, 0.8)
      : alpha(color, 0.75)
    : isDark
      ? "rgba(255,255,255,0.4)"
      : "rgba(0,0,0,0.4)";

  const pathD = isStraight
    ? `M ${x1} ${y1} L ${x2} ${y2}`
    : `M ${x1} ${y1} C ${x1 + 25} ${y1}, ${x2 - 25} ${y2}, ${x2} ${y2}`;

  return (
    <g>
      <defs>
        <marker
          id={`arrow-${from}-${to}`}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
        >
          <path d="M 0 0 L 8 4 L 0 8 Z" fill={strokeColor} />
        </marker>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray={isStraight ? "none" : "4,2"}
        markerEnd={`url(#arrow-${from}-${to})`}
      />
      {label && (
        <text
          x={mx}
          y={my - 5}
          fill={textColor}
          fontSize="10"
          fontFamily="Inter, sans-serif"
          fontWeight="600"
          textAnchor="middle"
        >
          {label}
        </text>
      )}
    </g>
  );
}

EdgeArrow.propTypes = {
  from: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  label: PropTypes.string,
  color: PropTypes.string,
  nodes: PropTypes.array.isRequired,
};

// ── SVG dimensions (horizontal layout: 7 nodes left-to-right) ───────────────
const CANVAS_W = 960;
const CANVAS_H = 175;

export default function AgentFlowDiagram({ nodes, edges }) {
  const [activeNodeId, setActiveNodeId] = useState(null);

  const handleNodeClick = (node) => {
    setActiveNodeId((prev) => (prev === node.id ? null : node.id));
  };

  const canvasW =
    nodes.length > 0
      ? Math.max(...nodes.map((n) => n.x)) + NODE_W + 10
      : CANVAS_W;
  const canvasH =
    nodes.length > 0
      ? Math.max(...nodes.map((n) => n.y)) + NODE_H + 20
      : CANVAS_H;

  return (
    <Box>
      {/* Diagram canvas */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          overflow: "auto",
          minHeight: canvasH + 20,
        }}
      >
        {/* SVG layer for edges */}
        <svg
          width={canvasW}
          height={canvasH}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {edges.map((edge) => (
            <EdgeArrow
              key={`${edge.from}-${edge.to}`}
              from={edge.from}
              to={edge.to}
              label={edge.label}
              color={edge.color}
              nodes={nodes}
            />
          ))}
        </svg>

        {/* HTML layer for nodes */}
        <Box sx={{ position: "relative", width: canvasW, height: canvasH }}>
          {nodes.map((node) => (
            <FlowNode
              key={node.id}
              node={node}
              isActive={activeNodeId === node.id}
              onClick={handleNodeClick}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

AgentFlowDiagram.propTypes = {
  nodes: PropTypes.array.isRequired,
  edges: PropTypes.array.isRequired,
};
