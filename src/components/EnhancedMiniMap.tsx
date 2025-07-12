import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Grid, Move, RotateCcw, ExternalLink } from 'lucide-react';
import type { ConversationBranch } from '../types';

interface EnhancedMiniMapNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  summary: string;
  branchText: string;
  depth: number;
  isActive: boolean;
  isMainChat: boolean;
  messageCount: number;
  children: string[];
  parentId?: string;
  isDragging?: boolean;
}

interface ViewState {
  scale: number;
  panX: number;
  panY: number;
}

interface EnhancedMiniMapProps {
  branches: ConversationBranch[];
  currentBranchId: string | null;
  onNavigateToBranch: (branchId: string | null) => void;
  onToggleFullView: () => void;
  isFullView: boolean;
  totalMessages: number;
  hideHeader?: boolean;
}

const GRID_SIZE = 20;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

const EnhancedMiniMap: React.FC<EnhancedMiniMapProps> = ({
  branches,
  currentBranchId,
  onNavigateToBranch,
  onToggleFullView,
  isFullView,
  totalMessages,
  hideHeader = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<EnhancedMiniMapNode[]>([]);
  const [viewState, setViewState] = useState<ViewState>({
    scale: 1,
    panX: 0,
    panY: 0
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Calculate initial node positions
  const calculateInitialNodes = useCallback(() => {
    const newNodes: EnhancedMiniMapNode[] = [];
    
    // Scale factors for mini vs full view
    const nodeWidth = isFullView ? 180 : 120;
    const nodeHeight = isFullView ? 100 : 60;
    const spacingX = isFullView ? 250 : 150;
    const spacingY = isFullView ? 150 : 100;
    const startX = isFullView ? 100 : 50;
    const startY = isFullView ? 100 : 50;
    
    // Add main chat node
    const mainChatNode: EnhancedMiniMapNode = {
      id: 'main',
      x: startX,
      y: startY,
      width: nodeWidth,
      height: nodeHeight,
      label: 'Main Chat',
      summary: 'Main conversation thread',
      branchText: '',
      depth: 0,
      isActive: currentBranchId === null,
      isMainChat: true,
      messageCount: totalMessages,
      children: branches.filter(b => !b.parentBranchId).map(b => b.id),
      parentId: undefined
    };
    
    newNodes.push(mainChatNode);
    
    // Group branches by depth
    const branchLevels: { [depth: number]: ConversationBranch[] } = {};
    
    branches.forEach(branch => {
      const actualDepth = branch.parentBranchId ? (branch.depth || 0) + 1 : 1;
      if (!branchLevels[actualDepth]) {
        branchLevels[actualDepth] = [];
      }
      branchLevels[actualDepth].push(branch);
    });
    
    // Position nodes by level
    Object.keys(branchLevels)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(depth => {
        const branchesAtLevel = branchLevels[depth];
        
        branchesAtLevel.forEach((branch, indexAtLevel) => {
          const x = startX + depth * spacingX;
          const y = startY + indexAtLevel * spacingY;
          
          const branchIndex = branches.findIndex(b => b.id === branch.id);
          
          const node: EnhancedMiniMapNode = {
            id: branch.id,
            x,
            y,
            width: nodeWidth,
            height: nodeHeight,
            label: branch.name || `Branch ${branchIndex + 1}`,
            summary: branch.branchText.length > 50 ? branch.branchText.substring(0, 50) + '...' : branch.branchText,
            branchText: branch.branchText,
            depth: depth,
            isActive: currentBranchId === branch.id,
            isMainChat: false,
            messageCount: branch.messages.length,
            children: branches.filter(b => b.parentBranchId === branch.id).map(b => b.id),
            parentId: branch.parentBranchId || 'main'
          };
          
          newNodes.push(node);
        });
      });
    
    setNodes(newNodes);
  }, [branches, currentBranchId, totalMessages, isFullView]);

  // Initialize nodes
  useEffect(() => {
    calculateInitialNodes();
  }, [calculateInitialNodes]);

  // Snap to grid function
  const snapToGrid = useCallback((x: number, y: number): [number, number] => {
    return [
      Math.round(x / GRID_SIZE) * GRID_SIZE,
      Math.round(y / GRID_SIZE) * GRID_SIZE
    ];
  }, []);

  // Handle zoom
  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    setViewState(prev => {
      const newScale = Math.min(Math.max(prev.scale + delta, MIN_ZOOM), MAX_ZOOM);
      
      if (centerX !== undefined && centerY !== undefined) {
        // Zoom towards cursor position
        const scaleDiff = newScale - prev.scale;
        const newPanX = prev.panX - (centerX * scaleDiff);
        const newPanY = prev.panY - (centerY * scaleDiff);
        
        return {
          scale: newScale,
          panX: newPanX,
          panY: newPanY
        };
      }
      
      return { ...prev, scale: newScale };
    });
  }, []);

  // Handle mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isFullView) return;
    
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const centerX = (e.clientX - rect.left - viewState.panX) / viewState.scale;
    const centerY = (e.clientY - rect.top - viewState.panY) / viewState.scale;
    
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    handleZoom(delta, centerX, centerY);
  }, [isFullView, viewState, handleZoom]);

  // Handle pan start
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (!isFullView) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('[data-node]')) return; // Don't pan when clicking nodes
    
    setIsPanning(true);
    setPanStart({
      x: e.clientX - viewState.panX,
      y: e.clientY - viewState.panY
    });
  }, [isFullView, viewState]);

  // Handle pan move
  const handlePanMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return;
    
    setViewState(prev => ({
      ...prev,
      panX: e.clientX - panStart.x,
      panY: e.clientY - panStart.y
    }));
  }, [isPanning, panStart]);

  // Handle pan end
  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Pan event listeners
  useEffect(() => {
    if (isPanning) {
      document.addEventListener('mousemove', handlePanMove);
      document.addEventListener('mouseup', handlePanEnd);
      return () => {
        document.removeEventListener('mousemove', handlePanMove);
        document.removeEventListener('mouseup', handlePanEnd);
      };
    }
  }, [isPanning, handlePanMove, handlePanEnd]);

  // Handle node drag start
  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (!isFullView) return;
    
    e.stopPropagation();
    setDraggedNode(nodeId);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setDragStart({
      x: (e.clientX - rect.left - viewState.panX) / viewState.scale - node.x,
      y: (e.clientY - rect.top - viewState.panY) / viewState.scale - node.y
    });
  }, [isFullView, nodes, viewState]);

  // Handle node drag move
  const handleNodeDragMove = useCallback((e: MouseEvent) => {
    if (!draggedNode) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const newX = (e.clientX - rect.left - viewState.panX) / viewState.scale - dragStart.x;
    const newY = (e.clientY - rect.top - viewState.panY) / viewState.scale - dragStart.y;
    
    const [snappedX, snappedY] = snapToGrid(newX, newY);
    
    setNodes(prev => prev.map(node => 
      node.id === draggedNode 
        ? { ...node, x: snappedX, y: snappedY }
        : node
    ));
  }, [draggedNode, dragStart, viewState, snapToGrid]);

  // Handle node drag end
  const handleNodeDragEnd = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Node drag event listeners
  useEffect(() => {
    if (draggedNode) {
      document.addEventListener('mousemove', handleNodeDragMove);
      document.addEventListener('mouseup', handleNodeDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleNodeDragMove);
        document.removeEventListener('mouseup', handleNodeDragEnd);
      };
    }
  }, [draggedNode, handleNodeDragMove, handleNodeDragEnd]);

  // Handle node open button click
  const handleNodeOpen = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    onNavigateToBranch(nodeId === 'main' ? null : nodeId);
  }, [onNavigateToBranch]);

  // Reset zoom and pan
  const resetView = useCallback(() => {
    setViewState({ scale: 1, panX: 0, panY: 0 });
  }, []);

  // Generate SVG path for connections
  const generatePath = useCallback((fromNode: EnhancedMiniMapNode, toNode: EnhancedMiniMapNode): string => {
    const startX = fromNode.x + fromNode.width;
    const startY = fromNode.y + fromNode.height / 2;
    const endX = toNode.x;
    const endY = toNode.y + toNode.height / 2;
    
    const midX = startX + (endX - startX) / 2;
    
    return `M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`;
  }, []);

  // Render grid pattern
  const renderGrid = () => {
    if (!showGrid || !isFullView) return null;
    
    const gridLines = [];
    const bounds = {
      minX: -viewState.panX / viewState.scale - 1000,
      maxX: (-viewState.panX + (containerRef.current?.clientWidth || 0)) / viewState.scale + 1000,
      minY: -viewState.panY / viewState.scale - 1000,
      maxY: (-viewState.panY + (containerRef.current?.clientHeight || 0)) / viewState.scale + 1000
    };
    
    // Vertical lines
    for (let x = Math.floor(bounds.minX / GRID_SIZE) * GRID_SIZE; x <= bounds.maxX; x += GRID_SIZE) {
      gridLines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={bounds.minY}
          x2={x}
          y2={bounds.maxY}
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      );
    }
    
    // Horizontal lines
    for (let y = Math.floor(bounds.minY / GRID_SIZE) * GRID_SIZE; y <= bounds.maxY; y += GRID_SIZE) {
      gridLines.push(
        <line
          key={`h-${y}`}
          x1={bounds.minX}
          y1={y}
          x2={bounds.maxX}
          y2={y}
          stroke="#e5e7eb"
          strokeWidth={0.5}
        />
      );
    }
    
    return <g>{gridLines}</g>;
  };

  // Render node
  const renderNode = (node: EnhancedMiniMapNode) => {
    const isHovered = hoveredNode === node.id;
    const isDragging = draggedNode === node.id;
    
    return (
      <g
        key={node.id}
        data-node={node.id}
        style={{ cursor: isFullView ? 'grab' : 'pointer' }}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
        onMouseDown={(e) => handleNodeDragStart(e, node.id)}
        onClick={() => !isFullView && onNavigateToBranch(node.id === 'main' ? null : node.id)}
      >
        {/* Node shadow */}
        <rect
          x={node.x + 2}
          y={node.y + 2}
          width={node.width}
          height={node.height}
          rx={8}
          fill="rgba(0,0,0,0.1)"
          className={`transition-all duration-200 ${isDragging ? 'opacity-50' : ''}`}
        />
        
        {/* Node background */}
        <rect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rx={8}
          fill={node.isActive ? '#3b82f6' : node.isMainChat ? '#10b981' : '#f9fafb'}
          stroke={node.isActive ? '#1d4ed8' : node.isMainChat ? '#059669' : '#d1d5db'}
          strokeWidth={isHovered || isDragging ? 3 : 2}
          className={`transition-all duration-200 ${
            isHovered || isDragging ? 'filter drop-shadow-lg' : ''
          }`}
        />
        
        {/* Node content */}
        <text
          x={node.x + 12}
          y={node.y + 24}
          fill={node.isActive || node.isMainChat ? 'white' : '#1f2937'}
          fontSize={isFullView ? 14 : 10}
          fontWeight="600"
          className="pointer-events-none select-none"
        >
          {node.label}
        </text>
        
        {isFullView && (
          <text
            x={node.x + 12}
            y={node.y + 44}
            fill={node.isActive || node.isMainChat ? 'rgba(255,255,255,0.8)' : '#6b7280'}
            fontSize={10}
            className="pointer-events-none select-none"
          >
            {node.summary}
          </text>
        )}
        
        {/* Message count - positioned at bottom left */}
        <text
          x={node.x + 12}
          y={node.y + node.height - 12}
          fill={node.isActive || node.isMainChat ? 'rgba(255,255,255,0.8)' : '#9ca3af'}
          fontSize={isFullView ? 10 : 8}
          textAnchor="start"
          className="pointer-events-none select-none"
        >
          {node.messageCount} msg{node.messageCount !== 1 ? 's' : ''}
        </text>
        
        {/* Open button - bottom right */}
        <g>
          <circle
            cx={node.x + node.width - 16}
            cy={node.y + node.height - 16}
            r={12}
            fill={node.isActive || node.isMainChat ? 'rgba(255,255,255,0.2)' : 'rgba(59, 130, 246, 0.1)'}
            stroke={node.isActive || node.isMainChat ? 'rgba(255,255,255,0.4)' : '#3b82f6'}
            strokeWidth={1}
            className={`transition-all duration-200 cursor-pointer hover:fill-blue-100 ${
              isHovered ? 'opacity-100' : 'opacity-60'
            }`}
            onClick={(e) => handleNodeOpen(e, node.id)}
          />
          <foreignObject
            x={node.x + node.width - 22}
            y={node.y + node.height - 22}
            width={12}
            height={12}
            className="pointer-events-none"
          >
            <div className="w-3 h-3 flex items-center justify-center">
              <ExternalLink 
                size={8} 
                className={node.isActive || node.isMainChat ? 'text-white' : 'text-blue-600'} 
              />
            </div>
          </foreignObject>
        </g>
      </g>
    );
  };

  // Render connections
  const renderConnections = () => {
    return nodes.map(node => {
      if (!node.parentId) return null;
      
      const parentNode = nodes.find(n => n.id === node.parentId);
      if (!parentNode) return null;
      
      const isActiveConnection = node.isActive || parentNode.isActive;
      
      return (
        <path
          key={`${parentNode.id}-${node.id}`}
          d={generatePath(parentNode, node)}
          stroke={isActiveConnection ? '#3b82f6' : '#d1d5db'}
          strokeWidth={isActiveConnection ? 3 : 2}
          fill="none"
          className="transition-all duration-200"
          markerEnd="url(#arrowhead)"
        />
      );
    });
  };

  // Calculate SVG bounds
  const svgBounds = {
    minX: Math.min(0, ...nodes.map(n => n.x)) - 100,
    maxX: Math.max(800, ...nodes.map(n => n.x + n.width)) + 100,
    minY: Math.min(0, ...nodes.map(n => n.y)) - 100,
    maxY: Math.max(600, ...nodes.map(n => n.y + n.height)) + 100
  };

  const svgWidth = svgBounds.maxX - svgBounds.minX;
  const svgHeight = svgBounds.maxY - svgBounds.minY;

  if (!isFullView) {
    // Mini mode - simple version
    return (
      <div className="relative w-full h-full">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden h-full flex flex-col">
          {!hideHeader && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Move size={14} />
                <span className="text-sm font-medium">Graph</span>
              </div>
              <button
                onClick={onToggleFullView}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <ZoomIn size={12} />
              </button>
            </div>
          )}
          
          <div className="flex-1 overflow-hidden p-2">
            <svg
              width="100%"
              height="100%"
              viewBox={`${svgBounds.minX} ${svgBounds.minY} ${svgWidth} ${svgHeight}`}
              className="cursor-pointer"
              onClick={onToggleFullView}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#d1d5db" />
                </marker>
              </defs>
              
              {renderConnections()}
              {nodes.map(renderNode)}
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Full view mode - enhanced version
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gray-50 overflow-hidden"
      onWheel={handleWheel}
    >
      {/* Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleZoom(ZOOM_STEP)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => handleZoom(-ZOOM_STEP)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={resetView}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
              title="Reset View"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`w-8 h-8 flex items-center justify-center rounded ${
                showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="Toggle Grid"
            >
              <Grid size={16} />
            </button>
          </div>
        </div>
        
        {/* Zoom indicator */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-1">
          <span className="text-sm text-gray-600">
            {Math.round(viewState.scale * 100)}%
          </span>
        </div>
      </div>

      {/* Canvas */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className={`${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handlePanStart}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#d1d5db" />
          </marker>
        </defs>
        
        <g transform={`translate(${viewState.panX}, ${viewState.panY}) scale(${viewState.scale})`}>
          {renderGrid()}
          {renderConnections()}
          {nodes.map(renderNode)}
        </g>
      </svg>
    </div>
  );
};

export default EnhancedMiniMap;
