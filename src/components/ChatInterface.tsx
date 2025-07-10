import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Send, User, Bot, Copy, ThumbsUp, ThumbsDown, GitBranch, MessageCircle, Settings } from 'lucide-react';
import WelcomeScreen from './WelcomeScreen';
import SelectionPopup from './SelectionPopup';
import Breadcrumb from './Breadcrumb';
import MiniMap from './MiniMap';
import SettingsPopup from './SettingsPopup';
import { useTextSelection } from '../hooks/useTextSelection';
import type { ConversationBranch } from '../types';
import type { SettingsConfig } from './SettingsPopup';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  branchId?: string;
}

interface ChatMessageWithBranchHighlightProps {
  message: Message;
  onCopy: (content: string) => void;
  isInBranch?: boolean;
  branches: ConversationBranch[];
  currentBranchId: string | null;
  onMessageContentMouseUp?: (messageId: string) => void;
  onBranchIndicatorClick?: (messageBranches: ConversationBranch[]) => void;
}

const ChatMessageWithBranchHighlight = ({ 
  message, 
  onCopy, 
  isInBranch, 
  branches,
  currentBranchId,
  onMessageContentMouseUp,
  onBranchIndicatorClick
}: ChatMessageWithBranchHighlightProps) => {
  const isUser = message.sender === 'user';
  const contentRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  
  // Find if this message has branches created from it
  const messageBranches = useMemo(() => 
    branches.filter(b => b.parentMessageId === message.id), 
    [branches, message.id]
  );
  
  // Simple approach: render plain text during selection, highlighted text when not selecting
  const shouldShowHighlights = !isSelecting && messageBranches.length > 0;
  
  const highlightedContent = useMemo(() => {
    if (!shouldShowHighlights) {
      return message.content; // Plain text during selection
    }
    
    let content = message.content;
    messageBranches.forEach(branch => {
      const branchText = branch.branchText;
      if (branchText && content.includes(branchText)) {
        const isCurrentBranch = currentBranchId === branch.id;
        const highlightClass = isCurrentBranch 
          ? 'bg-green-200 text-green-800 px-1 py-0.5 rounded border border-green-300'
          : 'bg-green-100 text-green-700 px-1 py-0.5 rounded border border-green-200';
        
        content = content.replace(
          branchText,
          `<span class="${highlightClass}">${branchText}</span>`
        );
      }
    });
    
    return content;
  }, [message.content, messageBranches, currentBranchId, shouldShowHighlights]);

  // Simplified mouse handlers - let browser handle selection naturally
  const handleMouseDown = useCallback(() => {
    setIsSelecting(true);
    // Don't interfere with browser's natural selection process
  }, []);

  const handleMouseUp = useCallback(() => {
    // Check for selection after a small delay
    setTimeout(() => {
      const selection = window.getSelection();
      
      if (selection && selection.toString().trim().length > 0) {
        // Only trigger if selection is within this message
        const range = selection.getRangeAt(0);
        const contentElement = contentRef.current;
        
        if (contentElement && contentElement.contains(range.commonAncestorContainer)) {
          onMessageContentMouseUp?.(message.id);
        }
      }
      
      // Reset selection state
      setTimeout(() => {
        setIsSelecting(false);
      }, 100);
    }, 30);
  }, [onMessageContentMouseUp, message.id]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    // Only prevent drag if it's not part of text selection
    if (!isSelecting) {
      e.preventDefault();
    }
  }, [isSelecting]);
  
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
          {messageBranches.length > 0 && (
            <button
              onClick={() => onBranchIndicatorClick?.(messageBranches)}
              className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-all duration-200 ${
                messageBranches.length === 1 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md transform hover:scale-105' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md transform hover:scale-105'
              }`}
              title={`Click to ${messageBranches.length === 1 ? 'open branch' : 'select from ' + messageBranches.length + ' branches'}`}
            >
              <GitBranch size={10} />
              {messageBranches.length} branch{messageBranches.length > 1 ? 'es' : ''}
              {messageBranches.length > 1 && <span className="ml-1 text-xs">📋</span>}
            </button>
          )}
        </div>
        
        <div className="prose max-w-none">
          {shouldShowHighlights ? (
            <div 
              ref={contentRef}
              className="text-gray-800 leading-relaxed whitespace-pre-wrap select-text mb-4 cursor-text precise-select"
              dangerouslySetInnerHTML={{ __html: highlightedContent }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onDragStart={handleDragStart}
            />
          ) : (
            <div 
              ref={contentRef}
              className={`text-gray-800 leading-relaxed whitespace-pre-wrap select-text mb-4 cursor-text precise-select ${
                !isUser && message.content && message.content.length > 0 && message.content.length < 100 
                  ? 'transition-all duration-300 ease-out' 
                  : ''
              }`}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onDragStart={handleDragStart}
            >
              {message.content || (!isUser && message.content === '' ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm">AI is typing...</span>
                  <span className="animate-pulse text-lg font-bold">|</span>
                </div>
              ) : message.content)}
            </div>
          )}
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

interface ChatInterfaceProps {
  onSendMessage: (message: string, branchId?: string) => void;
  onCreateBranch: (parentMessageId: string, branchText: string) => string;
  messages: Message[];
  branches: ConversationBranch[];
  currentBranchId: string | null;
  onNavigateToBranch: (branchId: string | null) => void;
  isLoading: boolean;
  settings: SettingsConfig;
  onSettingsChange: (settings: SettingsConfig) => void;
}

const ChatInterface = ({ 
  onSendMessage, 
  onCreateBranch,
  messages, 
  branches,
  currentBranchId,
  onNavigateToBranch,
  isLoading,
  settings,
  onSettingsChange
}: ChatInterfaceProps) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isMiniMapFullView, setIsMiniMapFullView] = useState(false);
  const [showMiniMapWithIntent, setShowMiniMapWithIntent] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
    // Only set selected message if there's an actual selection
    const currentSelection = window.getSelection();
    if (selection && currentSelection && currentSelection.toString().trim()) {
      setSelectedMessageId(messageId);
    }
  };

  // Handle branch indicator click
  const handleBranchIndicatorClick = (messageBranches: ConversationBranch[]) => {
    if (messageBranches.length === 1) {
      // Single branch: automatically navigate to it
      const branchId = messageBranches[0].id;
      onNavigateToBranch(branchId);
      
      // Scroll the column container to show the branch column with smooth animation
      setTimeout(() => {
        const columnContainer = document.querySelector('.column-scroll');
        if (columnContainer) {
          const columnWidth = 384; // w-96 = 384px
          columnContainer.scrollTo({
            left: columnWidth,
            behavior: 'smooth'
          });
        }
      }, 100);
    } else {
      // Multiple branches: show mini map with intent
      setShowMiniMapWithIntent(true);
      setIsMiniMapFullView(true);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Top Header Bar with Title, Navigation, and MiniMap */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-start justify-between p-4 gap-4">
          {/* Left side: Title and Navigation in Column */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentBranchId ? 'bg-green-500' : 'bg-blue-500'
              }`}>
                {currentBranchId ? <GitBranch size={16} className="text-white" /> : <MessageCircle size={16} className="text-white" />}
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-gray-900">
                  New Conversation
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
              
              {/* Embedded MiniMap in Header */}
              {(branches.length > 0 || showMiniMapWithIntent) && (
                <div className="relative mr-4">
                  {/* MiniMap Container - Positioned absolutely to break out of header height */}
                  <div className={`absolute top-full right-0 z-50 transition-all duration-300 ${
                    isMiniMapFullView || showMiniMapWithIntent
                      ? 'w-96 h-64' 
                      : 'w-64 h-32'
                  } ${showMiniMapWithIntent ? 'ring-2 ring-purple-500 ring-opacity-50 shadow-xl' : 'shadow-lg'}`}>
                    <MiniMap
                      branches={branches}
                      currentBranchId={currentBranchId}
                      onNavigateToBranch={(branchId) => {
                        onNavigateToBranch(branchId);
                        if (showMiniMapWithIntent) {
                          setShowMiniMapWithIntent(false);
                          setIsMiniMapFullView(false);
                          
                          // Scroll to show the selected branch
                          setTimeout(() => {
                            const columnContainer = document.querySelector('.column-scroll');
                            if (columnContainer && branchId) {
                              const branch = branches.find(b => b.id === branchId);
                              if (branch) {
                                const columnWidth = 384; // w-96 = 384px
                                const scrollLeft = columnWidth * (branch.depth || 1);
                                columnContainer.scrollTo({
                                  left: scrollLeft,
                                  behavior: 'smooth'
                                });
                              }
                            }
                          }, 100);
                        }
                      }}
                      onToggleFullView={() => {
                        if (showMiniMapWithIntent) {
                          setShowMiniMapWithIntent(false);
                          setIsMiniMapFullView(false);
                        } else {
                          setIsMiniMapFullView(!isMiniMapFullView);
                        }
                      }}
                      isFullView={isMiniMapFullView || showMiniMapWithIntent}
                      totalMessages={messages.filter(m => !m.branchId).length}
                    />
                  </div>
                  {/* Invisible spacer to maintain header layout */}
                  <div className={`transition-all duration-300 ${
                    isMiniMapFullView || showMiniMapWithIntent
                      ? 'w-16 h-8' 
                      : 'w-12 h-6'
                  }`}></div>
                </div>
              )}
              
              {/* Settings Button - Always show */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings size={20} />
              </button>
            </div>
            
            {/* Conversation Path Row - Scrollable */}
            {currentBranchId && (
              <div className="flex items-center gap-2">
                <div className="flex-1 overflow-x-auto scrollbar-hide">
                  <div className="flex items-center gap-1 min-w-max">
                    <Breadcrumb 
                      items={getBreadcrumbs()} 
                      onNavigate={(branchId) => onNavigateToBranch(branchId === 'main' ? null : branchId)}
                      totalBranches={branches.length}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          

        </div>
      </div>

      {/* Main Content Area - Column View */}
      <div className="flex-1 overflow-hidden">
        {/* Horizontal Column Container */}
        <div className={`flex h-full overflow-y-hidden column-scroll scrollbar-hide ${
          branches.length > 0 ? 'overflow-x-auto' : 'justify-center'
        }`}>
          {/* Main Chat Column */}
          <div className={`flex-shrink-0 h-full flex flex-col bg-white column-snap ${
            branches.length > 0 ? 'w-96 border-r border-gray-200' : 'w-full max-w-4xl'
          }`}>
            {/* Column Header - Only show when branches exist */}
            {branches.length > 0 && (
              <div className="border-b border-gray-200 p-3 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <MessageCircle size={12} className="text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Main Chat</h3>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                    {messages.filter(m => !m.branchId).length} messages
                  </span>
                </div>
              </div>
            )}

            {/* Column Messages */}
            <div className="flex-1 overflow-y-auto">
              {messages.filter(msg => !msg.branchId).length === 0 ? (
                <WelcomeScreen onSelectPrompt={(prompt) => {
                  setInputValue(prompt);
                  textareaRef.current?.focus();
                }} />
              ) : (
                <div className={`divide-y divide-gray-100 ${branches.length === 0 ? 'pb-20' : ''}`}>
                  {messages.filter(msg => !msg.branchId).map((message) => (
                    <div 
                      key={message.id} 
                      className="group"
                    >
                      <ChatMessageWithBranchHighlight
                        message={message} 
                        onCopy={handleCopy}
                        isInBranch={false}
                        branches={branches}
                        currentBranchId={currentBranchId}
                        onMessageContentMouseUp={handleMessageMouseUp}
                        onBranchIndicatorClick={handleBranchIndicatorClick}
                      />
                    </div>
                  ))}
                  {isLoading && !currentBranchId && (
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

            {/* Column Input Area - Show when no current branch is selected */}
            {(!currentBranchId) && (
              <div className="border-t p-4 flex-shrink-0 bg-white border-gray-200">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message ChatGPT..."
                      className="w-full resize-none rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:border-transparent max-h-32 min-h-[48px] shadow-sm border border-gray-300 focus:ring-blue-500 bg-white"
                      rows={1}
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isLoading}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors text-gray-500"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
                
                <div className="mt-2 text-xs text-center text-gray-500">
                  ChatGPT can make mistakes. Check important info.
                </div>
              </div>
            )}
          </div>

          {/* Branch Hierarchy Columns */}
          {currentBranchId && (() => {
            // ==================================================================================
            // CRITICAL COLUMN DISPLAY LOGIC - DO NOT MODIFY WITHOUT EXPLICIT REQUEST
            // ==================================================================================
            // This logic ensures only the active branch lineage is shown in columns:
            // 1. Only displays the path from root to current active branch
            // 2. Does NOT show sibling branches in the column view
            // 3. Sibling branches are only visible in the minimap
            // ==================================================================================
            
            // Build the complete path from root to current branch
            const buildBranchPath = (branchId: string): ConversationBranch[] => {
              const branch = branches.find(b => b.id === branchId);
              if (!branch) return [];
              
              if (branch.parentBranchId) {
                return [...buildBranchPath(branch.parentBranchId), branch];
              }
              return [branch];
            };

            const branchPath = buildBranchPath(currentBranchId);
            const columns: React.ReactElement[] = [];
            
            // ==================================================================================
            // END CRITICAL COLUMN DISPLAY LOGIC
            // ==================================================================================

            // Add columns for each branch in the path
            branchPath.forEach((branch, index) => {
              const isCurrentBranch = branch.id === currentBranchId;
              const branchNumber = branches.findIndex(b => b.id === branch.id) + 1;
              
              // Get messages for this specific branch level
              const branchMessages = messages.filter(msg => msg.branchId === branch.id);

              columns.push(
                <div 
                  key={`branch-${branch.id}`} 
                  className={`flex-shrink-0 w-96 h-full flex flex-col bg-white column-snap ${
                    index < branchPath.length - 1 ? 'border-r border-gray-200' : ''
                  }`}
                >
                  {/* Column Header */}
                  <div className={`border-b border-gray-200 p-3 flex-shrink-0 ${
                    isCurrentBranch ? 'bg-green-50' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        isCurrentBranch ? 'bg-green-600' : 'bg-green-500'
                      }`}>
                        <GitBranch size={12} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Branch {branchNumber} {index < branchPath.length - 1 ? '(Parent)' : '(Active)'}
                        </h3>
                        <p className="text-xs text-green-700 line-clamp-1">
                          "{branch.branchText}"
                        </p>
                      </div>
                      {isCurrentBranch && (
                        <button
                          onClick={() => onNavigateToBranch(null)}
                          className="text-gray-600 hover:text-gray-800 text-xs font-medium hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Branch Messages */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="divide-y divide-gray-100">
                      {/* Branch Origin Indicator - Show selected text that created this branch */}
                      {branchMessages.length === 0 && (
                        <div className="p-4 bg-green-50 border-l-4 border-green-400">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <GitBranch size={14} className="text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-green-800">Branch Origin</span>
                                <span className="text-xs text-green-600 bg-green-200 px-2 py-0.5 rounded-full">
                                  Selected Text
                                </span>
                              </div>
                              <div className="text-sm text-green-700 bg-white border border-green-200 rounded-lg p-3 italic">
                                "{branch.branchText}"
                              </div>
                              <p className="text-xs text-green-600 mt-2">
                                This branch was created from the text above. Start typing below to continue the conversation in this context.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {branchMessages.map((message) => (
                        <div 
                          key={message.id} 
                          className="group relative"
                        >
                          <ChatMessageWithBranchHighlight
                            message={message} 
                            onCopy={handleCopy}
                            isInBranch={true}
                            branches={branches}
                            currentBranchId={currentBranchId}
                            onMessageContentMouseUp={handleMessageMouseUp}
                            onBranchIndicatorClick={handleBranchIndicatorClick}
                          />
                          {/* Branch point indicator for nested branches */}
                          {(() => {
                            const nestedBranches = branches.filter(b => b.parentMessageId === message.id);
                            return nestedBranches.length > 0 && (
                              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                {nestedBranches.length} Branch{nestedBranches.length > 1 ? 'es' : ''}
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                      {isCurrentBranch && isLoading && (
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
                      {isCurrentBranch && <div ref={branchMessagesEndRef} />}
                    </div>
                  </div>

                  {/* Branch Input Area - Only for current active branch */}
                  {isCurrentBranch && (
                    <div className="border-t p-4 flex-shrink-0 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                      <form onSubmit={handleSubmit} className="flex gap-2">
                        <div className="flex-1 relative">
                          <textarea
                            ref={branchTextareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Continue this branch conversation..."
                            className="w-full resize-none rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:border-transparent max-h-32 min-h-[48px] shadow-sm border border-green-300 focus:ring-green-500 bg-white"
                            rows={1}
                            disabled={isLoading}
                          />
                          <button
                            type="submit"
                            disabled={!inputValue.trim() || isLoading}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors text-green-600 hover:text-green-800"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </form>
                      
                      <div className="mt-2 text-xs text-center text-green-700">
                        <div className="flex items-center justify-center gap-1">
                          <GitBranch size={12} />
                          <span>Branch conversation • Changes won't affect parent context</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            });

            return columns;
          })()}
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
      
      {/* Settings Popup */}
      <SettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={onSettingsChange}
        currentSettings={settings}
      />
    </div>
  );
};

export default ChatInterface;
