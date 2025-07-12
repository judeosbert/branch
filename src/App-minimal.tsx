import { useState, useEffect } from 'react';
import { SettingsService } from './services/settingsService';
import { conversationHistoryService, type ConversationHistory } from './services/conversationHistoryService';
import type { SettingsConfig } from './components/SettingsPopup';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  branchId?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings] = useState<SettingsConfig>(() => SettingsService.loadSettings());
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);

  // Initialize conversation history
  useEffect(() => {
    try {
      const history = conversationHistoryService.getHistory();
      setConversationHistory(history);
      
      // Always start with a new conversation on page load
      conversationHistoryService.createNewConversation();
      setMessages([]);
    } catch (error) {
      console.error('Error initializing conversation history:', error);
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`transition-all duration-300 ${isHistorySidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
        <div className="w-64 h-full bg-white border-r border-gray-200 p-4">
          <h2 className="text-lg font-semibold mb-4">Conversation History</h2>
          <div className="space-y-2">
            {conversationHistory.map((conv) => (
              <div key={conv.id} className="p-2 bg-gray-50 rounded text-sm">
                {conv.title || 'Untitled Conversation'}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded"
            >
              ☰
            </button>
            <h1 className="text-xl font-bold">Branch - Conversational AI</h1>
          </div>
          <div className="text-sm text-gray-500">
            Settings: {settings.aiEngine}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <h2 className="text-2xl font-bold mb-2">Welcome to Branch</h2>
                <p>Start a conversation to begin branching conversations with AI</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`p-4 rounded-lg ${
                  message.sender === 'user' ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
                }`}>
                  <div className="font-medium text-sm text-gray-600 mb-1">
                    {message.sender === 'user' ? 'You' : 'AI'}
                  </div>
                  <div>{message.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value.trim()) {
                    const newMessage: Message = {
                      id: Date.now().toString(),
                      content: input.value,
                      sender: 'user',
                      timestamp: new Date()
                    };
                    setMessages(prev => [...prev, newMessage]);
                    input.value = '';
                  }
                }
              }}
            />
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
