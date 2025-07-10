import { useState, useEffect, useCallback } from 'react';
import ChatInterface from './components/ChatInterface';
import { AIService } from './services/aiService';
import { SettingsService } from './services/settingsService';
import type { SettingsConfig } from './components/SettingsPopup';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationBranch } from './types';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  branchId?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [branches, setBranches] = useState<ConversationBranch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsConfig>(() => SettingsService.loadSettings());
  
  // Create AI service instance with current settings
  const aiService = new AIService(settings);

  // Handle settings updates
  const handleSettingsChange = useCallback((newSettings: SettingsConfig) => {
    setSettings(newSettings);
    SettingsService.saveSettings(newSettings);
  }, []);

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [branches, setBranches] = useState<ConversationBranch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<SettingsConfig>(() => SettingsService.loadSettings());

  // Initialize AI service based on settings
  const aiService = new AIService(settings);

  // Handle settings updates
  const handleSettingsChange = useCallback((newSettings: SettingsConfig) => {
    setSettings(newSettings);
    SettingsService.saveSettings(newSettings);
  }, []);

  // Load initial messages and convert to chat format
  useEffect(() => {
    const initialMessages = aiService.getMessageHistory();
    const chatMessages: Message[] = initialMessages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      timestamp: msg.timestamp,
      branchId: undefined, // AIService doesn't include branchId
    }));
    setMessages(chatMessages);
  }, [settings]); // Re-run when settings change

  const handleSendMessage = useCallback(async (messageContent: string, branchId?: string) => {
    if (isLoading) return;
    
    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      sender: 'user',
      timestamp: new Date(),
      branchId: branchId || currentBranchId || undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      const response = await aiService.sendMessage(messageContent, undefined, branchId);
      const aiMessage: Message = {
        id: response.id,
        content: response.content,
        sender: response.sender,
        timestamp: response.timestamp,
        branchId: branchId || currentBranchId || undefined,
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Update branch messages if we're in a branch
      if (branchId || currentBranchId) {
        const targetBranchId = branchId || currentBranchId;
        setBranches(prev => prev.map(branch => {
          if (branch.id === targetBranchId) {
            return {
              ...branch,
              messages: [
                ...branch.messages,
                {
                  id: userMessage.id,
                  content: userMessage.content,
                  sender: userMessage.sender,
                  timestamp: userMessage.timestamp,
                  branchId: targetBranchId,
                },
                {
                  id: aiMessage.id,
                  content: aiMessage.content,
                  sender: aiMessage.sender,
                  timestamp: aiMessage.timestamp,
                  branchId: targetBranchId,
                }
              ]
            };
          }
          return branch;
        }));
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentBranchId]);

  const handleCreateBranch = useCallback((parentMessageId: string, branchText: string) => {
    const branchId = uuidv4();
    
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
    
    const newBranch: ConversationBranch = {
      id: branchId,
      name: `Branch from "${branchText.substring(0, 20)}..."`,
      parentMessageId,
      parentBranchId,
      branchText,
      messages: [],
      createdAt: new Date(),
      depth,
    };
    
    setBranches(prev => [...prev, newBranch]);
    return branchId;
  }, [currentBranchId, branches, messages]);

  const handleNavigateToBranch = useCallback((branchId: string | null) => {
    setCurrentBranchId(branchId);
  }, []);

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
    <div className="App h-screen">
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
      />
    </div>
  );
}

export default App;
