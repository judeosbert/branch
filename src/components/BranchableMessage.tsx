import React, { useState } from 'react';
import MarkdownMessage from './MarkdownMessage';
import { GitBranch } from 'lucide-react';

interface BranchableMessageProps {
  content: string;
  messageId: string;
  onBranch: (messageId: string, branchText: string) => void;
  branches?: Array<{ parentMessageId: string; branchText: string }>;
}

// Utility to split content into branchable units: code blocks and text lines
function parseUnits(content: string) {
  const units: Array<{ text: string; isCode: boolean }> = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // text before code block
    const before = content.slice(lastIndex, match.index);
    if (before) {
      // split by newline
      const lines = before.split('\n');
      lines.forEach(line => {
        if (line.trim() !== '') units.push({ text: line, isCode: false });
      });
    }
    // code block
    units.push({ text: match[0], isCode: true });
    lastIndex = match.index + match[0].length;
  }
  const after = content.slice(lastIndex);
  if (after) {
    const lines = after.split('\n');
    lines.forEach(line => {
      if (line.trim() !== '') units.push({ text: line, isCode: false });
    });
  }
  return units;
}

const BranchableMessage: React.FC<BranchableMessageProps> = ({ content, messageId, onBranch, branches = [] }) => {
  const units = parseUnits(content);
  const [hoveredUnit, setHoveredUnit] = useState<number | null>(null);

  // Helper function to count branches for a specific text
  const getBranchCount = (text: string) => {
    return branches.filter(b => b.parentMessageId === messageId && b.branchText === text).length;
  };

  return (
    <div className="branchable-message leading-normal">
      {units.map((unit, idx) => {
        const branchCount = getBranchCount(unit.text);
        const isHovered = hoveredUnit === idx;
        
        return (
          <div 
            key={idx} 
            className={`relative flex items-start leading-normal rounded-md transition-all duration-200 ${
              isHovered ? 'bg-blue-50' : ''
            }`}
            onMouseEnter={() => setHoveredUnit(idx)}
            onMouseLeave={() => setHoveredUnit(null)}
          >
            {/* Branch Icon - Clickable area for branching */}
            <div 
              className={`flex-shrink-0 w-6 flex items-center justify-center pt-1 cursor-pointer ${
                isHovered ? 'hover:bg-green-100' : ''
              }`}
              onClick={() => onBranch(messageId, unit.text)}
              title="Branch from here"
            >
              <div className={`p-1 transition-colors ${
                isHovered ? 'text-green-600' : 'text-gray-300'
              }`}>
                <GitBranch size={14} />
              </div>
            </div>
            
            {/* Content - Allow text selection, no click handler */}
            <div className="flex-1 min-w-0 relative"
              style={{ userSelect: 'text' }}
            >
              {unit.isCode ? (
                <pre className="bg-gray-100 p-2 rounded overflow-auto relative">
                  <code>{unit.text.replace(/```/g, '')}</code>
                  {branchCount > 0 && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {branchCount} branch{branchCount > 1 ? 'es' : ''}
                    </div>
                  )}
                </pre>
              ) : (
                <div className="relative">
                  <MarkdownMessage content={unit.text} className="mb-0 leading-normal" />
                  {branchCount > 0 && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {branchCount} branch{branchCount > 1 ? 'es' : ''}
                    </div>
                  )}
                </div>
              )}
              
              {/* Hover tooltip - Only show for the specific hovered unit */}
              {isHovered && (
                <div className="absolute left-0 top-full mt-1 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                  Branch from here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BranchableMessage;
