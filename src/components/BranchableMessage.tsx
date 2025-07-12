import React, { useState, useEffect, useRef } from 'react';
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
  disableBranching = false 
}) => {
  const units = parseUnits(content);
  const [hoveredUnit, setHoveredUnit] = useState<number | null>(null);
  const [showBranchPopup, setShowBranchPopup] = useState<{ unitIndex: number; unitText: string } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowBranchPopup(null);
      }
    };

    if (showBranchPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBranchPopup]);

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
                  onClick={() => onBranch(messageId, unit.text)}
                >
                  <div className={`p-1 transition-colors ${
                    isHovered ? 'text-green-600' : 'text-gray-300'
                  }`}>
                    <GitBranch size={14} />
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
                      setShowBranchPopup({ unitIndex: idx, unitText: unit.text });
                    }}
                  >
                    <div className={`text-xs font-medium transition-colors ${
                      isHovered ? 'text-blue-600' : (branchCount > 0 ? 'text-blue-600' : 'text-gray-400')
                    }`}>
                      {branchCount}
                    </div>
                    {/* Branch Selection Popup */}
                    {showBranchPopup && showBranchPopup.unitIndex === idx && (
                      <div 
                        ref={popupRef}
                        className="absolute left-6 top-0 bg-white border border-gray-300 rounded-lg shadow-lg py-2 min-w-48 z-20"
                      >
                        <div className="px-3 py-1 text-xs font-medium text-gray-500 border-b border-gray-200">
                          Select Branch
                        </div>
                        {getBranchesForText(unit.text).map((branch, branchIdx) => (
                          <div
                            key={branchIdx}
                            className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectBranch) {
                                onSelectBranch(branch.id);
                              }
                              setShowBranchPopup(null);
                            }}
                          >
                            {branch.name || `Branch ${branchIdx + 1}`}
                          </div>
                        ))}
                      </div>
                    )}
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
    </div>
  );
};

export default BranchableMessage;
