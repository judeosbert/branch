# MiniMap Graph Visualization Feature

## Overview

The MiniMap component provides a visual graph representation of the conversation structure, allowing users to see and navigate through all branches in their conversation. It appears as a floating mini-map in the top-right corner and can be expanded to full-screen view.

## Key Features

### 🗺️ **Visual Graph Representation**
- **Nodes**: Each conversation branch is represented as a colored rectangle
- **Connections**: Lines show the relationship between branches
- **Hierarchy**: Visual depth shows nested branch levels
- **Active Highlighting**: Current branch is highlighted in blue

### 🎨 **Color Coding**
- **Blue**: Active/current branch
- **Green**: Main chat conversation
- **Gray**: Inactive branches
- **Animated Connections**: Active paths are highlighted with thicker lines

### 📊 **Node Information**
- **Branch Label**: "Branch 1", "Branch 2", etc.
- **Branch Summary**: First 40 characters of the branching text
- **Message Count**: Number of messages in each branch
- **Visual Icons**: Different icons for main chat vs. branches

### 🔍 **Two View Modes**

#### **Mini View (Default)**
- Compact floating widget in top-right corner
- Quick overview of conversation structure
- Click to expand to full view
- Shows branch count and basic navigation

#### **Full View (Expanded)**
- Full-screen overlay with detailed graph
- Larger nodes with more information
- Interactive navigation
- Legend explaining color coding
- Close button to return to mini view

### 🎯 **Interactive Features**

#### **Navigation**
- **Click any node**: Navigate to that branch/conversation
- **Auto-close**: Full view closes when navigating to a branch
- **Breadcrumb integration**: Updates breadcrumb path when navigating

#### **Hover Effects**
- Nodes highlight on hover
- Drop shadows for better visual feedback
- Smooth transitions and animations

#### **Responsive Design**
- Adapts to different screen sizes
- Maintains readability at all zoom levels
- Proper overflow handling

### 🎞️ **Animations**
- **Slide-in**: Mini-map appears with smooth animation
- **Fade-in**: Full view overlay appears smoothly
- **Scale-in**: Full view content scales in with bounce effect
- **Transitions**: All state changes are smoothly animated

### 🧮 **Graph Layout Algorithm**
- **Horizontal Layout**: Branches extend to the right
- **Vertical Spacing**: Branches at same depth are spaced vertically
- **Dynamic Sizing**: Graph adapts to number of branches
- **Collision Avoidance**: Nodes are positioned to avoid overlap

## Usage Instructions

### **Creating and Viewing Branches**
1. Start a conversation in the main chat
2. Select text and click "Branch from here"
3. The mini-map will appear in the top-right corner
4. Continue creating branches to see the graph grow

### **Navigating with Mini-Map**
1. **Mini View**: Click the expand button to see full graph
2. **Full View**: Click any node to jump to that conversation
3. **Return**: Use the close button or navigate to return to mini view

### **Understanding the Graph**
- **Main Chat**: Green node on the left (starting point)
- **Branches**: Gray nodes connected to their parent
- **Active Branch**: Blue node showing current location
- **Connections**: Lines show branching relationships

## Technical Implementation

### **Component Structure**
```
MiniMap Component
├── State Management (node positions, hover states)
├── Graph Calculation (layout algorithm)
├── SVG Rendering (nodes, connections, animations)
├── Event Handling (click, hover, navigation)
└── Responsive Views (mini vs full view)
```

### **Key Functions**
- `calculateNodes()`: Computes node positions and graph layout
- `generatePath()`: Creates SVG paths for connections
- `handleNodeClick()`: Manages navigation and view switching
- `renderNode()`: Renders individual branch nodes
- `renderConnections()`: Renders connecting lines

### **Integration Points**
- **ChatInterface**: Hosts the mini-map component
- **App.tsx**: Provides branch data and navigation handlers
- **CSS Animations**: Smooth transitions and effects
- **Type System**: Proper TypeScript interfaces

## Benefits

### **Enhanced User Experience**
- **Spatial Awareness**: Users always know where they are
- **Quick Navigation**: Jump to any branch instantly
- **Visual Overview**: See entire conversation structure at once
- **Professional Feel**: Polished animations and interactions

### **Improved Navigation**
- **No More Lost Branches**: All branches are visible
- **Easy Exploration**: Encourage users to create more branches
- **Context Preservation**: Understand branch relationships
- **Efficient Switching**: Fast navigation between conversations

### **Visual Clarity**
- **Clear Hierarchy**: Understand branch depth and relationships
- **Status Indicators**: Know which branch is active
- **Progress Tracking**: See message counts in each branch
- **Interactive Feedback**: Hover and click effects

## Future Enhancements

### **Planned Features**
- **Drag and Drop**: Reorganize branch structure
- **Zoom Controls**: Zoom in/out of large graphs
- **Search**: Find specific branches by content
- **Export**: Export graph as image
- **Branch Merging**: Combine branches back into main chat
- **Keyboard Navigation**: Arrow keys for navigation

### **Advanced Interactions**
- **Multi-select**: Select multiple branches
- **Bulk Operations**: Delete or merge multiple branches
- **Branch Comparison**: Compare different branch outcomes
- **Timeline View**: See branch creation chronologically

The MiniMap feature transforms the branching conversation interface from a linear experience into a true graph-based navigation system, making it easy and intuitive to explore complex conversation structures.
