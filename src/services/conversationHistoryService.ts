// Conversation History Service
// Manages saving and loading conversation history to/from localStorage

import type { ConversationBranch } from '../types';

export interface ConversationMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  branchId?: string;
}

export interface ConversationHistory {
  id: string;
  title: string;
  messages: ConversationMessage[];
  branches: ConversationBranch[];
  currentBranchId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const HISTORY_STORAGE_KEY = 'branch-ui-conversation-history';
const CURRENT_CONVERSATION_KEY = 'branch-ui-current-conversation';
const MAX_HISTORY_ITEMS = 100; // Limit to prevent excessive storage usage

class ConversationHistoryService {
  private history: ConversationHistory[] = [];
  private currentConversationId: string | null = null;

  constructor() {
    this.loadHistory();
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.history = parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          messages: item.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          branches: item.branches.map((branch: any) => ({
            ...branch,
            createdAt: new Date(branch.createdAt),
            messages: branch.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }))
        }));
      }

      const currentId = localStorage.getItem(CURRENT_CONVERSATION_KEY);
      this.currentConversationId = currentId;
    } catch (error) {
      console.warn('Failed to load conversation history:', error);
      this.history = [];
      this.currentConversationId = null;
    }
  }

  private saveHistory(): void {
    try {
      // Limit history size
      if (this.history.length > MAX_HISTORY_ITEMS) {
        this.history = this.history
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, MAX_HISTORY_ITEMS);
      }

      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history));
      if (this.currentConversationId) {
        localStorage.setItem(CURRENT_CONVERSATION_KEY, this.currentConversationId);
      } else {
        localStorage.removeItem(CURRENT_CONVERSATION_KEY);
      }
    } catch (error) {
      console.warn('Failed to save conversation history:', error);
    }
  }

  public generateConversationTitle(messages: ConversationMessage[]): string {
    if (messages.length === 0) {
      return 'New Conversation';
    }

    // Find the first user message
    const firstUserMessage = messages.find(m => m.sender === 'user');
    if (!firstUserMessage) {
      return 'New Conversation';
    }

    // Extract first few words from the first user message
    const words = firstUserMessage.content.trim().split(/\s+/);
    const title = words.slice(0, 6).join(' ');
    
    return title.length > 50 ? title.substring(0, 47) + '...' : title;
  }

  public saveCurrentConversation(
    messages: ConversationMessage[], 
    branches: ConversationBranch[], 
    currentBranchId: string | null
  ): string {
    const now = new Date();
    
    if (this.currentConversationId) {
      // Update existing conversation
      const existingIndex = this.history.findIndex(c => c.id === this.currentConversationId);
      if (existingIndex !== -1) {
        const existing = this.history[existingIndex];
        this.history[existingIndex] = {
          ...existing,
          messages,
          branches,
          currentBranchId,
          updatedAt: now,
          title: this.generateConversationTitle(messages)
        };
      } else {
        // Create new if existing not found
        const newConversation: ConversationHistory = {
          id: this.currentConversationId,
          title: this.generateConversationTitle(messages),
          messages,
          branches,
          currentBranchId,
          createdAt: now,
          updatedAt: now
        };
        this.history.push(newConversation);
      }
    } else {
      // Create new conversation
      const newId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newConversation: ConversationHistory = {
        id: newId,
        title: this.generateConversationTitle(messages),
        messages,
        branches,
        currentBranchId,
        createdAt: now,
        updatedAt: now
      };
      this.history.push(newConversation);
      this.currentConversationId = newId;
    }

    this.saveHistory();
    return this.currentConversationId!;
  }

  public loadConversation(conversationId: string): ConversationHistory | null {
    const conversation = this.history.find(c => c.id === conversationId);
    if (conversation) {
      this.currentConversationId = conversationId;
      this.saveHistory(); // Update current conversation ID
      return conversation;
    }
    return null;
  }

  public deleteConversation(conversationId: string): void {
    this.history = this.history.filter(c => c.id !== conversationId);
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
    this.saveHistory();
  }

  public createNewConversation(): string {
    const newId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentConversationId = newId;
    this.saveHistory();
    return newId;
  }

  public getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  public getHistory(): ConversationHistory[] {
    return [...this.history].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  public getCurrentConversation(): ConversationHistory | null {
    if (!this.currentConversationId) return null;
    return this.history.find(c => c.id === this.currentConversationId) || null;
  }

  public clearHistory(): void {
    this.history = [];
    this.currentConversationId = null;
    this.saveHistory();
  }

  public exportHistory(): string {
    return JSON.stringify({
      history: this.history,
      currentConversationId: this.currentConversationId,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  public importHistory(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.history && Array.isArray(data.history)) {
        this.history = data.history.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          messages: item.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })),
          branches: item.branches.map((branch: any) => ({
            ...branch,
            createdAt: new Date(branch.createdAt),
            messages: branch.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }))
        }));
        
        if (data.currentConversationId) {
          this.currentConversationId = data.currentConversationId;
        }
        
        this.saveHistory();
        return true;
      }
    } catch (error) {
      console.error('Failed to import history:', error);
    }
    return false;
  }
}

export const conversationHistoryService = new ConversationHistoryService();
