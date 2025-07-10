import { v4 as uuidv4 } from 'uuid';
import type { ConversationMessage } from '../types';

// Mock AI responses for demonstration
const mockResponses = [
  "That's an interesting question! Here are several approaches you could consider:\n\n1. **First approach**: This method focuses on...\n\n2. **Second approach**: Alternatively, you might want to...\n\n3. **Third approach**: Another way to think about this is...\n\nWhich of these resonates most with your specific use case?",
  
  "I can help you with that! Let me break this down into steps:\n\n**Step 1**: Start by understanding the core concept\n**Step 2**: Implement the basic structure\n**Step 3**: Add the advanced features\n**Step 4**: Test and refine\n\nWould you like me to elaborate on any of these steps?",
  
  "Great question! This reminds me of a few different scenarios:\n\n• **Scenario A**: If you're working with small datasets, you might want to...\n• **Scenario B**: For larger scale applications, consider...\n• **Scenario C**: If performance is critical, then...\n\nWhat's your specific context?",
  
  "Here's what I'd recommend:\n\n🔍 **Analysis**: The key issue seems to be...\n💡 **Solution**: You could solve this by...\n⚡ **Quick fix**: For an immediate solution, try...\n🚀 **Long-term**: For a more robust approach, consider...\n\nLet me know which direction you'd like to explore further!",
  
  "I understand your concern. There are multiple ways to approach this:\n\n**Option 1**: The traditional method would be...\n**Option 2**: A more modern approach might involve...\n**Option 3**: If you're looking for something cutting-edge, consider...\n\nEach has its own trade-offs. What are your priorities?",
];

export class MockAIService {
  private messageHistory: ConversationMessage[] = [];
  
  constructor() {
    // Start with empty history for chat interface
    this.messageHistory = [];
  }

  getMessageHistory(): ConversationMessage[] {
    return this.messageHistory;
  }

  async sendMessage(content: string, parentId?: string, branchId?: string): Promise<ConversationMessage> {
    // Add user message
    const userMessage: ConversationMessage = {
      id: uuidv4(),
      content,
      sender: 'user',
      timestamp: new Date(),
      parentId,
      branchId,
    };
    
    this.messageHistory.push(userMessage);

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Generate AI response with more diverse content for branching
    const aiResponse: ConversationMessage = {
      id: uuidv4(),
      content: this.generateResponse(content, branchId),
      sender: 'assistant',
      timestamp: new Date(),
      parentId: userMessage.id,
      branchId,
    };

    this.messageHistory.push(aiResponse);
    return aiResponse;
  }

  private generateResponse(userMessage: string, branchId?: string): string {
    // Generate different responses for branches vs main conversation
    const isInBranch = !!branchId;
    const lowerMessage = userMessage.toLowerCase();
    
    if (isInBranch) {
      // More focused responses for branches
      if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
        return "Let me dive deeper into this specific approach:\n\n1. **Detailed Step**: Start with the foundation...\n2. **Implementation**: Here's the specific code/method...\n3. **Advanced Considerations**: Don't forget about edge cases...\n\nThis focused approach should give you exactly what you need for this particular direction.";
      } else if (lowerMessage.includes('explain') || lowerMessage.includes('what')) {
        return "Focusing on this specific aspect:\n\n**Core Concept**: The key principle here is...\n**Practical Application**: In real-world scenarios, this means...\n**Example**: Here's a concrete example...\n\nWould you like me to elaborate on any of these specific points?";
      } else {
        return "Building on this specific thread of our conversation:\n\n• **Focused Solution**: Based on your specific interest in this area...\n• **Targeted Approach**: Here's a specialized method...\n• **Next Steps**: From this point, you could...\n\nThis approach is tailored to the direction you were exploring.";
      }
    } else {
      // Broader responses for main conversation
      if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
        return mockResponses[1]; // Step-by-step response
      } else if (lowerMessage.includes('performance') || lowerMessage.includes('scale')) {
        return mockResponses[2]; // Scenario-based response
      } else if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest')) {
        return mockResponses[3]; // Recommendation response
      } else if (lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
        return mockResponses[4]; // Options response
      } else {
        return mockResponses[0]; // Default comprehensive response
      }
    }
  }

  // Method to create a branch from a specific point
  createBranch(parentId: string, selectedText: string, newMessage: string): ConversationMessage {
    const branchMessage: ConversationMessage = {
      id: uuidv4(),
      content: `Following up on "${selectedText}": ${newMessage}`,
      sender: 'user',
      timestamp: new Date(),
      parentId,
    };

    this.messageHistory.push(branchMessage);
    return branchMessage;
  }

  // Get all messages that are children of a specific node
  getChildMessages(parentId: string): ConversationMessage[] {
    return this.messageHistory.filter(msg => msg.parentId === parentId);
  }

  // Get the conversation tree structure
  getConversationTree(): ConversationMessage[] {
    return this.messageHistory;
  }
}
