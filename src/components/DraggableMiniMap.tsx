import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Maximize2, MapPin } from 'lucide-react';
import MiniMap from './MiniMap';
import type { ConversationBranch } from '../types';

interface DraggableMiniMapProps {
  branches: ConversationBranch[];
  currentBranchId: string | null;
  onNavigateToBranch: (branchId: string | null) => void;
  onClose: () => void;
  totalMessages: number;
}

interface Position {
  x: number;
  y: number;
}

const DraggableMiniMap: React.FC<DraggableMiniMapProps> = ({
  branches,
  currentBranchId,
  onNavigateToBranch,
  onClose,
  totalMessages
}) => {
  const [position, setPosition] = useState<Position>({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const miniMapRef = useRef<HTMLDivElement>(null);

  // Size constants
  const miniSize = 200; // Square 200x200
  const expandedSize = 400; // Square 400x400
  const snapThreshold = 50; // Distance from edge to trigger snap

  // Corner snapping logic
  const snapToCorner = useCallback((x: number, y: number): Position => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const size = isExpanded ? expandedSize : miniSize;
    
    const corners = [
      { x: 20, y: 80 }, // Top-left (below header)
      { x: windowWidth - size - 20, y: 80 }, // Top-right
      { x: 20, y: windowHeight - size - 20 }, // Bottom-left
      { x: windowWidth - size - 20, y: windowHeight - size - 20 }, // Bottom-right
    ];

    // Find closest corner
    let closestCorner = corners[0];
    let minDistance = Infinity;

    corners.forEach(corner => {
      const distance = Math.sqrt(
        Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestCorner = corner;
      }
    });

    // Snap if within threshold
    if (minDistance < snapThreshold) {
      return closestCorner;
    }

    // Keep within bounds
    return {
      x: Math.max(20, Math.min(windowWidth - size - 20, x)),
      y: Math.max(80, Math.min(windowHeight - size - 20, y))
    };
  }, [isExpanded, expandedSize, miniSize, snapThreshold]);

  // Handle mouse down on draggable area
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!miniMapRef.current) return;
    
    // Prevent text selection
    e.preventDefault();
    
    const rect = miniMapRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Prevent text selection during drag
      e.preventDefault();
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Update position immediately for smooth dragging
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      // Snap to corner on release
      setPosition(prev => snapToCorner(prev.x, prev.y));
      setIsDragging(false);
    };

    if (isDragging) {
      // Add event listeners to document for smooth tracking
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      
      // Disable text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    } else {
      // Re-enable text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Ensure text selection is re-enabled on cleanup
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [isDragging, dragOffset, snapToCorner]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => snapToCorner(prev.x, prev.y));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [snapToCorner]);

  const size = isExpanded ? expandedSize : miniSize;

  return (
    <div
      ref={miniMapRef}
      className={`fixed z-50 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
        isDragging ? 'cursor-grabbing scale-105' : 'cursor-default'
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: size,
        height: size,
      }}
    >
      {/* Draggable Header */}
      <div
        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-t-lg cursor-grab active:cursor-grabbing flex items-center justify-between select-none"
        onMouseDown={handleMouseDown}
        onDragStart={(e) => e.preventDefault()} // Prevent text selection
      >
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span className="text-sm font-medium">Navigation</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            <Maximize2 size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            title="Hide Map"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* MiniMap Content */}
      <div className="flex-1 overflow-hidden" style={{ height: size - 52 }}>
        <MiniMap
          branches={branches}
          currentBranchId={currentBranchId}
          onNavigateToBranch={onNavigateToBranch}
          onToggleFullView={() => setIsExpanded(!isExpanded)}
          isFullView={isExpanded}
          totalMessages={totalMessages}
          hideHeader={true}
        />
      </div>
    </div>
  );
};

export default DraggableMiniMap;
