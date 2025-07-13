import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import MarkdownMessage from './MarkdownMessage';
import { GitBranch } from 'lucide-react';

interface BranchableMessageProps {
  content: string;
  messageId: string;
  onBranch: (messageId: string, branchText: string) => void;
  onSelectBranch?: (branchId: string) => void;
  branches?: Array<{ parentMessageId: string; branchText: string; id: string; name?: string }>;
  className?: string;
  disableBranching?: boolean;
  isCreatingBranch?: boolean;
  creatingBranchInfo?: { messageId: string; branchText: string } | null;
}

// Utility to split content into branchable units: preserve markdown structure
function parseUnits(content: string) {
  const units: Array<{ text: string; type: 'line' | 'codeblock' }> = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // text before code block
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) {
      // split by newline but preserve other markdown formatting
      const lines = before.split('\n');
      lines.forEach(line => {
        if (line.trim() !== '') units.push({ text: line, type: 'line' });
      });
    }
    // code block (keep as single unit)
    units.push({ text: match[0], type: 'codeblock' });
    lastIndex = match.index + match[0].length;
  }
  
  // remaining text after last code block
  const after = content.slice(lastIndex);
  if (after.trim()) {
    const lines = after.split('\n');
    lines.forEach(line => {
      if (line.trim() !== '') units.push({ text: line, type: 'line' });
    });
  }
  
  return units;
}

const BranchableMessage: React.FC<BranchableMessageProps> = ({ 
  content, 
  messageId, 
  onBranch, 
  onSelectBranch,
  branches = [], 
  className,
  disableBranching = false,
  isCreatingBranch = false,
  creatingBranchInfo = null
}) => {
  const units = parseUnits(content);
  const [hoveredUnit, setHoveredUnit] = useState<number | null>(null);
  const [showBranchPopup, setShowBranchPopup] = useState<{ unitIndex: number; unitText: string; rect: DOMRect } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowBranchPopup(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowBranchPopup(null);
      }
    };

    if (showBranchPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showBranchPopup]);

  // Branch Dropdown Portal Component
  const BranchDropdown: React.FC<{
    isOpen: boolean;
    unitText: string;
    position: DOMRect;
    onClose: () => void;
  }> = ({ isOpen, unitText, position, onClose }) => {
    if (!isOpen) return null;

    // Calculate position, ensuring dropdown stays within viewport
    const dropdownWidth = 192; // min-width in pixels
    const dropdownHeight = 200; // estimated max height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = position.left + position.width + 8; // Position to the right of the trigger
    let top = position.top;
    
    // If dropdown would go off right edge, position to the left
    if (left + dropdownWidth > viewportWidth) {
      left = position.left - dropdownWidth - 8;
    }
    
    // If dropdown would go off bottom edge, position above
    if (top + dropdownHeight > viewportHeight) {
      top = position.bottom - dropdownHeight;
    }
    
    // Ensure dropdown doesn't go off left or top edges
    left = Math.max(8, left);
    top = Math.max(8, top);

    const dropdownStyle: React.CSSProperties = {
      position: 'fixed',
      left: left,
      top: top,
      zIndex: 9999, // Very high z-index to ensure it's on top
      minWidth: '192px',
      maxHeight: '200px',
      overflowY: 'auto',
    };

    return createPortal(
      <div 
        ref={popupRef}
        className="bg-white border border-gray-300 rounded-lg shadow-lg py-2"
        style={dropdownStyle}
      >
        <div className="px-3 py-1 text-xs font-medium text-gray-500 border-b border-gray-200">
          Select Branch
        </div>
        {getBranchesForText(unitText).map((branch, branchIdx) => (
          <div
            key={branchIdx}
            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectBranch) {
                onSelectBranch(branch.id);
              }
              onClose();
            }}
          >
            {branch.name || `Branch ${branchIdx + 1}`}
          </div>
        ))}
      </div>,
      document.body
    );
  };

  // Helper function to count branches for a specific text
  const getBranchCount = (text: string) => {
    return branches.filter(b => b.parentMessageId === messageId && b.branchText === text).length;
  };

  // Helper function to get branches for a specific text
  const getBranchesForText = (text: string) => {
    return branches.filter(b => b.parentMessageId === messageId && b.branchText === text);
  };

  return (
    <div className={`branchable-message leading-normal max-w-full overflow-hidden ${className || ''}`} style={{ maxWidth: '100%' }}>
      {units.map((unit, idx) => {
        const branchCount = getBranchCount(unit.text);
        const isHovered = hoveredUnit === idx;
        
        return (
          <div 
            key={idx} 
            className={`relative flex leading-normal rounded-md transition-all duration-200 mb-2 max-w-full ${
              !disableBranching && isHovered ? 'bg-blue-50' : ''
            }`}
            onMouseEnter={!disableBranching ? () => setHoveredUnit(idx) : undefined}
            onMouseLeave={!disableBranching ? () => setHoveredUnit(null) : undefined}
          >
            {/* Tooltip - positioned above content but arrow points to branch icon */}
            {!disableBranching && isHovered && (
              <div className="absolute left-6 bottom-full mb-2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50 animate-fade-in">
                Branch from here
                {/* Arrow pointing down and left to the branch icon */}
                <div className="absolute left-0 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800 transform -translate-x-2"></div>
              </div>
            )}
            
            {/* Branch Icon - Only show if branching is enabled */}
            {!disableBranching && (
              <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col cursor-pointer z-10">
                {/* First row - Branch Icon */}
                <div 
                  className={`flex-1 flex items-center justify-center transition-colors relative ${
                    isHovered ? 'bg-green-100' : ''
                  }`}
                  onClick={() => {
                    if (!isCreatingBranch || 
                        !creatingBranchInfo || 
                        creatingBranchInfo.messageId !== messageId || 
                        creatingBranchInfo.branchText !== unit.text) {
                      onBranch(messageId, unit.text);
                    }
                  }}
                >
                  <div className={`p-1 transition-colors ${
                    isHovered ? 'text-green-600' : 'text-gray-300'
                  }`}>
                    {isCreatingBranch && 
                     creatingBranchInfo && 
                     creatingBranchInfo.messageId === messageId && 
                     creatingBranchInfo.branchText === unit.text ? (
                      <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <GitBranch size={14} />
                    )}
                  </div>
                </div>
                
                {/* Second row - Branch Count */}
                {branchCount > 0 && (
                  <div 
                    className={`flex-1 flex items-center justify-center transition-colors relative ${
                      isHovered ? 'bg-blue-100' : (branchCount > 0 ? 'bg-blue-100' : '')
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setShowBranchPopup({ unitIndex: idx, unitText: unit.text, rect });
                    }}
                  >
                    <div className={`text-xs font-medium transition-colors ${
                      isHovered ? 'text-blue-600' : (branchCount > 0 ? 'text-blue-600' : 'text-gray-400')
                    }`}>
                      {branchCount}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Content */}
            <div className={`${disableBranching ? 'w-full' : 'pl-8'} min-w-0 relative`}
              style={{ userSelect: 'text' }}
            >
              <div className="relative">
                <MarkdownMessage 
                  content={unit.text} 
                  className={`mb-0 leading-normal ${className?.includes('branch-origin-text') ? 'branch-origin-markdown' : ''}`} 
                />
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Portal-based Branch Dropdown */}
      {showBranchPopup && (
        <BranchDropdown
          isOpen={true}
          unitText={showBranchPopup.unitText}
          position={showBranchPopup.rect}
          onClose={() => setShowBranchPopup(null)}
        />
      )}
    </div>
  );
};

export default BranchableMessage;
