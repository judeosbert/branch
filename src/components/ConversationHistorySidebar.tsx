import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  History,
  Search
} from 'lucide-react';
import type { ConversationHistory } from '../services/conversationHistoryService';

interface ConversationHistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  history: ConversationHistory[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onClearHistory: () => void;
}

const ConversationHistorySidebar: React.FC<ConversationHistorySidebarProps> = ({
  isOpen,
  onToggle,
  history,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter history based on search term
  const filteredHistory = history.filter(conv => 
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.messages.some(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEditTitle = (conversationId: string, currentTitle: string) => {
    setEditingId(conversationId);
    setEditingTitle(currentTitle);
    setShowDropdown(null);
  };

  const handleSaveEdit = () => {
    if (editingId && editingTitle.trim()) {
      // TODO: Implement title editing in the service
      console.log('Editing title:', editingId, editingTitle);
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short',
        day: 'numeric',
        year: diffInHours > 24 * 365 ? 'numeric' : undefined
      });
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-300 z-40 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History size={20} className="text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-800">History</h2>
              </div>
              <button
                onClick={onNewConversation}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="New Conversation"
              >
                <Plus size={18} />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredHistory.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchTerm ? 'No conversations found' : 'No conversations yet'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredHistory.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
                      currentConversationId === conversation.id
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => onSelectConversation(conversation.id)}
                      >
                        {editingId === conversation.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <MessageCircle size={14} className="text-gray-400 flex-shrink-0" />
                              <h3 className="font-medium text-gray-800 text-sm truncate">
                                {conversation.title}
                              </h3>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{conversation.messages.length} messages</span>
                              <span>{formatDate(conversation.updatedAt)}</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {editingId !== conversation.id && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDropdown(showDropdown === conversation.id ? null : conversation.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {showDropdown === conversation.id && (
                            <div 
                              ref={dropdownRef}
                              className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-[60]"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTitle(conversation.id, conversation.title);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit3 size={14} />
                                Edit Title
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this conversation?')) {
                                    onDeleteConversation(conversation.id);
                                  }
                                  setShowDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-end">
              <button
                onClick={onClearHistory}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear All History"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default ConversationHistorySidebar;
