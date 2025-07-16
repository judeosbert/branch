import { useState, useRef, useEffect, useCallback } from 'react';
import { User, Bot, Copy, ThumbsUp, ThumbsDown, GitBranch, MessageCircle, Settings, Plus, History } from 'lucide-react';
import WelcomeScreen from './WelcomeScreen';
import Breadcrumb from './Breadcrumb';
import DraggableMiniMap from './DraggableMiniMap';
import SettingsPopup from './SettingsPopup';
import MessageRenderer from './MessageRenderer';
import MarkdownMessage from './MarkdownMessage';
import EnhancedInput from './EnhancedInput';
import ResizableColumn from './ResizableColumn';

import type { ConversationBranch } from '../types';
import type { SettingsConfig } from './SettingsPopup';
import type { FileAttachment } from './FileUpload';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  branchId?: string;
  attachments?: FileAttachment[];
}

interface ChatInterfaceProps {
  onSendMessage: (message: string, attachments: FileAttachment[], branchId?: string, branchContext?: { selectedText: string; sourceMessageId: string }) => void;
  onCreateBranch: (parentMessageId: string, branchText: string) => Promise<string>;
  messages: Message[];
  branches: ConversationBranch[];
  currentBranchId: string | null;
  onNavigateToBranch: (branchId: string | null) => void;
  isLoading: boolean;
  settings: SettingsConfig;
  onSettingsChange: (settings: SettingsConfig) => void;
  onNewConversation: () => void;
  isHistorySidebarOpen: boolean;
  onToggleHistorySidebar: () => void;
  onAnalyzeFile?: (file: FileAttachment) => Promise<void>;
}

const ChatInterface = ({  onSendMessage, 
  onCreateBranch,
  messages,
  branches,
  currentBranchId,
  onNavigateToBranch,
  isLoading,
  settings,
  onSettingsChange,
  onNewConversation,
  isHistorySidebarOpen,
  onToggleHistorySidebar,
  onAnalyzeFile
}: ChatInterfaceProps) => {
  // Branch creation loading state
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [creatingBranchInfo, setCreatingBranchInfo] = useState<{ messageId: string; branchText: string } | null>(null);
  
  // Create branch from line or block
  const handleLineBranch = useCallback(async (messageId: string, branchText: string) => {
    setIsCreatingBranch(true);
    setCreatingBranchInfo({ messageId, branchText });
    try {
      const branchId = await onCreateBranch(messageId, branchText);
      
      // Navigate to the branch after creation
      onNavigateToBranch(branchId);
      
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreatingBranch(false);
      setCreatingBranchInfo(null);
    }
  }, [onCreateBranch, onNavigateToBranch]);

  // Navigate to existing branch
  const handleSelectBranch = useCallback((branchId: string) => {
    onNavigateToBranch(branchId);
  }, [onNavigateToBranch]);
  const [inputValue, setInputValue] = useState('');
  const [isMiniMapVisible, setIsMiniMapVisible] = useState(true);
  const [showMiniMapTooltip, setShowMiniMapTooltip] = useState(false);
  const [miniMapTooltipShown, setMiniMapTooltipShown] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [lastCompletedMessageId, setLastCompletedMessageId] = useState<string | null>(null);
  const [triggerInputGlow, setTriggerInputGlow] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const branchMessagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // MiniMap tooltip logic
  useEffect(() => {
    // Check if tooltip has been shown before
    const tooltipShown = localStorage.getItem('minimap-tooltip-shown') === 'true';
    setMiniMapTooltipShown(tooltipShown);

    // Show tooltip if minimap is closed, branches exist, and tooltip hasn't been shown
    if (branches.length > 0 && !isMiniMapVisible && !tooltipShown) {
      const timer = setTimeout(() => {
        setShowMiniMapTooltip(true);
      }, 500); // Small delay for better UX

      return () => clearTimeout(timer);
    } else {
      setShowMiniMapTooltip(false);
    }
  }, [branches.length, isMiniMapVisible, miniMapTooltipShown]);

  // Dismiss tooltip on any user action
  useEffect(() => {
    const dismissTooltip = () => {
      if (showMiniMapTooltip) {
        setShowMiniMapTooltip(false);
        setMiniMapTooltipShown(true);
        localStorage.setItem('minimap-tooltip-shown', 'true');
      }
    };

    // Add event listeners for user actions
    const events = ['click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, dismissTooltip, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, dismissTooltip);
      });
    };
  }, [showMiniMapTooltip]);

  // Handle form submission
  const handleSubmit = (input: { content: string; attachments: FileAttachment[] }) => {
    if ((!input.content.trim() && input.attachments.length === 0) || isLoading) return;
    
    // Check if we're in a branch and if this is the first message
    let branchContext: { selectedText: string; sourceMessageId: string } | undefined;
    if (currentBranchId) {
      const currentBranch = branches.find(b => b.id === currentBranchId);
      if (currentBranch && currentBranch.messages.length === 0 && currentBranch.branchContext) {
        // This is the first message in the branch, pass the branch context
        branchContext = currentBranch.branchContext;
      }
    }
    
    onSendMessage(input.content, input.attachments, currentBranchId || undefined, branchContext);
    setInputValue('');
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
          label: branch.name || `Branch ${branchNumber}`,
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

  // Keyboard event listeners - Combined welcome mode and shortcuts
  useEffect(() => {
    console.log('ChatInterface: Setting up keyboard listeners...');
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Calculate welcome mode state at the time of event
      const isWelcomeMode = branches.length === 0 && messages.filter(msg => !msg.branchId).length === 0;
      
      // Don't intercept if user is already in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Welcome mode functionality - capture single characters
      if (isWelcomeMode) {
        console.log('Welcome mode key pressed:', e.key);
        // Don't intercept special keys, function keys, or key combinations
        if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || 
            e.key.length > 1 || // Skip special keys like 'Enter', 'Backspace', etc.
            e.key === ' ' && inputValue.length === 0) { // Skip space if input is empty
          // Continue to check for shortcuts below
        } else if (!isSettingsOpen) {
          // Focus the input and add the character
          if (textareaRef.current) {
            console.log('Setting input value and focusing...');
            e.preventDefault();
            setInputValue(e.key);
            // Use requestAnimationFrame instead of setTimeout
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                try {
                  textareaRef.current.focus();
                  // Set cursor to end of text
                  textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
                  console.log('Focus and cursor positioning successful');
                } catch (error) {
                  console.warn('Failed to focus or set cursor:', error);
                }
              }
            });
            return; // Don't process shortcuts if we captured the key
          }
        }
      }

      // Keyboard shortcuts for column resizing
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
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [branches.length, messages.length, inputValue.length, isSettingsOpen, currentBranchId, getColumnWidth, updateColumnWidth]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 w-full max-w-full overflow-hidden" style={{ maxWidth: '100vw', maxHeight: '100vh' }}>
      {/* Top Header Bar with Title, Navigation, and MiniMap */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-start justify-between p-4 gap-4 w-full max-w-full">
          {/* Left side: Title and Navigation in Column */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              {/* History Toggle Button */}
              <button
                onClick={onToggleHistorySidebar}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title={isHistorySidebarOpen ? 'Close History' : 'Open History'}
              >
                <History size={20} />
              </button>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentBranchId ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                <GitBranch size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-gray-900">
                    {currentBranchId ? (() => {
                      const branch = branches.find(b => b.id === currentBranchId);
                      return branch?.name || 'Branch';
                    })() : 'Branch'}
                  </h1>
                  {/* New Conversation Button - Right after Branch title */}
                  <button
                    onClick={onNewConversation}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                    title="Start New Conversation"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {currentBranchId && (
                  <div className="text-sm text-green-700">
                    {(() => {
                      const branch = branches.find(b => b.id === currentBranchId);
                      return branch ? (
                        <MarkdownMessage 
                          content={`"${branch.branchText.substring(0, 50)}..."`}
                          className="text-sm text-green-700 mb-0"
                        />
                      ) : '';
                    })()}
                  </div>
                )}
              </div>
              
              {/* MiniMap Toggle Button - Show when branches exist but MiniMap is hidden */}
              {(branches.length > 0 && !isMiniMapVisible) && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsMiniMapVisible(true);
                      setShowMiniMapTooltip(false);
                      setMiniMapTooltipShown(true);
                      localStorage.setItem('minimap-tooltip-shown', 'true');
                    }}
                    className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded-lg transition-colors mr-2"
                    title="Show Branch Map"
                  >
                    <GitBranch size={20} />
                  </button>
                  
                  {/* Tooltip */}
                  {showMiniMapTooltip && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
                      <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                        Mini-Map
                        {/* Tooltip arrow */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900"></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Mock Mode Indicator - Show when mock AI is enabled */}
              {settings.aiEngine === 'mock' && (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded-lg mr-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Mock Mode enabled</span>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-orange-600 hover:text-orange-800 text-xs underline"
                    title="Change AI engine in settings"
                  >
                    Change in Settings
                  </button>
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
      <div className="flex-1 relative w-full max-w-full overflow-hidden min-h-0">
        {/* Horizontal Column Container */}
        <div className={`flex h-full column-scroll scrollbar-hide w-full max-w-full ${
          branches.length > 0 ? 'overflow-x-auto overflow-y-hidden' : 'justify-center overflow-hidden'
        }`} style={{ maxWidth: '100vw', width: '100%', height: '100%' }}>
          
          {/* No branches - Simple centered layout */}
          {branches.length === 0 && (
            <div className="flex flex-col h-full bg-white w-full overflow-hidden">
              {/* Main Content Area - Either Welcome Screen or Messages */}
              <div className="flex-1 overflow-y-auto bg-white min-h-0"
                   onScroll={(e) => e.stopPropagation()}>
                {/* Welcome Screen Content - Show when no messages exist */}
                {messages.filter(msg => !msg.branchId).length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <WelcomeScreen onSelectPrompt={(prompt) => {
                      setInputValue(prompt);
                      setTriggerInputGlow(true);
                      // Reset the glow trigger after a short delay
                      setTimeout(() => setTriggerInputGlow(false), 100);
                      textareaRef.current?.focus();
                    }} />
                  </div>
                )}

                {/* Scrollable Messages Area - Show when messages exist */}
                {messages.filter(msg => !msg.branchId).length > 0 && (
                  <div className="w-full">
                    <div className="divide-y divide-gray-100 p-4">
                      {/* MAIN CHAT AREA */}
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
                              <MessageRenderer
                                content={message.content}
                                attachments={message.attachments}
                                messageId={message.id}
                                sender={message.sender}
                                onBranch={handleLineBranch}
                                onSelectBranch={handleSelectBranch}
                                onCopy={handleCopy}
                                onAnalyzeFile={onAnalyzeFile}
                                branches={branches.map(b => ({ 
                                  parentMessageId: b.parentMessageId, 
                                  branchText: b.branchText,
                                  id: b.id,
                                  name: b.name
                                }))}
                                isCreatingBranch={isCreatingBranch}
                                creatingBranchInfo={creatingBranchInfo}
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
                      <div ref={messagesEndRef} className="h-4" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area - Fixed at bottom */}
              <div className="border-t p-4 bg-white border-gray-200 flex-shrink-0">
                <EnhancedInput
                  ref={textareaRef}
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSubmit}
                  placeholder="Message Branch AI..."
                  disabled={isLoading}
                  className="w-full"
                  triggerGlow={triggerInputGlow}
                />
                
                <div className="mt-2 text-xs text-center text-gray-500 w-full">
                  <span>Branch AI can make mistakes. Check important info.</span>
                </div>
              </div>
            </div>
          )}

          {/* With branches - Column layout */}
          {branches.length > 0 && (
            <>
              {/* Main Chat Column */}
              <ResizableColumn
                initialWidth={384}
                minWidth={280}
                maxWidth={600}
                className="h-full flex flex-col bg-white column-snap border-r border-gray-200 overflow-hidden"
                isLast={!currentBranchId}
                onWidthChange={(width) => updateColumnWidth('main', width)}
              >
                <div className="flex flex-col h-full">
                  {/* Column Header - Fixed at top */}
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

                  {/* Scrollable Messages Area - Expandable between header and input */}
                  <div className="flex-1 overflow-y-auto bg-white min-h-0"
                       onScroll={(e) => e.stopPropagation()}>
                    <div className="divide-y divide-gray-100 p-4">
                      {/* MAIN COLUMN MESSAGES */}
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
                              <MessageRenderer
                                content={message.content}
                                attachments={message.attachments}
                                messageId={message.id}
                                sender={message.sender}
                                onBranch={handleLineBranch}
                                onSelectBranch={handleSelectBranch}
                                onCopy={handleCopy}
                                onAnalyzeFile={onAnalyzeFile}
                                branches={branches.map(b => ({ 
                                  parentMessageId: b.parentMessageId, 
                                  branchText: b.branchText,
                                  id: b.id,
                                  name: b.name
                                }))}
                                isCreatingBranch={isCreatingBranch}
                                creatingBranchInfo={creatingBranchInfo}
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
                      <div ref={messagesEndRef} className="h-4" />
                    </div>
                  </div>

                  {/* Input Area - Fixed at bottom, show only when not in active branch */}
                  {!currentBranchId && (
                    <div className="border-t p-4 bg-white border-gray-200 flex-shrink-0">
                      <EnhancedInput
                        value={inputValue}
                        onChange={setInputValue}
                        onSubmit={handleSubmit}
                        placeholder="Message Branch AI..."
                        disabled={isLoading}
                        className="w-full"
                        triggerGlow={triggerInputGlow}
                      />
                      
                      <div className="mt-2 text-xs text-center text-gray-500 w-full">
                        <span>Branch AI can make mistakes. Check important info.</span>
                      </div>
                    </div>
                  )}
                </div>
              </ResizableColumn>
            </>
          )}

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
                  className={`h-full flex flex-col bg-white column-snap overflow-hidden ${
                    index < branchPath.length - 1 ? 'border-r border-gray-200' : ''
                  }`}
                  isLast={index === branchPath.length - 1}
                  onWidthChange={(width) => updateColumnWidth(`branch-${branch.id}`, width)}
                >
                  <div className="flex flex-col h-full">
                    {/* Column Header - Fixed at top */}
                    <div className={`border-b border-gray-200 p-3 flex-shrink-0 ${
                      isCurrentBranch ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2 pl-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isCurrentBranch ? 'bg-green-600' : 'bg-green-500'
                        }`}>
                          <GitBranch size={12} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {branch.name || `Branch ${branchNumber}`} {index < branchPath.length - 1 ? '(Parent)' : '(Active)'}
                          </h3>
                          <div className="text-xs text-green-700 line-clamp-1">
                            <MarkdownMessage 
                              content={`"${branch.branchText}"`}
                              className="text-xs text-green-700 mb-0"
                            />
                          </div>
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

                    {/* Scrollable Branch Messages Area - Expandable between header and input */}
                    <div className="flex-1 overflow-y-auto bg-white min-h-0"
                         onScroll={(e) => e.stopPropagation()}>
                      <div className="divide-y divide-gray-100 p-4">
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
                                <div className="text-sm text-green-700 bg-white border border-green-200 rounded-lg p-3">
                                  <MessageRenderer
                                    content={branch.branchText}
                                    messageId={`branch-origin-${branch.id}`}
                                    sender="user"
                                    onBranch={() => {}} // No branching from branch origin
                                    onSelectBranch={() => {}} // No branch selection from branch origin
                                    onCopy={() => {}} // No copy from branch origin
                                    branches={[]}
                                    isCreatingBranch={isCreatingBranch}
                                    creatingBranchInfo={creatingBranchInfo}
                                  />
                                </div>
                                <p className="text-xs text-green-600 mt-2">
                                  This branch was created from the text above. Start typing above to continue the conversation in this context.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {branchMessages.map((message) => {
                          const isFlashing = lastCompletedMessageId === message.id;
                          return (
                            <div key={message.id} className={`flex items-start gap-3 py-2 group transition-all duration-700 ${
                              isFlashing ? 'bg-green-100' : ''
                            }`}>
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                {message.sender === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                              </div>
                              <div className="flex-1 relative">
                                {/* BRANCH MESSAGE RENDERER */}
                                <MessageRenderer
                                  content={message.content}
                                  attachments={message.attachments}
                                  messageId={message.id}
                                  sender={message.sender}
                                  onBranch={handleLineBranch}
                                  onSelectBranch={handleSelectBranch}
                                  onCopy={handleCopy}
                                  onAnalyzeFile={onAnalyzeFile}
                                  branches={branches.map(b => ({ 
                                    parentMessageId: b.parentMessageId, 
                                    branchText: b.branchText,
                                    id: b.id,
                                    name: b.name
                                  }))}
                                  isCreatingBranch={isCreatingBranch}
                                  creatingBranchInfo={creatingBranchInfo}
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
                        {isCurrentBranch && <div ref={branchMessagesEndRef} className="h-4" />}
                      </div>
                    </div>

                    {/* Input Area - Fixed at bottom, show only in active branch column */}
                    {isCurrentBranch && (
                      <div className="border-t p-4 bg-white border-gray-200 flex-shrink-0">
                        <EnhancedInput
                          value={inputValue}
                          onChange={setInputValue}
                          onSubmit={handleSubmit}
                          placeholder="Continue this branch conversation..."
                          disabled={isLoading}
                          className="w-full border-green-300 focus:ring-green-500"
                          triggerGlow={triggerInputGlow}
                        />
                        
                        <div className="mt-2 text-xs text-center text-green-600 w-full">
                          <div className="flex items-center justify-center gap-1">
                            <GitBranch size={12} />
                            <span>Branch conversation • Changes won't affect parent context</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
