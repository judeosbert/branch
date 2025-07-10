import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Copy, ThumbsUp, ThumbsDown, GitBranch, MessageCircle } from 'lucide-react';
import WelcomeScreen from './WelcomeScreen';
import SelectionPopup from './SelectionPopup';
import Breadcrumb from './Breadcrumb';
import BranchIndicator from './BranchIndicator';
import MiniMap from './MiniMap';
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
        
        {!isUser && (
          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onCopy(message.content)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              title="Copy message"
            >
              <Copy size={14} />
            </button>
            <button
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              title="Good response"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
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

interface ChatMessageWithBranchesProps extends ChatMessageProps {
  branches: ConversationBranch[];
  onNavigateToBranch: (branchId: string | null) => void;
  currentBranchId: string | null;
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
  const [isMiniMapFullView, setIsMiniMapFullView] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const branchMessagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const branchTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { selection, clearSelection } = useTextSelection();

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (currentBranchId) {
      branchMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentBranchId]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    onSendMessage(inputValue, currentBranchId || undefined);
    setInputValue('');
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // Handle copy functionality
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // Handle branch creation
  const handleBranch = () => {
    if (selection && selectedMessageId) {
      const branchId = onCreateBranch(selectedMessageId, selection.text);
      onNavigateToBranch(branchId);
      clearSelection();
      setSelectedMessageId(null);
    }
  };

  // Build breadcrumb items
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

  // Get parent conversation context (messages up to the branching point)
  const getParentConversation = (): Message[] => {
    if (!currentBranchId) {
      return messages.filter(msg => !msg.branchId);
    }
    
    const currentBranch = branches.find(b => b.id === currentBranchId);
    if (!currentBranch) return [];
    
    // If this is a nested branch (has a parent branch), show the parent branch messages
    if (currentBranch.parentBranchId) {
      // Get all messages from the parent branch
      const parentBranch = branches.find(b => b.id === currentBranch.parentBranchId);
      if (parentBranch) {
        // Build the path to the parent branch to include all its messages
        const buildBranchPath = (branchId: string): string[] => {
          const branch = branches.find(b => b.id === branchId);
          if (!branch) return [];
          
          if (branch.parentBranchId) {
            return [...buildBranchPath(branch.parentBranchId), branchId];
          }
          return [branchId];
        };
        
        const parentBranchPath = buildBranchPath(currentBranch.parentBranchId);
        
        // Get main messages up to parent branch point + parent branch messages
        const parentBranchPointIndex = messages.findIndex(msg => msg.id === parentBranch.parentMessageId);
        const mainMessages = parentBranchPointIndex >= 0 ? 
          messages.slice(0, parentBranchPointIndex + 1).filter(msg => !msg.branchId) : [];
        const parentBranchMessages = messages.filter(msg => msg.branchId && parentBranchPath.includes(msg.branchId));
        
        return [...mainMessages, ...parentBranchMessages];
      }
    }
    
    // For direct branches from main conversation, show main messages up to branch point
    const branchPointIndex = messages.findIndex(msg => msg.id === currentBranch.parentMessageId);
    if (branchPointIndex === -1) return [];
    
    return messages.slice(0, branchPointIndex + 1).filter(msg => !msg.branchId);
  };

  // Get current branch messages
  const getCurrentBranchMessages = (): Message[] => {
    if (!currentBranchId) return [];
    
    const currentBranch = branches.find(b => b.id === currentBranchId);
    if (!currentBranch) return [];
    
    // Build the full branch path to get all messages in the branch hierarchy
    const buildBranchPath = (branchId: string): string[] => {
      const branch = branches.find(b => b.id === branchId);
      if (!branch) return [];
      
      if (branch.parentBranchId) {
        return [...buildBranchPath(branch.parentBranchId), branchId];
      }
      return [branchId];
    };
    
    const branchPath = buildBranchPath(currentBranchId);
    return messages.filter(msg => msg.branchId && branchPath.includes(msg.branchId));
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden relative">
      {/* Reserve space for minimap when branches exist */}
      {branches.length > 0 && (
        <div className="fixed top-0 right-0 w-64 h-screen bg-gray-50 border-l border-gray-200 z-30">
          <MiniMap
            branches={branches}
            currentBranchId={currentBranchId}
            onNavigateToBranch={onNavigateToBranch}
            onToggleFullView={() => setIsMiniMapFullView(!isMiniMapFullView)}
            isFullView={isMiniMapFullView}
            totalMessages={messages.filter(m => !m.branchId).length}
          />
        </div>
      )}

      {/* Split Screen Layout */}
      <div className={`flex transition-all duration-500 ease-in-out ${
        currentBranchId ? 'w-full' : 'w-full justify-center'
      } ${branches.length > 0 ? 'pr-64' : ''}`}>
        
        {/* Left Panel - Parent Conversation Context */}
        {currentBranchId && (
          <div className="w-1/2 flex flex-col bg-white border-r border-gray-300">
            {/* Parent Header */}
            <div className="border-b border-gray-200 p-4 bg-gray-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                    <MessageCircle size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Parent Context</h2>
                    <p className="text-sm text-gray-600">
                      Conversation leading to this branch
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToBranch(null)}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium hover:bg-gray-200 px-3 py-1 rounded transition-colors"
                >
                  Return to Main
                </button>
              </div>
            </div>

            {/* Parent Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {getParentConversation().map((message) => (
                  <div 
                    key={message.id} 
                    className="group relative"
                    onMouseUp={() => handleMessageMouseUp(message.id)}
                  >
                    <ChatMessage
                      message={message} 
                      onCopy={handleCopy}
                      isInBranch={false}
                    />
                    {/* Branch point indicator */}
                    {(() => {
                      const branch = branches.find(b => b.parentMessageId === message.id);
                      const isCurrentBranchParent = branch && (branch.id === currentBranchId || branches.find(b => b.id === currentBranchId)?.parentMessageId === message.id);
                      return isCurrentBranchParent && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Branch Point
                        </div>
                      );
                    })()}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* Right Panel - Active Branch or Main Chat */}
        <div className={`flex flex-col bg-white ${
          currentBranchId ? 'w-1/2' : 'w-full max-w-4xl'
        }`}>
          {/* Branch Header */}
          <div className={`border-b border-gray-200 p-4 flex-shrink-0 ${
            currentBranchId ? 'bg-gradient-to-r from-green-50 to-green-100' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentBranchId ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {currentBranchId ? <GitBranch size={16} className="text-white" /> : <MessageCircle size={16} className="text-white" />}
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    {currentBranchId ? 'Branch Conversation' : 'ChatGPT'}
                  </h1>
                  {currentBranchId && (
                    <p className="text-sm text-green-700">
                      {(() => {
                        const branch = branches.find(b => b.id === currentBranchId);
                        return branch ? `"${branch.branchText.substring(0, 50)}..."` : '';
                      })()}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Breadcrumb */}
              {currentBranchId && (
                <div className="bg-white bg-opacity-70 rounded-lg p-2">
                  <Breadcrumb 
                    items={getBreadcrumbs()} 
                    onNavigate={(branchId) => onNavigateToBranch(branchId === 'main' ? null : branchId)}
                    totalBranches={branches.length}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {currentBranchId ? (
              // Branch Messages
              <div className="divide-y divide-gray-100">
                {getCurrentBranchMessages().map((message) => (
                  <div 
                    key={message.id} 
                    className="group"
                    onMouseUp={() => handleMessageMouseUp(message.id)}
                  >
                    <ChatMessage
                      message={message} 
                      onCopy={handleCopy}
                      isInBranch={true}
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
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={branchMessagesEndRef} />
              </div>
            ) : (
              // Main Chat Messages
              <div className="pb-20">
                {messages.filter(msg => !msg.branchId).length === 0 ? (
                  <WelcomeScreen onSelectPrompt={(prompt) => {
                    setInputValue(prompt);
                    textareaRef.current?.focus();
                  }} />
                ) : (
                  <div className="divide-y divide-gray-100">
                    {messages.filter(msg => !msg.branchId).map((message) => (
                      <div 
                        key={message.id} 
                        className="group"
                        onMouseUp={() => handleMessageMouseUp(message.id)}
                      >
                        <ChatMessageWithBranches
                          message={message} 
                          onCopy={handleCopy}
                          isInBranch={false}
                          branches={branches}
                          onNavigateToBranch={onNavigateToBranch}
                          currentBranchId={currentBranchId}
                          showBranches={true}
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
            )}
          </div>

          {/* Input Area */}
          <div className={`border-t p-4 flex-shrink-0 ${
            currentBranchId ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' : 'bg-white border-gray-200'
          }`}>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={currentBranchId ? branchTextareaRef : textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentBranchId ? "Continue this branch conversation..." : "Message ChatGPT..."}
                  className={`w-full resize-none rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:border-transparent max-h-32 min-h-[48px] shadow-sm ${
                    currentBranchId 
                      ? 'border border-green-300 focus:ring-green-500 bg-white' 
                      : 'border border-gray-300 focus:ring-blue-500 bg-white'
                  }`}
                  rows={1}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors ${
                    currentBranchId ? 'text-green-600 hover:text-green-800' : 'text-gray-500'
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
            
            {/* Disclaimer */}
            <div className={`mt-2 text-xs text-center ${
              currentBranchId ? 'text-green-700' : 'text-gray-500'
            }`}>
              {currentBranchId ? (
                <div className="flex items-center justify-center gap-1">
                  <GitBranch size={12} />
                  <span>Branch conversation • Changes won't affect parent context</span>
                </div>
              ) : (
                'ChatGPT can make mistakes. Check important info.'
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default ChatInterface;
