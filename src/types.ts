import type { Node, Edge } from '@xyflow/react';

export interface ConversationMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  parentId?: string;
  branchId?: string;
  branchText?: string;
}

export interface ConversationBranch {
  id: string;
  name: string;
  parentMessageId: string;
  parentBranchId?: string; // For nested branches
  branchText: string;
  messages: ConversationMessage[];
  createdAt: Date;
  depth: number; // Track nesting level
}

export interface ConversationNode extends Node {
  data: {
    message: ConversationMessage;
    isSelected: boolean;
    onBranch?: (nodeId: string, selectedText: string) => void;
    onSelect?: (nodeId: string) => void;
  };
  type: 'conversation';
}

export interface ConversationEdge extends Edge {
  data?: {
    branchPoint?: string;
  };
}

export interface ConversationGraph {
  nodes: ConversationNode[];
  edges: ConversationEdge[];
}

export interface BranchPoint {
  nodeId: string;
  selectedText: string;
  position: { x: number; y: number };
}

export interface ConversationState {
  graph: ConversationGraph;
  selectedNodeId: string | null;
  activeBranch: string | null;
  branchPoints: BranchPoint[];
  branches: ConversationBranch[];
  currentBranchId: string | null;
}
