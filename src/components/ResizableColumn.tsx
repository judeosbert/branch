import React, { useState, useRef, useCallback } from 'react';

interface ResizableColumnProps {
  children: React.ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  isLast?: boolean;
  onWidthChange?: (width: number) => void;
}

const ResizableColumn: React.FC<ResizableColumnProps> = ({
  children,
  initialWidth = 384, // Default w-96 equivalent
  minWidth = 280,
  maxWidth = 600,
  className = '',
  isLast = false,
  onWidthChange
}) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width, minWidth, maxWidth, onWidthChange]);

  // Handle double-click to reset to default width
  const handleDoubleClick = useCallback(() => {
    setWidth(initialWidth);
    onWidthChange?.(initialWidth);
  }, [initialWidth, onWidthChange]);

  return (
    <div 
      ref={columnRef}
      className={`${isLast ? 'flex-1' : 'flex-shrink-0'} h-full flex relative transition-all duration-150 ${className} ${
        isResizing ? 'shadow-lg shadow-blue-200' : ''
      }`}
      style={isLast ? { minWidth: `${minWidth}px` } : { width: `${width}px` }}
    >
      {/* Column Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      
      {/* Resize Handle - Only show if not the last column */}
      {!isLast && (
        <div
          ref={resizeHandleRef}
          className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group z-10 ${
            isResizing ? 'bg-blue-500 bg-opacity-50' : 'hover:bg-blue-400 hover:bg-opacity-30'
          }`}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          title="Drag to resize column (double-click to reset)"
        >
          {/* Extended hit area for easier grabbing */}
          <div className="absolute -left-2 -right-2 top-0 bottom-0" />
          
          {/* Visual resize indicator */}
          <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-gray-400 rounded-full transition-all duration-200 ${
            isResizing 
              ? 'opacity-100 bg-blue-600 scale-110' 
              : 'opacity-0 group-hover:opacity-100 group-hover:bg-blue-500'
          }`} />
          
          {/* Hover tooltip */}
          <div className={`absolute right-3 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none transition-all duration-200 ${
            isResizing || !isLast 
              ? 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0' 
              : 'opacity-0 translate-x-2'
          }`}>
            Resize
          </div>
        </div>
      )}
      
      {/* Resize overlay during dragging */}
      {isResizing && (
        <div className="fixed inset-0 z-40 cursor-col-resize" style={{ pointerEvents: 'none' }}>
          {/* Width indicator */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-3 py-1 rounded-full shadow-lg">
            {width}px
          </div>
        </div>
      )}
    </div>
  );
};

export default ResizableColumn;
