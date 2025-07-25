import type { SettingsConfig } from '../components/SettingsPopup';

interface AIMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface BranchContext {
  selectedText: string;
  sourceMessageId: string;
  sourceMessage: string;
}

export class AIService {
  private settings: SettingsConfig;

  constructor(settings: SettingsConfig) {
    this.settings = settings;
  }

  async *sendMessageStream(
    content: string, 
    conversationHistory: AIMessage[] = [],
    branchContext?: BranchContext
  ): AsyncGenerator<string, AIMessage, unknown> {
    if (this.settings.aiEngine === 'mock') {
      yield* this.useMockServiceStream(content);
      return this.createMessage('', 'assistant');
    }

    if (!this.settings.openaiApiKey || !this.isValidOpenAIKey(this.settings.openaiApiKey)) {
      throw new Error('Valid OpenAI API key is required for this AI engine');
    }

    try {
      yield* this.useOpenAIServiceStream(content, conversationHistory, branchContext);
      return this.createMessage('', 'assistant');
    } catch (error) {
      console.error('OpenAI API error, falling back to mock:', error);
      yield* this.useMockServiceStream(content);
      return this.createMessage('', 'assistant');
    }
  }

  private async *useOpenAIServiceStream(
    content: string, 
    conversationHistory: AIMessage[],
    branchContext?: BranchContext
  ): AsyncGenerator<string, void, unknown> {
    const model = this.getOpenAIModel();
    
    // Convert conversation history to OpenAI format
    const messages: ConversationMessage[] = [
      ...conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }))
    ];

    // If this is a branch conversation, add context about the branching
    if (branchContext) {
      messages.push({
        role: 'user' as const,
        content: `I want to branch our conversation to explore something specific. I've selected this text from a previous message: "${branchContext.selectedText}"

From the message: "${branchContext.sourceMessage}"

I want to explore this aspect further. Here's my question/comment: ${content}`
      });
    } else {
      messages.push({
        role: 'user' as const,
        content: content
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response stream reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          const dataStr = trimmedLine.slice(6);
          if (dataStr === '[DONE]') return;

          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices?.[0]?.delta;
            
            if (delta?.content) {
              yield delta.content;
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', parseError);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async *useMockServiceStream(content: string): AsyncGenerator<string, void, unknown> {
    const responses = [
      "That's an interesting question! Let me think about it...",
      "I understand your point. Here's my perspective on that:",
      "Thanks for sharing that with me. I'd like to add:",
      "That's a great topic to explore. From what I know:",
      "I appreciate you bringing this up. Here's what I think:",
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    const elaboration = this.generateMockElaboration(content);
    const fullResponse = `${randomResponse}\n\n${elaboration}`;

    // Simulate streaming by yielding chunks
    const words = fullResponse.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
      yield chunk;
      
      // Add realistic delay between chunks
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }
  }

  private createMessage(content: string, sender: 'user' | 'assistant'): AIMessage {
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      sender,
      timestamp: new Date(),
    };
  }

  private generateMockElaboration(userContent: string): string {
    const contentLower = userContent.toLowerCase();
    
    if (contentLower.includes('code') || contentLower.includes('programming')) {
      return `When it comes to **programming**, it's important to write clean, maintainable code. Here are some key principles:

## Best Practices

1. **Break down complex problems** into smaller, manageable pieces
2. Always **test your solutions** thoroughly
3. Use meaningful variable names
4. Write comments for complex logic

### Example Code

\`\`\`javascript
function calculateSum(numbers) {
  return numbers.reduce((sum, num) => sum + num, 0);
}
\`\`\`

> Remember: Clean code is not just about functionality, but also about readability and maintainability.`;
    }
    
    if (contentLower.includes('design') || contentLower.includes('ui') || contentLower.includes('interface')) {
      return `Good **design** focuses on user experience and accessibility. Here's what to consider:

## Design Principles

- Keep interfaces **simple and intuitive**
- Use **consistent patterns** throughout
- Always consider how users will interact with your designs
- Ensure accessibility for all users

### Key Areas to Focus On

1. **Visual Hierarchy** - Guide users' attention
2. **Color Theory** - Use colors purposefully
3. **Typography** - Choose readable fonts
4. **Spacing** - Give elements room to breathe

*Pro tip: Always test your designs with real users!*`;
    }
    
    if (contentLower.includes('data') || contentLower.includes('analysis')) {
      return `**Data analysis** requires careful consideration of multiple factors:

## Key Considerations

| Aspect | Description | Importance |
|--------|-------------|------------|
| Data Quality | Ensure accuracy and completeness | High |
| Methodology | Choose appropriate analysis methods | High |
| Visualization | Present findings clearly | Medium |
| Documentation | Record assumptions and limitations | High |

### Process Steps

1. **Data Collection** - Gather relevant information
2. **Data Cleaning** - Remove inconsistencies
3. **Analysis** - Apply statistical methods
4. **Interpretation** - Draw meaningful conclusions

---

*Always validate your assumptions and be transparent about limitations in your analysis.*`;
    }
    
    return `This is a **complex topic** that requires careful consideration of multiple factors. Here's my approach:

## Things to Consider

- Research various **perspectives**
- Consider the **broader context**
- Look for evidence-based solutions
- Think about long-term implications

### Recommended Next Steps

1. Gather more information
2. Consult with experts
3. Evaluate different options
4. Make an informed decision

> *"The best decisions are made with both data and intuition."*

I'd recommend exploring this topic further before making any major decisions.`;
  }

  private getOpenAIModel(): string {
    switch (this.settings.aiEngine) {
      case 'openai-gpt4o':
        return 'gpt-4o';
      case 'openai-gpt4':
        return 'gpt-4';
      case 'openai-gpt3.5':
        return 'gpt-3.5-turbo';
      default:
        return 'gpt-3.5-turbo';
    }
  }

  private isValidOpenAIKey(key: string): boolean {
    return key.startsWith('sk-') && key.length > 20;
  }

  getMessageHistory(): AIMessage[] {
    // Return empty for now - in a real app, this might load from localStorage or server
    return [];
 }

  // Generate a concise branch title based on highlighted text and conversation context
  async generateBranchTitle(
    highlightedText: string, 
    conversationHistory: AIMessage[] = []
  ): Promise<string> {
    if (this.settings.aiEngine === 'mock') {
      return this.generateMockBranchTitle(highlightedText);
    }

    if (!this.settings.openaiApiKey || !this.isValidOpenAIKey(this.settings.openaiApiKey)) {
      return this.generateMockBranchTitle(highlightedText);
    }

    try {
      return await this.generateOpenAIBranchTitle(highlightedText, conversationHistory);
    } catch (error) {
      console.error('OpenAI API error for branch title, using fallback:', error);
      return this.generateMockBranchTitle(highlightedText);
    }
  }

  private async generateOpenAIBranchTitle(
    highlightedText: string, 
    conversationHistory: AIMessage[]
  ): Promise<string> {
    const model = this.getOpenAIModel();
    
    // Convert conversation history to OpenAI format
    const messages: ConversationMessage[] = conversationHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Add the title generation prompt
    messages.push({
      role: 'user',
      content: `Based on our conversation above and this highlighted text: "${highlightedText}"

Create a very short, descriptive title (max 4-6 words) that captures what the user wants to explore in this branch. The title should indicate the specific aspect, question, or direction they're interested in.

Examples:
- "machine learning algorithms" → "ML Algorithm Types"
- "how does backpropagation work" → "How Backpropagation Works"
- "pros and cons of React" → "React Pros & Cons"
- "alternative to databases" → "Database Alternatives"
- "example of API design" → "API Design Examples"

Return only the title, no explanation.`
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 20,
        temperature: 0.3,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const title = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Clean up the title and ensure it's not too long
    const cleanTitle = title.replace(/["""''']/g, '').trim();
    if (cleanTitle.length > 40) {
      return cleanTitle.substring(0, 37) + '...';
    }
    
    return cleanTitle || this.generateMockBranchTitle(highlightedText);
  }

  private generateMockBranchTitle(highlightedText: string): string {
    const text = highlightedText.trim().substring(0, 50);
    
    // Simple pattern matching for mock service
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('how') || lowerText.includes('what') || lowerText.includes('why')) {
      return `Q: ${text.substring(0, 30)}...`;
    }
    if (lowerText.includes('example') || lowerText.includes('instance')) {
      return `Examples: ${text.substring(0, 25)}...`;
    }
    if (lowerText.includes('compare') || lowerText.includes('vs') || lowerText.includes('versus')) {
      return `Compare: ${text.substring(0, 25)}...`;
    }
    if (lowerText.includes('alternative') || lowerText.includes('different')) {
      return `Alternative: ${text.substring(0, 22)}...`;
    }
    
    // Default fallback
    const words = text.split(' ').slice(0, 4).join(' ');
    return `Branch: ${words}${text.split(' ').length > 4 ? '...' : ''}`;
  }
}
