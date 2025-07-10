<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Conversation Graph UI Project

This is a React TypeScript application that implements a graph-based conversational interface similar to ComfyUI, allowing users to create branching conversations with AI models.

## Project Structure

- **Components**: React components for the conversation graph and nodes
- **Types**: TypeScript interfaces for conversation messages and graph structure
- **Services**: Mock AI service for demonstration (replace with real AI API)
- **Styling**: Tailwind CSS for responsive UI design

## Key Features

1. **Graph-based UI**: Uses React Flow for node-based conversation visualization
2. **Branching Conversations**: Users can select text and create new branches
3. **Interactive Nodes**: Each message is a node with selection and branching capabilities
4. **Real-time Updates**: Dynamic graph updates as conversations evolve

## Development Guidelines

- Use TypeScript for type safety
- Follow React best practices with hooks and functional components
- Implement proper error handling for AI service calls
- Maintain responsive design with Tailwind CSS
- Keep components modular and reusable

## AI Integration

The current implementation uses a mock AI service. When integrating with real AI APIs:
- Replace MockAIService with actual API calls
- Implement proper error handling and retry logic
- Add loading states and progress indicators
- Consider rate limiting and API costs

## Code Style

- Use functional components with hooks
- Implement proper TypeScript typing
- Follow React Flow best practices for graph manipulation
- Use Tailwind CSS utility classes for styling
- Keep components focused on single responsibilities
