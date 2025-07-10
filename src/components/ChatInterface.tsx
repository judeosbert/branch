import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Copy, ThumbsUp, ThumbsDown, GitBranch } from 'lucide-react';
import WelcomeScreen from './WelcomeScreen';
import SelectionPopup from './SelectionPopup';
import Breadcrumb from './Breadcrumb';
import BranchIndicator from './BranchIndicator';
import { useTextSelection } from '../hooks/useTextSelection';
import type { ConversationBranch } from '../types';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  branchId?: string;
}

interface ChatMessageProps {
  message: Message;
  onCopy: (content: string) => void;
  isInBranch?: boolean;
}

const ChatMessage = ({ message, onCopy, isInBranch }: ChatMessageProps) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex gap-4 p-4 ${isUser ? 'bg-gray-50' : 'bg-white'} ${isInBranch ? 'border-l-4 border-green-300' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
      }`}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      
      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900">
            {isUser ? 'You' : 'ChatGPT'}
          </span>
          <span className="text-xs text-gray-500">
            {message.timestamp.toLocaleTimeString()}
          </span>
          {isInBranch && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Branch
            </span>
          )}
        </div>
        
        <div className="prose max-w-none">
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap select-text mb-4">
            {message.content}
          </div>
        </div>
        
        {/* Action Buttons */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCopy(message.content)}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Copy message"
            >
              <Copy size={14} />
            </button>
            <button
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Good response"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Bad response"
            >
              <ThumbsDown size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ChatMessageWithBranchesProps {
  message: Message;
  onCopy: (content: string) => void;
  isInBranch?: boolean;
  branches: ConversationBranch[];
  onNavigateToBranch: (branchId: string) => void;
  currentBranchId?: string | null;
  showBranches?: boolean;
}

const ChatMessageWithBranches = ({ 
  message, 
  onCopy, 
  isInBranch, 
  branches, 
  onNavigateToBranch, 
  currentBranchId,
  showBranches = true 
}: ChatMessageWithBranchesProps) => {
  return (
    <div>
      <ChatMessage message={message} onCopy={onCopy} isInBranch={isInBranch} />
      {showBranches && (
        <div className="px-4 pb-2">
          <BranchIndicator
            messageId={message.id}
            branches={branches}
            onNavigateToBranch={onNavigateToBranch}
            currentBranchId={currentBranchId}
          />
        </div>
      )}
    </div>
  );
};

interface ChatInterfaceProps {
  onSendMessage: (message: string, branchId?: string) => void;
  onCreateBranch: (parentMessageId: string, branchText: string) => string;
  messages: Message[];
  branches: ConversationBranch[];
  currentBranchId: string | null;
  onNavigateToBranch: (branchId: string | null) => void;
  isLoading: boolean;
}

const ChatInterface = ({ 
  onSendMessage, 
  onCreateBranch,
  messages, 
  branches,
  currentBranchId,
  onNavigateToBranch,
  isLoading 
}: ChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { selection, clearSelection } = useTextSelection();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim(), currentBranchId || undefined);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleBranch = () => {
    if (selection && selectedMessageId) {
      const branchId = onCreateBranch(selectedMessageId, selection.text);
      onNavigateToBranch(branchId);
      clearSelection();
      setSelectedMessageId(null);
    }
  };

  // Get breadcrumb items
  const getBreadcrumbs = () => {
    const items: Array<{ id: string; label: string; type: 'main' | 'branch'; branchText?: string; depth?: number }> = [
      { id: 'main', label: 'Main Chat', type: 'main' }
    ];
    
    if (currentBranchId) {
      // Build the full path to the current branch
      const buildBranchPath = (branchId: string): ConversationBranch[] => {
        const branch = branches.find(b => b.id === branchId);
        if (!branch) return [];
        
        if (branch.parentBranchId) {
          return [...buildBranchPath(branch.parentBranchId), branch];
        }
        return [branch];
      };
      
      const branchPath = buildBranchPath(currentBranchId);
      
      branchPath.forEach((branch) => {
        const branchNumber = branches.findIndex(b => b.id === branch.id) + 1;
        items.push({
          id: branch.id,
          label: `Branch ${branchNumber}`,
          type: 'branch',
          branchText: branch.branchText,
          depth: branch.depth
        });
      });
    }
    
    return items;
  };

  // Handle message selection for branching
  const handleMessageMouseUp = (messageId: string) => {
    if (selection) {
      setSelectedMessageId(messageId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">ChatGPT</h1>
      </div>

      {/* Breadcrumb */}
      <Breadcrumb 
        items={getBreadcrumbs()} 
        onNavigate={(branchId) => onNavigateToBranch(branchId === 'main' ? null : branchId)}
        totalBranches={branches.length}
      />

      {/* Branch Context Info */}
      {currentBranchId && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <GitBranch size={14} />
            <span>
              You're in a branch conversation. All available branches are still visible below.
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pb-20">
        {messages.length === 0 ? (
          <WelcomeScreen onSelectPrompt={(prompt) => {
            setInputValue(prompt);
            textareaRef.current?.focus();
          }} />
        ) : (
          <div className="divide-y divide-gray-100">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className="group"
                onMouseUp={() => handleMessageMouseUp(message.id)}
              >
                <ChatMessageWithBranches
                  message={message} 
                  onCopy={handleCopy}
                  isInBranch={!!currentBranchId && message.branchId === currentBranchId}
                  branches={branches}
                  onNavigateToBranch={onNavigateToBranch}
                  currentBranchId={currentBranchId}
                  showBranches={true} // Always show branches when available
                />
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 p-4 bg-white">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">ChatGPT</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Selection Popup */}
      {selection && selectedMessageId && (
        <SelectionPopup
          selectedText={selection.text}
          position={{ x: selection.rect.left, y: selection.rect.top }}
          onBranch={handleBranch}
          onClose={() => {
            clearSelection();
            setSelectedMessageId(null);
          }}
        />
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message ChatGPT..."
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 min-h-[48px]"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
        
        {/* Disclaimer */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          ChatGPT can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
