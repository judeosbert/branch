<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Branch 🌿 - Conversational AI with Branching

This is a React TypeScript application implementing a sophisticated **hybrid split-screen + minimap UI** for branching conversations with AI models (OpenAI, Gemini).

## Core Architecture

### **Split-Screen Interface Pattern**
- **Main Chat Mode**: Single-panel view for linear conversation
- **Branch Mode**: Dual-panel view when navigating branches
  - **Left Panel**: Parent conversation context (up to branch point)
  - **Right Panel**: Active branch conversation
- **Reserved Space**: Fixed 256px (w-64) right sidebar for minimap when branches exist

### **Message Attribution System**
```typescript
// Main chat messages: no branchId
messages.filter(m => !m.branchId)
// Branch messages: specific branchId
messages.filter(msg => msg.branchId === branch.id)
```

### **Nested Branch Context Logic**
```typescript
// For nested branches: show parent branch messages + context
if (currentBranch.parentBranchId) {
  const parentBranchPath = buildBranchPath(currentBranch.parentBranchId);
  return [...mainMessages, ...parentBranchMessages];
}
```

## Key Components

### **ChatInterface.tsx** - Main orchestrator
- **Critical Logic**: Column display logic for branch hierarchy (lines 742-773)
- **Context Calculation**: `getParentConversation()` for nested branch support
- **Message Filtering**: Context-aware message display per branch
- **UI State Management**: Smooth transitions between single/split-panel modes

### **EnhancedAIService.ts** - Multi-provider AI service
- **Provider Routing**: OpenAI, Gemini, Mock based on `settings.provider`
- **Streaming Support**: `sendMessageStream()` with provider-specific implementations
- **File Analysis**: `analyzeFile()` with provider-specific capabilities
- **Connection Testing**: Provider-specific endpoint validation

### **SettingsPopup.tsx** - Tabbed provider configuration
- **AI_PROVIDERS**: Defines OpenAI, Gemini, Mock with their models
- **Auto-save**: No save button, settings persist on change
- **Provider Switching**: Maintains model selection per provider

### **DraggableMiniMap.tsx** - Visual navigation
- **Graph Visualization**: React Flow-based node representation
- **Corner Snapping**: Floating minimap with position persistence
- **Dual Modes**: Mini and full-screen graph views

## Development Patterns

### **State Management**
- **Branch Hierarchy**: `buildBranchPath()` for nested branch navigation
- **Message Threading**: Proper message attribution with `branchId`
- **UI Transitions**: CSS transitions for panel resizing (500ms)

### **Text Selection & Branching**
- **useTextSelection.ts**: Custom hook for text selection handling
- **SelectionPopup**: "Branch from here" functionality
- **Context Preservation**: Branch creation maintains full conversation history

### **Multi-Provider Architecture**
```typescript
interface SettingsConfig {
  provider: 'openai' | 'gemini' | 'mock';
  openaiApiKey: string;
  geminiApiKey: string;
  model: string;
}
```

## Critical UI Rules

1. **Reserved Space**: Content uses `pr-64` when branches exist to avoid minimap overlap
2. **Column Logic**: Only show active branch lineage, not siblings (see ChatInterface.tsx lines 742-773)
3. **Context Display**: Left panel always shows parent conversation context when in branch
4. **Message Attribution**: Main chat messages have no `branchId`, branch messages have specific `branchId`

## Build & Development

- **Vite**: Dev server with React plugin
- **TypeScript**: Strict type checking enabled
- **Tailwind**: Utility-first styling with responsive breakpoints
- **Commands**: `npm run dev`, `npm run build`, `npm run preview`

## File Structure Conventions

- **Components**: Functional React components with TypeScript
- **Services**: API integrations with streaming support
- **Hooks**: Custom React hooks for reusable logic
- **Types**: TypeScript interfaces in `src/types.ts`
