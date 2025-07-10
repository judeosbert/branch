import React, { useState, useEffect } from 'react';
import { Map, Maximize2, Minimize2, GitBranch, MessageCircle } from 'lucide-react';
import type { ConversationBranch } from '../types';

interface MiniMapNode {
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
}

interface MiniMapProps {
  branches: ConversationBranch[];
  currentBranchId: string | null;
  onNavigateToBranch: (branchId: string | null) => void;
  onToggleFullView: () => void;
  isFullView: boolean;
  totalMessages: number;
  hideHeader?: boolean;
}

const MiniMap: React.FC<MiniMapProps> = ({
  branches,
  currentBranchId,
  onNavigateToBranch,
  onToggleFullView,
  isFullView,
  totalMessages,
  hideHeader = false
}) => {
  const [nodes, setNodes] = useState<MiniMapNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Calculate node positions and create graph structure
  useEffect(() => {
    const calculateNodes = () => {
      const newNodes: MiniMapNode[] = [];
      
      // Scale factors for mini vs full view
      const nodeWidth = isFullView ? 120 : 60;
      const nodeHeight = isFullView ? 80 : 40;
      const spacing = isFullView ? 200 : 80;
      const startY = isFullView ? 50 : 20;
      
      // Add main chat node
      const mainChatNode: MiniMapNode = {
        id: 'main',
        x: 20,
        y: startY,
        width: nodeWidth,
        height: nodeHeight,
        label: 'Main Chat',
        summary: 'Main conversation',
        branchText: '',
        depth: 0,
        isActive: currentBranchId === null,
        isMainChat: true,
        messageCount: totalMessages,
        children: branches.filter(b => !b.parentBranchId).map(b => b.id),
        parentId: undefined
      };
      
      newNodes.push(mainChatNode);
      
      // ==================================================================================
      // CRITICAL MINIMAP LOGIC - DO NOT MODIFY WITHOUT EXPLICIT REQUEST
      // ==================================================================================
      // This ensures proper visual representation of branch hierarchy:
      // 1. All branches from main chat appear at the same level (depth 1)
      // 2. Sibling branches are positioned vertically at same x-coordinate
      // 3. Only nested branches (from within other branches) have deeper depth
      // ==================================================================================
      
      // Group branches by their actual hierarchy depth
      const branchLevels: { [depth: number]: ConversationBranch[] } = {};
      
      branches.forEach(branch => {
        const actualDepth = branch.parentBranchId ? (branch.depth || 0) + 1 : 1; // Root branches at depth 1
        if (!branchLevels[actualDepth]) {
          branchLevels[actualDepth] = [];
        }
        branchLevels[actualDepth].push(branch);
      });
      
      // Add branch nodes level by level
      Object.keys(branchLevels)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(depth => {
          const branchesAtLevel = branchLevels[depth];
          
          branchesAtLevel.forEach((branch, indexAtLevel) => {
            const x = 20 + spacing + depth * spacing;
            const y = startY + indexAtLevel * (nodeHeight + 20);
            
            const branchIndex = branches.findIndex(b => b.id === branch.id);
            
            const node: MiniMapNode = {
              id: branch.id,
              x,
              y,
              width: nodeWidth,
              height: nodeHeight,
              label: `Branch ${branchIndex + 1}`,
              summary: branch.branchText.length > 40 ? branch.branchText.substring(0, 40) + '...' : branch.branchText,
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
      
      // ==================================================================================
      // END CRITICAL MINIMAP LOGIC
      // ==================================================================================
      
      setNodes(newNodes);
    };
    
    calculateNodes();
  }, [branches, currentBranchId, totalMessages, isFullView]);

  // Generate SVG path for connections
  const generatePath = (fromNode: MiniMapNode, toNode: MiniMapNode): string => {
    const startX = fromNode.x + fromNode.width;
    const startY = fromNode.y + fromNode.height / 2;
    const endX = toNode.x;
    const endY = toNode.y + toNode.height / 2;
    
    const midX = startX + (endX - startX) / 2;
    
    return `M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`;
  };

  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    if (isFullView) {
      onToggleFullView();
    }
    onNavigateToBranch(nodeId === 'main' ? null : nodeId);
  };

  const renderNode = (node: MiniMapNode) => {
    const iconSize = isFullView ? 16 : 10;
    const labelFontSize = isFullView ? 12 : 8;
    const summaryFontSize = isFullView ? 10 : 6;
    const messageCountFontSize = isFullView ? 10 : 6;
    
    return (
    <g key={node.id}>
      {/* Node Rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rx={8}
        fill={node.isActive ? '#3b82f6' : node.isMainChat ? '#10b981' : '#e5e7eb'}
        stroke={node.isActive ? '#1d4ed8' : node.isMainChat ? '#059669' : '#d1d5db'}
        strokeWidth={2}
        className={`cursor-pointer transition-all duration-200 ${
          hoveredNode === node.id ? 'drop-shadow-lg' : ''
        }`}
        onMouseEnter={() => setHoveredNode(node.id)}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={() => handleNodeClick(node.id)}
      />
      
      {/* Node Icon */}
      <foreignObject
        x={node.x + 8}
        y={node.y + 8}
        width={isFullView ? 20 : 12}
        height={isFullView ? 20 : 12}
      >
        <div className={`flex items-center justify-center ${isFullView ? 'w-5 h-5' : 'w-3 h-3'}`}>
          {node.isMainChat ? (
            <MessageCircle size={iconSize} className="text-white" />
          ) : (
            <GitBranch size={iconSize} className="text-white" />
          )}
        </div>
      </foreignObject>
      
      {/* Node Label */}
      <text
        x={node.x + (isFullView ? 32 : 20)}
        y={node.y + (isFullView ? 22 : 16)}
        fill={node.isActive ? 'white' : node.isMainChat ? 'white' : '#374151'}
        fontSize={labelFontSize}
        fontWeight="600"
        className="pointer-events-none select-none"
      >
        {isFullView ? node.label : node.label.substring(0, 8)}
      </text>
      
      {/* Node Summary - Only show in full view or shortened in mini */}
      {isFullView ? (
        <text
          x={node.x + 8}
          y={node.y + 40}
          fill={node.isActive ? 'white' : node.isMainChat ? 'white' : '#6b7280'}
          fontSize={summaryFontSize}
          className="pointer-events-none select-none"
        >
          <tspan x={node.x + 8} dy="0">
            {node.summary.substring(0, 18)}
          </tspan>
          {node.summary.length > 18 && (
            <tspan x={node.x + 8} dy="12">
              {node.summary.substring(18, 36)}
            </tspan>
          )}
        </text>
      ) : (
        <text
          x={node.x + 4}
          y={node.y + node.height - 8}
          fill={node.isActive ? 'white' : node.isMainChat ? 'white' : '#6b7280'}
          fontSize={summaryFontSize}
          className="pointer-events-none select-none"
        >
          {node.summary.substring(0, 10)}...
        </text>
      )}
      
      {/* Message Count */}
      <text
        x={node.x + node.width - 8}
        y={node.y + node.height - 8}
        fill={node.isActive ? 'white' : node.isMainChat ? 'white' : '#9ca3af'}
        fontSize={messageCountFontSize}
        textAnchor="end"
        className="pointer-events-none select-none"
      >
        {isFullView 
          ? `${node.messageCount} msg${node.messageCount !== 1 ? 's' : ''}`
          : node.messageCount
        }
      </text>
    </g>
    );
  };

  const renderConnections = () => {
    const connections: React.ReactElement[] = [];
    
    nodes.forEach(node => {
      if (node.parentId) {
        const parentNode = nodes.find(n => n.id === node.parentId);
        if (parentNode) {
          const isActiveConnection = node.isActive || parentNode.isActive;
          connections.push(
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
        }
      }
    });
    
    return connections;
  };

  const svgWidth = isFullView 
    ? Math.max(400, ...nodes.map(n => n.x + n.width + 50))
    : 240;
  const svgHeight = isFullView 
    ? Math.max(300, ...nodes.map(n => n.y + n.height + 50))
    : 120;

  if (isFullView) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in">
        <div className="bg-white rounded-lg shadow-2xl max-w-6xl max-h-[90vh] w-full m-4 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Map size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Conversation Map</h3>
                <p className="text-sm text-blue-100">
                  {branches.length} branches • {totalMessages} total messages
                </p>
              </div>
            </div>
            <button
              onClick={onToggleFullView}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <Minimize2 size={20} />
            </button>
          </div>
          
          {/* Graph Content */}
          <div className="p-4 h-[calc(90vh-120px)] overflow-auto">
            <svg
              width={svgWidth}
              height={svgHeight}
              className="w-full h-full"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            >
              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#d1d5db"
                  />
                </marker>
              </defs>
              
              {/* Connections */}
              {renderConnections()}
              
              {/* Nodes */}
              {nodes.map(renderNode)}
            </svg>
          </div>
          
          {/* Legend */}
          <div className="border-t bg-gray-50 p-4 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Active Branch</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Main Chat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-300 rounded"></div>
                <span>Other Branches</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Click any node to navigate to that conversation
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden h-full flex flex-col">
        {/* Mini Header - Hide if hideHeader prop is true */}
        {!hideHeader && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Map size={14} />
              <span className="text-sm font-medium">Navigation</span>
            </div>
            <button
              onClick={onToggleFullView}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <Maximize2 size={12} />
            </button>
          </div>
        )}
        
        {/* Mini Graph */}
        <div className={`flex-1 overflow-hidden ${hideHeader ? 'p-1' : 'p-2'}`}>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="cursor-pointer"
            onClick={onToggleFullView}
          >
            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead-mini"
                markerWidth="6"
                markerHeight="4"
                refX="5"
                refY="2"
                orient="auto"
              >
                <polygon
                  points="0 0, 6 2, 0 4"
                  fill="#d1d5db"
                />
              </marker>
            </defs>
            
            {/* Connections */}
            {renderConnections()}
            
            {/* Nodes */}
            {nodes.map(renderNode)}
          </svg>
        </div>
        
        {/* Mini Footer - Hide if hideHeader prop is true */}
        {!hideHeader && (
          <div className="bg-gray-50 px-2 py-1 text-xs text-gray-600 border-t">
            {branches.length} branches • Click to expand
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniMap;
