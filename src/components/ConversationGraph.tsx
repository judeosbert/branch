import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Connection, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import ConversationNode from './ConversationNode';
import type { ConversationMessage, ConversationNode as ConversationNodeType } from '../types';

const nodeTypes = {
  conversation: ConversationNode,
};

interface ConversationGraphProps {
  initialMessages?: ConversationMessage[];
  onSendMessage?: (message: string, parentId?: string) => void;
}

const ConversationGraph = ({ initialMessages = [], onSendMessage }: ConversationGraphProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [branchingFrom, setBranchingFrom] = useState<{ nodeId: string; selectedText: string } | null>(null);

  // Convert messages to nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: ConversationNodeType[] = [];
    const edges: Edge[] = [];

    initialMessages.forEach((message, index) => {
      const node: ConversationNodeType = {
        id: message.id,
        type: 'conversation',
        position: { x: 100 + (index % 3) * 400, y: 100 + Math.floor(index / 3) * 200 },
        data: {
          message,
          isSelected: selectedNodeId === message.id,
          onBranch: handleBranch,
          onSelect: handleNodeSelect,
        },
      };
      nodes.push(node);

      if (message.parentId) {
        edges.push({
          id: `${message.parentId}-${message.id}`,
          source: message.parentId,
          target: message.id,
          animated: true,
        });
      }
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [initialMessages, selectedNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: node.id === nodeId,
        },
      }))
    );
  }, [setNodes]);

  const handleBranch = useCallback((nodeId: string, selectedText: string) => {
    setBranchingFrom({ nodeId, selectedText });
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const messageId = uuidv4();
    const parentId = branchingFrom?.nodeId || selectedNodeId;
    
    if (onSendMessage) {
      onSendMessage(newMessage, parentId || undefined);
    }

    // Create new message
    const message: ConversationMessage = {
      id: messageId,
      content: newMessage,
      sender: 'user',
      timestamp: new Date(),
      parentId: parentId || undefined,
    };

    // Add new node
    const newNode: ConversationNodeType = {
      id: messageId,
      type: 'conversation',
      position: {
        x: 100 + (nodes.length % 3) * 400,
        y: 100 + Math.floor(nodes.length / 3) * 200,
      },
      data: {
        message,
        isSelected: false,
        onBranch: handleBranch,
        onSelect: handleNodeSelect,
      },
    };

    setNodes((nodes) => [...nodes, newNode]);

    // Add edge if there's a parent
    if (parentId) {
      const newEdge: Edge = {
        id: `${parentId}-${messageId}`,
        source: parentId,
        target: messageId,
        animated: true,
      };
      setEdges((edges) => [...edges, newEdge]);
    }

    setNewMessage('');
    setBranchingFrom(null);
  }, [newMessage, branchingFrom, selectedNodeId, onSendMessage, nodes.length, setNodes, setEdges, handleBranch, handleNodeSelect]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">Conversation Graph</h1>
          {branchingFrom && (
            <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-sm">
              <span className="font-medium text-green-800">Branching from:</span>
              <span className="text-green-700 ml-2">"{branchingFrom.selectedText}"</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBranchingFrom(null)}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            disabled={!branchingFrom}
          >
            Cancel Branch
          </button>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          className="conversation-graph"
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* Message Input */}
        <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="flex gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
              className="message-input flex-1 min-h-[60px] resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ConversationGraphWithProvider = (props: ConversationGraphProps) => (
  <ReactFlowProvider>
    <ConversationGraph {...props} />
  </ReactFlowProvider>
);

export default ConversationGraphWithProvider;
