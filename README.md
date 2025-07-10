# Branch 🌿

**Conversational AI with Branching**

Branch is an innovative conversational AI interface that allows you to explore ideas through branching conversations. Unlike traditional linear chat interfaces, Branch lets you select any part of a conversation and create new branches to explore different directions, questions, or perspectives.

## ✨ Key Features

### � **Branching Conversations**
- Select any text in an AI response to create a new conversation branch
- Explore multiple perspectives and directions from the same starting point
- Visual branch indicators show where conversations split

### 🗂️ **Column-Based Navigation**
- macOS Finder-style horizontal columns for intuitive navigation
- Each branch level gets its own dedicated column
- Smooth scrolling between conversation branches

### 🗺️ **Interactive Branch Map**
- Floating, draggable mini-map shows your entire conversation tree
- Click to navigate instantly to any branch
- Corner snapping and position persistence
- Expandable view for complex conversation structures

### ⚙️ **Flexible AI Configuration**
- Bring Your Own Key (BYOK) - use your own OpenAI API key
- Multiple AI models supported (GPT-4o, GPT-4, GPT-3.5)
- Streaming responses for real-time conversation flow
- Full conversation history sent to maintain context

### 🎨 **Beautiful, Modern UI**
- Clean, minimalist design focused on conversation
- Responsive layout that works on all screen sizes
- Smooth animations and transitions
- Green branching theme throughout

## 🚀 Getting Started

### Prerequisites

- Node.js (v20.19.0 or later)
- npm or yarn

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd branch
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Configure AI Settings**
   - Click the settings icon in the top-right corner
   - Add your OpenAI API key
   - Choose your preferred AI model
   - Start exploring!

## 🌱 How Branching Works

1. **Start a Conversation**: Ask any question or choose from the sample prompts
2. **Get a Response**: The AI responds in the main conversation thread
3. **Create Branches**: Select any part of the AI's response text
4. **Explore New Directions**: Each branch becomes a new conversation path
5. **Navigate with Ease**: Use the column interface or mini-map to move between branches

## 🛠️ Technical Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS
- **Graph Visualization**: React Flow
- **Icons**: Lucide React
- **Build Tool**: Vite
- **AI Integration**: OpenAI API with streaming support

## 🎯 Use Cases

- **Creative Writing**: Explore different story directions and character developments
- **Problem Solving**: Analyze issues from multiple angles and approaches
- **Learning**: Deep dive into topics by branching into related concepts
- **Decision Making**: Explore different options and their implications
- **Brainstorming**: Generate and develop ideas in multiple directions

## 📱 Features in Detail

### Branch Creation
- Select any text in an AI response
- Click "Create Branch" to start a new conversation thread
- The selected text becomes the starting context for the new branch

### Navigation
- **Columns**: Each branch level has its own column, like macOS Finder
- **Breadcrumbs**: Shows your current path through the conversation tree
- **Mini-Map**: Visual overview of all branches with click navigation

### AI Context
- Full conversation history is sent to the AI for each branch
- Maintains context across all conversation paths
- Streaming responses for real-time interaction

## 🔧 Configuration

Branch supports flexible configuration through the settings panel:

- **API Key**: Use your own OpenAI API key for unlimited usage
- **AI Models**: Choose between GPT-4o, GPT-4, and GPT-3.5 Turbo
- **Mock Mode**: Test the interface without an API key

## 🎨 Design Philosophy

Branch is designed around the concept of **exploration through conversation**. Traditional chat interfaces force linear thinking, but real conversations naturally branch and explore tangents. Branch embraces this by making branching a first-class feature.

The interface uses organic, tree-like visual metaphors:
- Green color scheme inspired by growing plants
- GitBranch icons to represent conversation splits
- Flowing, natural navigation patterns
- Clean typography that doesn't distract from content

## 📝 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/
│   ├── ChatInterface.tsx        # Main chat interface with columns
│   ├── DraggableMiniMap.tsx     # Floating mini-map component
│   ├── MiniMap.tsx              # Graph visualization
│   ├── WelcomeScreen.tsx        # Landing page
│   └── SettingsPopup.tsx        # Settings configuration
├── services/
│   ├── aiService.ts             # AI integration with streaming
│   └── settingsService.ts       # Settings persistence
├── hooks/
│   └── useTextSelection.ts      # Text selection hook for branching
├── types.ts                     # TypeScript definitions
└── App.tsx                      # Main application
```

---

**Branch** - Where conversations grow and ideas flourish 🌿
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
