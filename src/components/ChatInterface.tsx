import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, User, Bot, Copy, ThumbsUp, ThumbsDown, GitBranch, MessageCircle, Settings } from 'lucide-react';
import WelcomeScreen from './WelcomeScreen';
import Breadcrumb from './Breadcrumb';
import DraggableMiniMap from './DraggableMiniMap';
import SettingsPopup from './SettingsPopup';
import BranchableMessage from './BranchableMessage';
import ResizableColumn from './ResizableColumn';
import type { ConversationBranch } from '../types';
import type { SettingsConfig } from './SettingsPopup';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  branchId?: string;
}

interface ChatInterfaceProps {
  onSendMessage: (message: string, branchId?: string, branchContext?: { selectedText: string; sourceMessageId: string }) => void;
  onCreateBranch: (parentMessageId: string, branchText: string) => Promise<string>;
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
  // Create branch from line or block
  const handleLineBranch = useCallback(async (messageId: string, branchText: string) => {
    try {
      const branchId = await onCreateBranch(messageId, branchText);
      onNavigateToBranch(branchId);
    } catch (e) {
      console.error(e);
    }
  }, [onCreateBranch, onNavigateToBranch]);
  const [inputValue, setInputValue] = useState('');
  const [isMiniMapVisible, setIsMiniMapVisible] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [lastCompletedMessageId, setLastCompletedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const branchMessagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const branchTextareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const prevIsLoadingRef = useRef(isLoading);

  // Auto scroll to bottom when new messages arrive - but respect user scrolling
  useEffect(() => {
    // Only auto-scroll during loading, not when it finishes
    const scrollToBottom = () => {
      if (userHasScrolled || !isLoading) return; // Don't auto-scroll if user has manually scrolled OR if loading just finished
      
      if (currentBranchId && branchMessagesEndRef.current) {
        const container = branchMessagesEndRef.current.parentElement;
        if (container) {
          const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 150;
          if (isNearBottom) {
            branchMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }
      } else if (messagesEndRef.current) {
        const container = messagesEndRef.current.parentElement;
        if (container) {
          const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 150;
          if (isNearBottom) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    // Only auto-scroll during loading
    if (isLoading) {
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, currentBranchId, isLoading, userHasScrolled]);

  // Detect when streaming just completed and trigger flash effect
  useEffect(() => {
    const wasLoading = prevIsLoadingRef.current;
    const isNowComplete = wasLoading && !isLoading;
    
    if (isNowComplete && messages.length > 0) {
      // Find the last message to flash
      const lastMessage = currentBranchId 
        ? messages.filter(m => m.branchId === currentBranchId).pop()
        : messages.filter(m => !m.branchId).pop();
      
      if (lastMessage && lastMessage.sender === 'assistant') {
        setLastCompletedMessageId(lastMessage.id);
        // Clear the flash after animation completes
        setTimeout(() => setLastCompletedMessageId(null), 1500);
      }
    }
    
    // Update the ref at the end to avoid multiple triggers
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, currentBranchId]); // Removed messages dependency to prevent multiple triggers

  // Reset user scroll state when new conversation starts or branch changes
  useEffect(() => {
    setUserHasScrolled(false);
  }, [currentBranchId]);

  // Detect user scrolling to disable auto-scroll
  useEffect(() => {
    const detectUserScroll = (container: HTMLElement) => {
      const handleScroll = () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Set a timeout to detect if user has stopped scrolling
        scrollTimeoutRef.current = window.setTimeout(() => {
          const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 150;
          
          // If user scrolled away from bottom, mark as manually scrolled
          if (!isAtBottom && isLoading) {
            setUserHasScrolled(true);
          }
          // If user scrolled back to bottom, allow auto-scroll again
          else if (isAtBottom) {
            setUserHasScrolled(false);
          }
        }, 150);
      };

      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    };

    // Set up scroll detection for main messages
    if (messagesEndRef.current?.parentElement) {
      const cleanup1 = detectUserScroll(messagesEndRef.current.parentElement);
      
      // Set up scroll detection for branch messages if in branch mode
      const cleanup2 = currentBranchId && branchMessagesEndRef.current?.parentElement 
        ? detectUserScroll(branchMessagesEndRef.current.parentElement)
        : () => {};

      return () => {
        cleanup1();
        cleanup2();
      };
    }
  }, [currentBranchId, isLoading]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    // Check if we're in a branch and if this is the first message
    let branchContext: { selectedText: string; sourceMessageId: string } | undefined;
    if (currentBranchId) {
      const currentBranch = branches.find(b => b.id === currentBranchId);
      if (currentBranch && currentBranch.messages.length === 0 && currentBranch.branchContext) {
        // This is the first message in the branch, pass the branch context
        branchContext = currentBranch.branchContext;
      }
    }
    
    onSendMessage(inputValue, currentBranchId || undefined, branchContext);
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

  // Helper functions for column width management
  const getColumnWidth = useCallback((columnId: string, defaultWidth: number = 384) => {
    // Check localStorage first, then state, then default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`column-width-${columnId}`);
      if (saved) {
        const parsedWidth = parseInt(saved, 10);
        if (!isNaN(parsedWidth)) {
          return parsedWidth;
        }
      }
    }
    return columnWidths[columnId] || defaultWidth;
  }, [columnWidths]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: width
    }));
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(`column-width-${columnId}`, width.toString());
    }
  }, []);

  // Keyboard shortcuts for column resizing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + [ : Narrow current column
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        if (currentBranchId) {
          const currentWidth = getColumnWidth(`branch-${currentBranchId}`, 384);
          const newWidth = Math.max(280, currentWidth - 50);
          updateColumnWidth(`branch-${currentBranchId}`, newWidth);
        } else {
          const currentWidth = getColumnWidth('main', 384);
          const newWidth = Math.max(280, currentWidth - 50);
          updateColumnWidth('main', newWidth);
        }
      }

      // Ctrl/Cmd + ] : Widen current column
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        if (currentBranchId) {
          const currentWidth = getColumnWidth(`branch-${currentBranchId}`, 384);
          const newWidth = Math.min(600, currentWidth + 50);
          updateColumnWidth(`branch-${currentBranchId}`, newWidth);
        } else {
          const currentWidth = getColumnWidth('main', 384);
          const newWidth = Math.min(600, currentWidth + 50);
          updateColumnWidth('main', newWidth);
        }
      }

      // Ctrl/Cmd + 0 : Reset current column to default width
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        if (currentBranchId) {
          updateColumnWidth(`branch-${currentBranchId}`, 384);
        } else {
          updateColumnWidth('main', 384);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentBranchId, getColumnWidth, updateColumnWidth]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Header Bar with Title, Navigation, and MiniMap */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-start justify-between p-4 gap-4">
          {/* Left side: Title and Navigation in Column */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentBranchId ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                <GitBranch size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-gray-900">
                  Branch
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
              
              {/* MiniMap Toggle Button - Show when branches exist but MiniMap is hidden */}
              {(branches.length > 0 && !isMiniMapVisible) && (
                <button
                  onClick={() => setIsMiniMapVisible(true)}
                  className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-lg transition-colors mr-2"
                  title="Show Branch Map"
                >
                  <GitBranch size={20} />
                </button>
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
      <div className="flex-1 relative">
        {/* Horizontal Column Container */}
        <div className={`flex h-full column-scroll scrollbar-hide ${
          branches.length > 0 ? 'overflow-x-auto' : 'justify-center'
        }`}>
          {/* Main Chat Column */}
          <ResizableColumn
            initialWidth={384}
            minWidth={280}
            maxWidth={600}
            className={`h-full flex flex-col bg-white column-snap ${
              branches.length > 0 ? 'border-r border-gray-200' : ''
            }`}
            isLast={!currentBranchId}
            onWidthChange={(width) => updateColumnWidth('main', width)}
          >
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
                <div className={`${branches.length === 0 ? 'max-w-4xl mx-auto' : ''}`}>
                  <div className="divide-y divide-gray-100">
                    {messages.filter(msg => !msg.branchId).map((message) => {
                      const isFlashing = lastCompletedMessageId === message.id;
                      return (
                        <div key={message.id} className={`flex items-start gap-3 py-2 group transition-all duration-700 ${
                          isFlashing ? 'bg-green-100' : ''
                        }`}>
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                            {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                          </div>
                          <div className="flex-1 relative">
                            <BranchableMessage
                              content={message.content}
                              messageId={message.id}
                              onBranch={handleLineBranch}
                              branches={branches}
                            />
                            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleCopy(message.content)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="Copy message">
                                <Copy size={14} />
                              </button>
                              <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="Good response">
                                <ThumbsUp size={14} />
                              </button>
                              <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="Bad response">
                                <ThumbsDown size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isLoading && !currentBranchId && (
                      <div className="flex gap-3 p-3 bg-gray-50">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <Bot size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">Branch AI</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} className="h-20" />
                </div>
              )}
            </div>

            {/* Column Input Area - Show when no current branch is selected */}
            {(!currentBranchId) && (
              <div className={`border-t p-4 flex-shrink-0 bg-white border-gray-200 ${branches.length === 0 ? 'max-w-4xl mx-auto w-full' : ''}`}>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message Branch AI..."
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
                  Branch AI can make mistakes. Check important info.
                </div>
              </div>
            )}
          </ResizableColumn>

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
                <ResizableColumn
                  key={`branch-${branch.id}`}
                  initialWidth={getColumnWidth(`branch-${branch.id}`, 384)}
                  minWidth={280}
                  maxWidth={600}
                  className={`h-full flex flex-col bg-white column-snap ${
                    index < branchPath.length - 1 ? 'border-r border-gray-200' : ''
                  }`}
                  isLast={index === branchPath.length - 1}
                  onWidthChange={(width) => updateColumnWidth(`branch-${branch.id}`, width)}
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
                      
                      {branchMessages.map((message) => {
                        const isFlashing = lastCompletedMessageId === message.id;
                        return (
                          <div key={message.id} className={`flex items-start gap-3 py-1 group transition-all duration-700 ${
                            isFlashing ? 'bg-green-100' : ''
                          }`}>
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className="flex-1 relative">
                              <BranchableMessage
                                content={message.content}
                                messageId={message.id}
                                onBranch={handleLineBranch}
                                branches={branches}
                              />
                              {/* nested branches indicator */}
                              {(() => {
                                const nestedBranches = branches.filter(b => b.parentMessageId === message.id);
                                return nestedBranches.length > 0 && (
                                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                    {nestedBranches.length} Branch{nestedBranches.length > 1 ? 'es' : ''}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                      {isCurrentBranch && isLoading && (
                        <div className="flex gap-3 p-3 bg-gray-50">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                            <Bot size={16} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">Branch AI</span>
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
                </ResizableColumn>
              );
            });

            return columns;
          })()}
        </div>
      </div>
      
      {/* Settings Popup */}
      <SettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={onSettingsChange}
        currentSettings={settings}
      />
      
      {/* Draggable MiniMap - Floating with corner snapping */}
      {(branches.length > 0 && isMiniMapVisible) && (
        <DraggableMiniMap
          branches={branches}
          currentBranchId={currentBranchId}
          onNavigateToBranch={onNavigateToBranch}
          onClose={() => setIsMiniMapVisible(false)}
          totalMessages={messages.filter(m => !m.branchId).length}
        />
      )}
    </div>
  );
};

export default ChatInterface;
