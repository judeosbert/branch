# Conversation Graph UI

A modern, graph-based conversational interface for interacting with AI models. Instead of traditional linear chat interfaces, this application presents conversations as an interactive flowchart where users can branch off from any point in the conversation.

## Features

🌳 **Branching Conversations**: Select any text from AI responses and create new conversation branches
📊 **Visual Graph Interface**: See your entire conversation as an interactive node graph
🎯 **ComfyUI-Inspired Design**: Familiar interface for users of node-based tools
⚡ **Real-time Updates**: Dynamic graph updates as conversations evolve
🎨 **Modern UI**: Clean, responsive design with Tailwind CSS
🔍 **Interactive Nodes**: Hover effects, selection, and contextual actions

## Getting Started

### Prerequisites

- Node.js (v20.19.0 or later)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Start a Conversation**: Type your message in the input field at the bottom
2. **Branch from Text**: Select any text in an AI response and click "Branch from here"
3. **Navigate**: Use the mini-map and controls to navigate around the conversation graph
4. **Explore**: Create multiple branches to explore different conversation paths

## Technical Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Flow** for graph visualization
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **UUID** for unique identifiers

## Project Structure

```
src/
├── components/
│   ├── ConversationGraph.tsx    # Main graph component
│   └── ConversationNode.tsx     # Individual conversation node
├── services/
│   └── mockAIService.ts         # Mock AI service (replace with real API)
├── types.ts                     # TypeScript type definitions
├── App.tsx                      # Main application component
└── index.css                    # Tailwind CSS styles
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Customization

### AI Service Integration

Replace the mock AI service with your preferred AI API:

```typescript
// Replace MockAIService with your AI service
import { YourAIService } from './services/yourAIService';

const aiService = new YourAIService({
  apiKey: 'your-api-key',
  // other configuration
});
```

### Styling

The application uses Tailwind CSS for styling. Customize the appearance by:

1. Modifying the Tailwind config in `tailwind.config.js`
2. Updating CSS classes in components
3. Adding custom styles in `src/index.css`

## Roadmap

- [ ] Real AI service integration (OpenAI, Anthropic, etc.)
- [ ] Conversation persistence and loading
- [ ] Export/import conversation graphs
- [ ] Advanced node types (images, code, etc.)
- [ ] Collaborative editing
- [ ] Performance optimizations for large graphs
- [ ] Mobile responsive improvements
- [ ] Keyboard shortcuts and accessibility

## License

This project is open source and available under the MIT License.
