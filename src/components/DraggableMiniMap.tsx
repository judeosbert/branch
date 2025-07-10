import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Maximize2, GitBranch } from 'lucide-react';
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
  // Get default bottom-right position
  const getDefaultPosition = useCallback((): Position => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    return {
      x: windowWidth - 220, // 200px width + 20px margin
      y: windowHeight - 220  // 200px height + 20px margin
    };
  }, []);

  // Load saved position or use default
  const getSavedPosition = useCallback((): Position => {
    try {
      const saved = localStorage.getItem('minimap-position');
      if (saved) {
        const position = JSON.parse(saved);
        // Validate position is still within bounds
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        if (position.x >= 0 && position.x <= windowWidth - 200 && 
            position.y >= 80 && position.y <= windowHeight - 200) {
          return position;
        }
      }
    } catch (error) {
      console.warn('Failed to load saved MiniMap position:', error);
    }
    return getDefaultPosition();
  }, [getDefaultPosition]);

  const [position, setPosition] = useState<Position>(getSavedPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isExpanded, setIsExpanded] = useState(false);
  const miniMapRef = useRef<HTMLDivElement>(null);
  
  // Use ref for immediate position updates during drag to avoid React render delays
  const currentPositionRef = useRef<Position>(position);
  const animationFrameRef = useRef<number | null>(null);

  // Update ref when position state changes
  useEffect(() => {
    currentPositionRef.current = position;
  }, [position]);

  // Size constants
  const miniSize = 200; // Square 200x200
  const expandedSize = 400; // Square 400x400
  const snapThreshold = 50; // Distance from edge to trigger snap

  // Save position to localStorage
  const savePosition = useCallback((pos: Position) => {
    try {
      localStorage.setItem('minimap-position', JSON.stringify(pos));
    } catch (error) {
      console.warn('Failed to save MiniMap position:', error);
    }
  }, []);

  // Handle outside click to close minimap
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (miniMapRef.current && !miniMapRef.current.contains(event.target as Node) && !isDragging) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isDragging]);

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

  // Optimized drag handling with immediate DOM updates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !miniMapRef.current) return;
      
      e.preventDefault();
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Update DOM directly for immediate visual feedback
      const newPosition = { x: newX, y: newY };
      currentPositionRef.current = newPosition;
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Use requestAnimationFrame for smooth visual updates
      animationFrameRef.current = requestAnimationFrame(() => {
        if (miniMapRef.current) {
          miniMapRef.current.style.left = `${newX}px`;
          miniMapRef.current.style.top = `${newY}px`;
        }
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Snap to corner and update React state
      const snappedPosition = snapToCorner(currentPositionRef.current.x, currentPositionRef.current.y);
      setPosition(snappedPosition);
      savePosition(snappedPosition);
      setIsDragging(false);
    };

    if (isDragging) {
      // Add event listeners to document for smooth tracking
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      
      // Disable text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      (document.body.style as any).mozUserSelect = 'none';
    } else {
      // Re-enable text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      (document.body.style as any).mozUserSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Ensure text selection is re-enabled on cleanup
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      (document.body.style as any).mozUserSelect = '';
    };
  }, [isDragging, dragOffset, snapToCorner, savePosition]);

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
          <GitBranch size={16} />
          <span className="text-sm font-medium">Branch Map</span>
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
