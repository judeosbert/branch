import type { SettingsConfig } from '../components/SettingsPopup';

interface AIMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export class AIService {
  private settings: SettingsConfig;

  constructor(settings: SettingsConfig) {
    this.settings = settings;
  }

  async sendMessage(content: string, _conversationId?: string, _branchId?: string): Promise<AIMessage> {
    if (this.settings.aiEngine === 'mock') {
      return this.useMockService(content);
    }

    if (!this.settings.openaiApiKey || !this.isValidOpenAIKey(this.settings.openaiApiKey)) {
      throw new Error('Valid OpenAI API key is required for this AI engine');
    }

    try {
      return await this.useOpenAIService(content);
    } catch (error) {
      console.error('OpenAI API error, falling back to mock:', error);
      return this.useMockService(content);
    }
  }

  private async useOpenAIService(content: string): Promise<AIMessage> {
    const model = this.getOpenAIModel();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: content
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: assistantMessage,
      sender: 'assistant',
      timestamp: new Date(),
    };
  }

  private useMockService(content: string): Promise<AIMessage> {
    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = [
          "That's an interesting question! Let me think about it...",
          "I understand your point. Here's my perspective on that:",
          "Thanks for sharing that with me. I'd like to add:",
          "That's a great topic to explore. From what I know:",
          "I appreciate you bringing this up. Here's what I think:",
        ];

        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        const elaboration = this.generateMockElaboration(content);

        resolve({
          id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: `${randomResponse}\n\n${elaboration}`,
          sender: 'assistant',
          timestamp: new Date(),
        });
      }, 1000 + Math.random() * 2000); // 1-3 second delay
    });
  }

  private generateMockElaboration(userContent: string): string {
    const contentLower = userContent.toLowerCase();
    
    if (contentLower.includes('code') || contentLower.includes('programming')) {
      return "When it comes to programming, it's important to write clean, maintainable code. Consider breaking down complex problems into smaller, manageable pieces and always test your solutions thoroughly.";
    }
    
    if (contentLower.includes('design') || contentLower.includes('ui') || contentLower.includes('interface')) {
      return "Good design focuses on user experience and accessibility. Keep interfaces simple and intuitive, use consistent patterns, and always consider how users will interact with your designs.";
    }
    
    if (contentLower.includes('data') || contentLower.includes('analysis')) {
      return "Data analysis requires careful consideration of data quality, appropriate methodologies, and clear visualization. Always validate your assumptions and be transparent about limitations in your analysis.";
    }
    
    return "This is a complex topic that requires careful consideration of multiple factors. I'd recommend researching various perspectives and considering the broader context before making any decisions.";
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
}
