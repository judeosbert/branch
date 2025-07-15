import { useState, useEffect, useCallback, useMemo } from 'react';
import ChatInterface from './components/ChatInterface';
import ConversationHistorySidebar from './components/ConversationHistorySidebar';
import { EnhancedAIService } from './services/enhancedAIService';
import { SettingsService } from './services/settingsService';
import { versionService } from './services/versionService';
import { conversationHistoryService, type ConversationHistory } from './services/conversationHistoryService';
import { unifyCodeBlocks } from './utils/codeBlockUtils';
import type { SettingsConfig } from './components/SettingsPopup';
import type { FileAttachment } from './components/FileUpload';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationBranch } from './types';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  branchId?: string;
  attachments?: FileAttachment[];
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [branches, setBranches] = useState<ConversationBranch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsConfig>(() => SettingsService.loadSettings());
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Create AI service instance with current settings
  const aiService = useMemo(() => {
    try {
      return new EnhancedAIService(settings);
    } catch (error) {
      console.error('Error creating AI service:', error);
      // Return a fallback service or handle gracefully
      return null;
    }
  }, [settings]);

  // Handle settings updates
  const handleSettingsChange = useCallback((newSettings: SettingsConfig) => {
    try {
      setSettings(newSettings);
      SettingsService.saveSettings(newSettings);
      versionService.incrementChange(); // Track settings change
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, []);

  // Initialize conversation history
  useEffect(() => {
    try {
      const history = conversationHistoryService.getHistory();
      setConversationHistory(history);
      
      // Always start with a new conversation on page load
      const newId = conversationHistoryService.createNewConversation();
      setCurrentConversationId(newId);
      setMessages([]);
      setBranches([]);
      setCurrentBranchId(null);
    } catch (error) {
      console.error('Error initializing conversation history:', error);
    }
  }, []);

  // Load initial messages and convert to chat format
  useEffect(() => {
    if (!aiService) return;
    
    try {
      const initialMessages = aiService.getMessageHistory();
      const chatMessages: Message[] = initialMessages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp,
        branchId: undefined, // AIService doesn't include branchId
      }));
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading initial messages:', error);
    }
  }, [aiService]); // Re-run when aiService changes

  // Helper function to get relevant conversation history for a branch
  const getRelevantHistory = useCallback((branchId?: string | null) => {
    if (!branchId) {
      // Main conversation - return all main messages
      return messages.filter(msg => !msg.branchId).map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp
      }));
    }

    // Find the branch and build full history
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return [];

    const history: Array<{ id: string; content: string; sender: 'user' | 'assistant'; timestamp: Date }> = [];
    
    // Get messages up to the branch point
    const parentMessage = messages.find(msg => msg.id === branch.parentMessageId);
    if (parentMessage) {
      const parentIndex = messages.findIndex(msg => msg.id === parentMessage.id);
      const mainMessages = messages.slice(0, parentIndex + 1).filter(msg => !msg.branchId);
      history.push(...mainMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp
      })));
    }
    
    // Add branch-specific messages
    history.push(...branch.messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      timestamp: msg.timestamp
    })));
    
    return history;
  }, [messages, branches]);

  const handleSendMessage = useCallback(async (messageContent: string, attachments: FileAttachment[] = [], branchId?: string, branchContext?: { selectedText: string; sourceMessageId: string }) => {
    if (isLoading) return;
    
    // Track message send as a change
    versionService.incrementChange();
    
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content: unifyCodeBlocks(messageContent), // Apply code block unification
      sender: 'user',
      timestamp: new Date(),
      branchId: branchId || currentBranchId || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Create AI message placeholder for streaming
    const aiMessageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      sender: 'assistant',
      timestamp: new Date(),
      branchId: branchId || currentBranchId || undefined,
    };
    
    setMessages(prev => [...prev, aiMessage]);
    
    try {
      // Build conversation history for the current branch
      const relevantHistory = getRelevantHistory(branchId || currentBranchId);
      
      // Convert to AI service format
      const aiHistory = relevantHistory.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp,
        attachments: (messages.find(m => m.id === msg.id)?.attachments) || []
      }));
      
      // Prepare branch context if provided
      let aiBranchContext: { selectedText: string; sourceMessageId: string; sourceMessage: string } | undefined;
      if (branchContext) {
        const sourceMessage = messages.find(m => m.id === branchContext.sourceMessageId);
        if (sourceMessage) {
          aiBranchContext = {
            selectedText: branchContext.selectedText,
            sourceMessageId: branchContext.sourceMessageId,
            sourceMessage: sourceMessage.content
          };
        }
      }
      
      // Check if AI service is available
      if (!aiService) {
        console.error('AI service not available');
        setIsLoading(false);
        return;
      }
      
      // Stream the response
      const stream = aiService.sendMessageStream(messageContent, attachments, aiHistory, aiBranchContext);
      let accumulatedContent = '';
      
      for await (const chunk of stream) {
        accumulatedContent += chunk;
        
        // Update the AI message content with accumulated response
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: accumulatedContent }
            : msg
        ));
      }
      
      // Update branch messages if we're in a branch
      if (branchId || currentBranchId) {
        const targetBranchId = branchId || currentBranchId;
        setBranches(prev => prev.map(branch => {
          if (branch.id === targetBranchId) {
            return {
              ...branch,
              messages: [
                ...branch.messages,
                userMessage,
                { ...aiMessage, content: accumulatedContent }
              ]
            };
          }
          return branch;
        }));
      }
      
      // Auto-save conversation after successful AI response
      setTimeout(() => {
        const conversationId = conversationHistoryService.saveCurrentConversation(
          messages.concat([userMessage, { ...aiMessage, content: accumulatedContent }]),
          branches,
          currentBranchId
        );
        setCurrentConversationId(conversationId);
        const updatedHistory = conversationHistoryService.getHistory();
        setConversationHistory(updatedHistory);
      }, 100); // Small delay to ensure state is updated
    } catch (error) {
      console.error('AI service error:', error);
      
      // Update the message to show error
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentBranchId, aiService, getRelevantHistory]);

  // Function to generate a meaningful branch title using AI
  const generateBranchTitle = useCallback(async (branchText: string, parentMessageId: string): Promise<string> => {
    console.log('🌳 Generating branch title for:', branchText.substring(0, 50) + '...');
    
    try {
      // Find the parent message
      const parentMessage = messages.find(m => m.id === parentMessageId);
      if (!parentMessage) {
        console.log('⚠️ Parent message not found, using fallback title');
        return `Branch: ${branchText.substring(0, 30)}...`;
      }

      // Get the conversation history up to this point
      const history = getRelevantHistory(parentMessage.branchId || null);
      
      // Check if AI service is available
      if (!aiService) {
        console.log('⚠️ AI service not available, using fallback title');
        return `Branch from "${branchText.substring(0, 20)}..."`;
      }
      
      // Use AI service to generate title
      console.log('🤖 Requesting AI-generated title...');
      const title = await aiService.generateBranchTitle(branchText, history);
      console.log('✅ AI-generated title:', title);
      
      return title;
    } catch (error) {
      console.error('❌ Error generating branch title:', error);
      // Fallback to simple title
      const cleanText = branchText.trim().substring(0, 40);
      const fallbackTitle = `Branch: ${cleanText}${branchText.length > 40 ? '...' : ''}`;
      console.log('⚠️ Using fallback title:', fallbackTitle);
      return fallbackTitle;
    }
  }, [messages, aiService, getRelevantHistory]);

  const handleCreateBranch = useCallback(async (parentMessageId: string, branchText: string) => {
    const branchId = uuidv4();
    
    // Track branch creation as a change
    versionService.incrementChange();
    
    // ==================================================================================
    // CRITICAL CORE BRANCHING LOGIC - DO NOT MODIFY WITHOUT EXPLICIT REQUEST
    // ==================================================================================
    // This logic ensures proper branch hierarchy and prevents graph corruption.
    // Key principles:
    // 1. Branches from the same parent message should be SIBLINGS, not nested
    // 2. Only branches created from messages within a branch should have parentBranchId
    // 3. All branches from main chat messages should be root-level (depth 0)
    // ==================================================================================
    
    let depth = 0;
    let parentBranchId: string | undefined;
    
    // Find the parent message to determine branch placement
    const parentMessage = messages.find(m => m.id === parentMessageId);
    
    if (parentMessage && parentMessage.branchId) {
      // Parent message is within a branch - create nested branch
      const parentBranch = branches.find(b => b.id === parentMessage.branchId);
      if (parentBranch) {
        depth = parentBranch.depth + 1;
        parentBranchId = parentMessage.branchId;
      }
    } else {
      // Parent message is in main chat - always create root-level branch
      // This ensures all branches from main chat are siblings, regardless of current context
      depth = 0;
      parentBranchId = undefined;
    }
    
    // ==================================================================================
    // END CRITICAL CORE BRANCHING LOGIC
    // ==================================================================================

    // Generate AI-powered title
    const branchTitle = await generateBranchTitle(branchText, parentMessageId);
    
    const newBranch: ConversationBranch = {
      id: branchId,
      name: branchTitle,
      parentMessageId,
      parentBranchId,
      branchText,
      branchContext: {
        selectedText: branchText,
        sourceMessageId: parentMessageId,
      },
      messages: [],
      createdAt: new Date(),
      depth,
    };
    
    setBranches(prev => [...prev, newBranch]);
    
    // Auto-save conversation after branch creation
    setTimeout(() => {
      const conversationId = conversationHistoryService.saveCurrentConversation(
        messages,
        [...branches, newBranch],
        currentBranchId
      );
      setCurrentConversationId(conversationId);
      const updatedHistory = conversationHistoryService.getHistory();
      setConversationHistory(updatedHistory);
    }, 100);
    
    return branchId;
  }, [currentBranchId, branches, messages, generateBranchTitle]);

  const handleNavigateToBranch = useCallback((branchId: string | null) => {
    setCurrentBranchId(branchId);
    versionService.incrementChange(); // Track branch navigation as a change
  }, []);

  // Conversation history handlers
  const handleSelectConversation = useCallback((conversationId: string) => {
    const conversation = conversationHistoryService.loadConversation(conversationId);
    if (conversation) {
      setMessages(conversation.messages);
      setBranches(conversation.branches);
      setCurrentBranchId(conversation.currentBranchId);
      setCurrentConversationId(conversationId);
      versionService.incrementChange(); // Track conversation switch
    }
  }, []);

  const handleNewConversation = useCallback(() => {
    const newId = conversationHistoryService.createNewConversation();
    setMessages([]);
    setBranches([]);
    setCurrentBranchId(null);
    setCurrentConversationId(newId);
    setIsHistorySidebarOpen(false);
    versionService.incrementChange(); // Track new conversation
  }, []);

  const handleDeleteConversation = useCallback((conversationId: string) => {
    conversationHistoryService.deleteConversation(conversationId);
    const updatedHistory = conversationHistoryService.getHistory();
    setConversationHistory(updatedHistory);
    
    // If we deleted the current conversation, start a new one
    if (conversationId === currentConversationId) {
      handleNewConversation();
    }
  }, [currentConversationId, handleNewConversation, conversationHistory]);

  const handleClearHistory = useCallback(() => {
    if (confirm('Are you sure you want to clear all conversation history? This action cannot be undone.')) {
      conversationHistoryService.clearHistory();
      setConversationHistory([]);
      handleNewConversation();
    }
  }, [handleNewConversation]);

  const handleToggleHistorySidebar = useCallback(() => {
    setIsHistorySidebarOpen(!isHistorySidebarOpen);
  }, [isHistorySidebarOpen]);

  // Handle file analysis
  const handleAnalyzeFile = useCallback(async (file: FileAttachment) => {
    try {
      if (!aiService) {
        console.error('AI service not available for file analysis');
        return;
      }
      
      const analysis = await aiService.analyzeFile(file);
      
      // Find the message with this file and update it with analysis results
      setMessages(prev => prev.map(msg => 
        msg.attachments?.some(attachment => attachment.id === file.id) 
          ? {
              ...msg,
              attachments: msg.attachments?.map(attachment => 
                attachment.id === file.id 
                  ? { ...attachment, analysisResult: analysis }
                  : attachment
              )
            }
          : msg
      ));
    } catch (error) {
      console.error('Error analyzing file:', error);
    }
  }, [aiService]);

  // Filter messages based on current branch
  const getDisplayMessages = () => {
    if (!currentBranchId) {
      // Show main conversation (messages without branchId)
      return messages.filter(msg => !msg.branchId);
    } else {
      // Show messages up to the branch point plus all messages in the branch path
      const branch = branches.find(b => b.id === currentBranchId);
      if (!branch) return messages;
      
      // Build the full branch path
      const buildBranchPath = (branchId: string): string[] => {
        const currentBranch = branches.find(b => b.id === branchId);
        if (!currentBranch) return [];
        
        if (currentBranch.parentBranchId) {
          return [...buildBranchPath(currentBranch.parentBranchId), branchId];
        }
        return [branchId];
      };
      
      const branchPath = buildBranchPath(currentBranchId);
      
      // Find the root parent message (where the first branch started)
      let rootParentMessage = branch;
      while (rootParentMessage.parentBranchId) {
        const parentBranch = branches.find(b => b.id === rootParentMessage.parentBranchId);
        if (!parentBranch) break;
        rootParentMessage = parentBranch;
      }
      
      // Get all messages up to and including the root parent message
      const parentIndex = messages.findIndex(msg => msg.id === rootParentMessage.parentMessageId);
      const mainMessages = messages.slice(0, parentIndex + 1).filter(msg => !msg.branchId);
      
      // Get messages from all branches in the path
      const branchMessages = messages.filter(msg => 
        msg.branchId && branchPath.includes(msg.branchId)
      );
      
      return [...mainMessages, ...branchMessages];
    }
  };

  // Get all branches that should be visible in the current context
  const getVisibleBranches = () => {
    if (!currentBranchId) {
      // In main chat, show all branches
      return branches;
    } else {
      // In a branch, show only related branches
      const currentBranch = branches.find(b => b.id === currentBranchId);
      if (!currentBranch) return branches;
      
      // Get the full branch path to show context
      const buildBranchPath = (branchId: string): string[] => {
        const branch = branches.find(b => b.id === branchId);
        if (!branch) return [];
        
        if (branch.parentBranchId) {
          return [...buildBranchPath(branch.parentBranchId), branchId];
        }
        return [branchId];
      };
      
      const branchPath = buildBranchPath(currentBranchId);
      
      // Return branches that are in the path or are siblings/children of branches in the path
      return branches.filter(branch => 
        branchPath.includes(branch.id) || 
        (branch.parentBranchId && branchPath.includes(branch.parentBranchId)) ||
        branchPath.some(pathBranchId => {
          const pathBranch = branches.find(b => b.id === pathBranchId);
          return pathBranch && branch.parentMessageId === pathBranch.parentMessageId;
        })
      );
    }
  };

  return (
    <div className="App h-screen w-screen overflow-hidden max-w-full bg-white" style={{ maxWidth: '100vw' }}>
      <ConversationHistorySidebar
        isOpen={isHistorySidebarOpen}
        onToggle={handleToggleHistorySidebar}
        history={conversationHistory}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearHistory={handleClearHistory}
      />
      
      <div className={`h-full transition-all duration-300 ${isHistorySidebarOpen ? 'ml-80' : 'ml-0'} max-w-full overflow-hidden bg-white`} style={{ maxWidth: isHistorySidebarOpen ? 'calc(100vw - 320px)' : '100vw' }}>
        <ChatInterface 
          messages={getDisplayMessages()}
          branches={getVisibleBranches()}
          currentBranchId={currentBranchId}
          onSendMessage={handleSendMessage}
          onCreateBranch={handleCreateBranch}
          onNavigateToBranch={handleNavigateToBranch}
          isLoading={isLoading}
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onNewConversation={handleNewConversation}
          isHistorySidebarOpen={isHistorySidebarOpen}
          onToggleHistorySidebar={handleToggleHistorySidebar}
          onAnalyzeFile={handleAnalyzeFile}
        />
      </div>
    </div>
  );
}

export default App;
