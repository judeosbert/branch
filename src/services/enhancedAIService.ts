import type { SettingsConfig } from '../components/SettingsPopup';
import type { FileAttachment } from '../components/FileUpload';

interface AIMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  attachments?: FileAttachment[];
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

interface BranchContext {
  selectedText: string;
  sourceMessageId: string;
  sourceMessage: string;
}

export class EnhancedAIService {
  private settings: SettingsConfig;

  constructor(settings: SettingsConfig) {
    this.settings = settings;
  }

  async *sendMessageStream(
    content: string, 
    attachments: FileAttachment[] = [],
    conversationHistory: AIMessage[] = [],
    branchContext?: BranchContext
  ): AsyncGenerator<string, AIMessage, unknown> {
    if (this.settings.aiEngine === 'mock') {
      yield* this.useMockServiceStream(content, attachments);
      return this.createMessage('', 'assistant');
    }

    if (!this.settings.openaiApiKey || !this.isValidOpenAIKey(this.settings.openaiApiKey)) {
      throw new Error('Valid OpenAI API key is required for this AI engine');
    }

    try {
      yield* this.useOpenAIServiceStream(content, attachments, conversationHistory, branchContext);
      return this.createMessage('', 'assistant');
    } catch (error) {
      console.error('OpenAI API error, falling back to mock:', error);
      yield* this.useMockServiceStream(content, attachments);
      return this.createMessage('', 'assistant');
    }
  }

  async analyzeFile(file: FileAttachment): Promise<string> {
    if (this.settings.aiEngine === 'mock') {
      return this.mockFileAnalysis(file);
    }

    if (!this.settings.openaiApiKey || !this.isValidOpenAIKey(this.settings.openaiApiKey)) {
      throw new Error('Valid OpenAI API key is required for file analysis');
    }

    try {
      return await this.analyzeFileWithOpenAI(file);
    } catch (error) {
      console.error('OpenAI file analysis error, falling back to mock:', error);
      return this.mockFileAnalysis(file);
    }
  }

  private async *useOpenAIServiceStream(
    content: string,
    attachments: FileAttachment[],
    conversationHistory: AIMessage[],
    branchContext?: BranchContext
  ): AsyncGenerator<string, void, unknown> {
    const messages: ConversationMessage[] = [];

    // Add conversation history
    for (const msg of conversationHistory) {
      if (msg.attachments && msg.attachments.length > 0) {
        // Handle messages with attachments
        const messageContent: any[] = [];
        
        if (msg.content) {
          messageContent.push({ type: 'text', text: msg.content });
        }

        for (const attachment of msg.attachments) {
          if (attachment.type.startsWith('image/')) {
            messageContent.push({
              type: 'image_url',
              image_url: {
                url: attachment.data || attachment.url,
                detail: 'high'
              }
            });
          } else {
            // For non-image files, include them as text descriptions
            messageContent.push({
              type: 'text',
              text: `[File: ${attachment.name} (${attachment.type}, ${this.formatFileSize(attachment.size)})]`
            });
          }
        }

        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: messageContent
        });
      } else {
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }

    // Add branch context if provided
    if (branchContext) {
      messages.push({
        role: 'user',
        content: `Context: Based on the selected text "${branchContext.selectedText}" from the previous message, please continue the conversation focusing on this specific aspect.`
      });
    }

    // Add current message with attachments
    const currentMessageContent: any[] = [];
    
    if (content) {
      currentMessageContent.push({ type: 'text', text: content });
    }

    for (const attachment of attachments) {
      if (attachment.type.startsWith('image/')) {
        currentMessageContent.push({
          type: 'image_url',
          image_url: {
            url: attachment.data || attachment.url,
            detail: 'high'
          }
        });
      } else {
        // For non-image files, include context about the file
        currentMessageContent.push({
          type: 'text',
          text: `[File attached: ${attachment.name} (${attachment.type}, ${this.formatFileSize(attachment.size)}). Please analyze this file if relevant to the conversation.]`
        });
      }
    }

    messages.push({
      role: 'user',
      content: currentMessageContent.length > 0 ? currentMessageContent : content
    });

    const requestBody = {
      model: this.settings.model,
      messages: messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 4000
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.openaiApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available');
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async analyzeFileWithOpenAI(file: FileAttachment): Promise<string> {
    let analysisPrompt = '';
    let messageContent: any[] = [];

    if (file.type.startsWith('image/')) {
      analysisPrompt = `Please analyze this image in detail. Describe what you see, including:
- Main subjects and objects
- Colors, composition, and visual elements
- Any text or writing visible
- Context or setting
- Any notable details or interesting aspects
- Potential use cases or applications

Provide a comprehensive analysis that would be helpful for understanding the image content.`;

      messageContent = [
        { type: 'text', text: analysisPrompt },
        {
          type: 'image_url',
          image_url: {
            url: file.data || file.url,
            detail: 'high'
          }
        }
      ];
    } else if (file.type.startsWith('text/') || file.type.includes('document')) {
      analysisPrompt = `Please analyze this ${file.type} file named "${file.name}". 
Based on the file type and name, provide insights about:
- What type of document this likely is
- Potential content and structure
- Suggested use cases
- How it might be relevant in a conversation
- Any recommendations for working with this file type

File details: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})`;

      messageContent = [{ type: 'text', text: analysisPrompt }];
    } else if (file.type.startsWith('audio/')) {
      analysisPrompt = `This is an audio file: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})
Please provide information about:
- What type of audio content this might be
- Potential transcription or analysis options
- How audio files like this are typically used
- Suggestions for working with this audio format`;

      messageContent = [{ type: 'text', text: analysisPrompt }];
    } else if (file.type.startsWith('video/')) {
      analysisPrompt = `This is a video file: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})
Please provide information about:
- What type of video content this might be
- Potential analysis or processing options
- How video files like this are typically used
- Suggestions for working with this video format`;

      messageContent = [{ type: 'text', text: analysisPrompt }];
    } else {
      analysisPrompt = `Please analyze this file: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})
Provide insights about:
- What type of file this is
- Common uses for this file type
- How it might be relevant in a conversation
- Suggestions for working with this file type`;

      messageContent = [{ type: 'text', text: analysisPrompt }];
    }

    const requestBody = {
      model: this.settings.model,
      messages: [{
        role: 'user',
        content: messageContent
      }],
      temperature: 0.7,
      max_tokens: 1000
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.settings.openaiApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async *useMockServiceStream(content: string, attachments: FileAttachment[]): AsyncGenerator<string, void, unknown> {
    const responses = [
      "I can see you've sent a message",
      attachments.length > 0 ? ` with ${attachments.length} file${attachments.length > 1 ? 's' : ''}` : '',
      `. Let me help you with that.`,
      '\n\n',
      attachments.length > 0 ? `I notice you've attached:\n${attachments.map(f => `- ${f.name} (${f.type})`).join('\n')}\n\n` : '',
      `Regarding your message: "${content}"`,
      '\n\n',
      'This is a mock response that simulates streaming. ',
      'In a real implementation, this would be connected to an actual AI service like OpenAI GPT-4 Vision ',
      'which can analyze images, read documents, and understand various file formats.',
      '\n\n',
      'The enhanced features include:',
      '\n- **Image Analysis**: Understanding and describing images in detail',
      '\n- **Document Processing**: Reading and analyzing text documents',
      '\n- **Audio/Video Support**: Handling multimedia files',
      '\n- **File Context**: Using file content to inform responses',
      '\n- **Voice Recording**: Support for voice messages',
      '\n\n',
      'All files are processed securely and analyzed to provide relevant insights for your conversation.'
    ];

    for (const chunk of responses) {
      await new Promise(resolve => setTimeout(resolve, 50));
      yield chunk;
    }
  }

  private mockFileAnalysis(file: FileAttachment): string {
    if (file.type.startsWith('image/')) {
      return `**Image Analysis: ${file.name}**

This appears to be an image file (${file.type}, ${this.formatFileSize(file.size)}). 

*Mock Analysis Results:*
- **Format**: ${file.type}
- **Size**: ${this.formatFileSize(file.size)}
- **Estimated content**: This would typically contain visual elements that I could analyze in detail with proper AI vision capabilities
- **Recommendations**: Upload this image to get detailed analysis of objects, text, scenes, and other visual elements

*Note: This is a mock analysis. With a real AI service, I would provide detailed visual analysis including object detection, scene understanding, text extraction, and contextual insights.*`;
    } else if (file.type.startsWith('text/') || file.type.includes('document')) {
      return `**Document Analysis: ${file.name}**

This is a document file (${file.type}, ${this.formatFileSize(file.size)}).

*Mock Analysis Results:*
- **File Type**: ${file.type}
- **Size**: ${this.formatFileSize(file.size)}
- **Estimated content**: This would typically contain text content that I could read and analyze
- **Potential uses**: Document review, content extraction, summarization, Q&A

*Note: This is a mock analysis. With a real AI service, I would read the document content and provide detailed analysis, summaries, and answer questions about the content.*`;
    } else if (file.type.startsWith('audio/')) {
      return `**Audio Analysis: ${file.name}**

This is an audio file (${file.type}, ${this.formatFileSize(file.size)}).

*Mock Analysis Results:*
- **Format**: ${file.type}
- **Size**: ${this.formatFileSize(file.size)}
- **Duration**: Estimated based on file size
- **Potential content**: Voice recording, music, or other audio content

*Note: This is a mock analysis. With a real AI service, I could transcribe speech, analyze audio content, and provide insights about the audio.*`;
    } else {
      return `**File Analysis: ${file.name}**

File type: ${file.type} (${this.formatFileSize(file.size)})

*Mock Analysis Results:*
- **Recognized format**: ${file.type}
- **Size**: ${this.formatFileSize(file.size)}
- **General insights**: This file type can be processed depending on its content

*Note: This is a mock analysis. With a real AI service, I would provide specific insights based on the file type and content.*`;
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private isValidOpenAIKey(key: string): boolean {
    return key.startsWith('sk-') && key.length > 20;
  }

  private createMessage(content: string, sender: 'user' | 'assistant'): AIMessage {
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      sender,
      timestamp: new Date()
    };
  }

  getMessageHistory(): AIMessage[] {
    // Return empty array for now, can be implemented to store history
    return [];
  }

  async generateBranchTitle(branchText: string, conversationHistory: AIMessage[] = []): Promise<string> {
    const prompt = `Based on the following conversation context and the selected text for branching, generate a concise, descriptive title for this conversation branch. The title should be 3-8 words and capture the essence of what this branch will focus on.

Selected text for branching: "${branchText}"

Conversation context:
${conversationHistory.slice(-3).map(msg => `${msg.sender}: ${msg.content.substring(0, 200)}...`).join('\n')}

Generate only the title, no quotes or additional text:`;

    if (this.settings.aiEngine === 'mock') {
      // Generate a simple title based on the branch text
      const cleanText = branchText.trim().substring(0, 40);
      const words = cleanText.split(' ').slice(0, 6).join(' ');
      return `Branch: ${words}${branchText.length > 40 ? '...' : ''}`;
    }

    if (!this.settings.openaiApiKey || !this.isValidOpenAIKey(this.settings.openaiApiKey)) {
      throw new Error('Valid OpenAI API key is required for branch title generation');
    }

    try {
      const requestBody = {
        model: this.settings.model,
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 20
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.openaiApiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const title = data.choices[0].message.content.trim();
      
      // Ensure title is reasonable length
      if (title.length > 50) {
        return title.substring(0, 47) + '...';
      }
      
      return title;
    } catch (error) {
      console.error('Error generating branch title:', error);
      // Fallback to simple title
      const cleanText = branchText.trim().substring(0, 40);
      const words = cleanText.split(' ').slice(0, 6).join(' ');
      return `Branch: ${words}${branchText.length > 40 ? '...' : ''}`;
    }
  }
}

export default EnhancedAIService;
