import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MessageCircle, GitBranch, Copy } from 'lucide-react';
import type { ConversationMessage } from '../types';
import MarkdownMessage from './MarkdownMessage';

interface ConversationNodeProps {
  data: {
    message: ConversationMessage;
    isSelected: boolean;
    onBranch?: (nodeId: string, selectedText: string) => void;
    onSelect?: (nodeId: string) => void;
  };
  selected?: boolean;
}

const ConversationNode = memo(({ data, selected }: ConversationNodeProps) => {
  const { message, isSelected, onBranch, onSelect } = data;
  const [selectedText, setSelectedText] = useState('');

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  }, []);

  const handleBranch = useCallback(() => {
    if (onBranch && selectedText) {
      onBranch(message.id, selectedText);
      setSelectedText('');
    }
  }, [onBranch, message.id, selectedText]);

  const handleNodeClick = useCallback(() => {
    if (onSelect) {
      onSelect(message.id);
    }
  }, [onSelect, message.id]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
  }, [message.content]);

  return (
    <div
      className={`conversation-node group ${message.sender} ${
        isSelected || selected ? 'selected' : ''
      }`}
      onClick={handleNodeClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="react-flow__handle-top"
      />
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <MessageCircle 
            size={16} 
            className={`${
              message.sender === 'user' ? 'text-blue-600' : 'text-gray-600'
            }`} 
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900 capitalize">
              {message.sender}
            </span>
            <span className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </div>
          
          <MarkdownMessage 
            content={message.content}
            className="text-sm text-gray-800 leading-relaxed"
            onMouseUp={handleTextSelection}
          />
          
          {selectedText && (
            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
              <div className="font-medium text-yellow-800 mb-1">Selected:</div>
              <div className="text-yellow-700">{selectedText}</div>
              <button
                onClick={handleBranch}
                className="mt-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors"
              >
                Branch from here
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-1 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
          title="Copy message"
        >
          <Copy size={12} />
        </button>
        
        {selectedText && (
          <button
            onClick={handleBranch}
            className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
            title="Branch from selection"
          >
            <GitBranch size={12} />
          </button>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="react-flow__handle-bottom"
      />
    </div>
  );
});

ConversationNode.displayName = 'ConversationNode';

export default ConversationNode;
