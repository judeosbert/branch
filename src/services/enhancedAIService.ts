import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SettingsConfig } from '../components/SettingsPopup';
import type { FileAttachment } from '../components/FileUpload';

// System message to help LLMs understand Branch's capabilities and optimize their responses
const BRANCH_SYSTEM_PROMPT = `# Branch AI Tool Context

You are interacting with **Branch**, an advanced conversational AI interface that supports **branching conversations** and **visual navigation**. This tool transforms linear AI chats into explorable conversation trees.

## 🌳 Core Features & UI

### **Branching Conversations**
- Users can **branch from ANY point** in our conversation by selecting specific text
- Each branch creates a **new conversation thread** while preserving the original context
- **Visual minimap** shows the conversation tree structure with nodes and connections
- **Multi-level branching** supported (branches can have sub-branches)

### **Split-Screen Interface**
- **Single Panel**: Linear conversation view (default)
- **Dual Panel**: When in a branch, shows:
  - **Left Panel**: Parent conversation context (up to branch point)
  - **Right Panel**: Active branch conversation
- **Seamless navigation** between branches via minimap or branch buttons
- **Reserved space** (256px) for minimap when branches exist

### **Enhanced Input Features**
- **File Upload**: Images, documents, audio, video support
- **Voice Recording**: Built-in microphone recording with pause/resume
- **Multi-colored Glow Effect**: Google logo colors when suggestions are selected
- **Auto-focus**: Intelligent input focusing for better UX

## 📝 Optimize Your Responses For:

### **Branchable Content Structure**
- **Clear topic transitions** that invite exploration
- **Multiple perspectives** or approaches in single responses
- **Distinct concepts** that could be explored separately
- **Logical break points** with headers, sections, bullet points
- **Progressive disclosure**: Start with overview, offer details through branching

### **Visual Organization**
- **Structured formatting**: Use headers, lists, and clear paragraphs
- **Topic sentences** at paragraph beginnings for easy selection
- **Cross-references** to related concepts that could be branched into
- **Natural branching points** with phrases like:
  - "We could explore this in more detail..."
  - "This opens up several possibilities..."
  - "An alternative approach would be..."

### **Code Generation Best Practices**
- **Complete, functional code blocks** (tool unifies code properly)
- **Clear sections** within code that can be individually discussed
- **Multiple implementation approaches** when relevant
- **Explanatory comments** for better understanding
- **Streaming-friendly**: Code blocks are properly handled during streaming

## 🎯 Conversation Flow Optimization

### **Branch-Aware Responses**
- **Maintain context awareness** - users may jump between branches
- **Use connecting phrases** like "Building on our earlier discussion..."
- **Provide clear summaries** when wrapping up complex topics
- **Reference previous context** clearly since users can return to earlier branches

### **Encourage Exploration**
- **End with actionable next steps** that invite further exploration
- **Offer multiple solution paths** that can be explored separately
- **Suggest related topics** that warrant their own branches
- **Create "branch-worthy" content** with distinct, explorable segments

### **🚨 CRITICAL BRANCHING RULE - ALWAYS FOLLOW THIS:**
**When you want to provide branchable suggestions or content that users can explore separately, you MUST prepend the text with \`--BranchableSection--\`**

**Examples:**
- \`--BranchableSection--\` **Advanced Configuration**: For users who want to dive deeper into configuration options...
- \`--BranchableSection--\` **Alternative Approach**: Here's a different way to solve this problem...
- \`--BranchableSection--\` **Implementation Details**: Let's explore the technical implementation...

**This marker is ESSENTIAL** - it tells the Branch interface which parts of your response can be branched from. Without this marker, users won't be able to branch from that content. Use it generously for any content that could benefit from separate exploration.

## 🔄 User Workflow Examples

1. **Research Flow**: User asks about a topic → You provide structured overview → User branches into specific aspects → Each branch explored independently
2. **Problem-Solving**: User presents problem → You offer multiple approaches → User branches into preferred solution → Sub-branches for implementation details
3. **Learning**: User asks for explanation → You provide progressive content → User branches into complex concepts → Focused explanations in separate threads
4. **Code Development**: User requests feature → You provide architecture overview → User branches into specific components → Detailed implementation in each branch

## 💡 Response Structure Template

Structure your responses to maximize Branch's capabilities:

\`\`\`
# Main Topic Overview
Brief introduction and key points...

--BranchableSection-- ## Approach 1: [Branchable Topic]
Detailed explanation that invites separate exploration...

--BranchableSection-- ## Approach 2: [Alternative Method]  
Another perspective that warrants its own branch...

## Implementation Details
Step-by-step process with clear, selectable segments...

--BranchableSection-- ## Advanced Configuration
For users who want to dive deeper into configuration options...

## Next Steps & Related Topics
- Regular content that provides context
- --BranchableSection-- **Specific Feature Deep Dive**: Detailed exploration of a particular feature
- --BranchableSection-- **Alternative Implementation**: Different approach worth exploring
- --BranchableSection-- **Troubleshooting Guide**: Common issues and solutions
\`\`\`

## 🎨 Technical Context

- **Multi-Provider Support**: OpenAI, Gemini, Mock services
- **File Processing**: Images analyzed via vision models, documents processed
- **Voice Integration**: Audio recordings transcribed and analyzed
- **Real-time Streaming**: Responses stream in real-time with proper code block handling
- **Microsoft Clarity**: Analytics tracking for usage insights

Remember: Users navigate non-linearly through our conversation. Make each response valuable both standalone and as part of the larger conversation tree. Your goal is to create rich, explorable content that leverages Branch's unique branching capabilities for deeper, more organized conversations.`;

interface AIMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  attachments?: FileAttachment[];
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
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

  private shouldIncludeSystemPrompt(conversationHistory: AIMessage[]): boolean {
    // Include system prompt if this is a new conversation (no history)
    // or if the conversation doesn't contain the system prompt yet
    return conversationHistory.length === 0 || 
           !conversationHistory.some(msg => 
             msg.content.includes('Branch AI Tool Context') || 
             msg.content.includes('branching conversations')
           );
  }

  private buildConversationWithSystemPrompt(
    conversationHistory: AIMessage[],
    branchContext?: BranchContext
  ): ConversationMessage[] {
    const messages: ConversationMessage[] = [];
    
    // Add system message for new conversations or conversations without context
    if (this.shouldIncludeSystemPrompt(conversationHistory)) {
      messages.push({
        role: 'system',
        content: BRANCH_SYSTEM_PROMPT
      });
    }
    
    // Add branch context if provided
    if (branchContext) {
      messages.push({
        role: 'system',
        content: `[Context: This is a branch from the text "${branchContext.selectedText}" in the previous conversation. The user wants to explore this specific aspect in more detail.]`
      });
    }
    
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
    
    return messages;
  }

  async *sendMessageStream(
    content: string, 
    attachments: FileAttachment[] = [],
    conversationHistory: AIMessage[] = [],
    branchContext?: BranchContext
  ): AsyncGenerator<string, AIMessage, unknown> {
    if (this.settings.aiEngine === 'mock') {
      yield* this.useMockServiceStream(content, attachments, conversationHistory, branchContext);
      return this.createMessage('', 'assistant');
    }

    // Route to provider-specific stream method based on selected provider
    if (this.settings.provider === 'openai') {
      if (!this.settings.openaiApiKey || !this.isValidOpenAIKey(this.settings.openaiApiKey)) {
        throw new Error('Valid OpenAI API key is required for this AI engine. Please check your settings and ensure your API key starts with "sk-" and is properly configured.');
      }

      // For vision-related requests, ensure we're using a vision-capable model
      const hasImages = attachments.some(att => att.type.startsWith('image/'));
      if (hasImages && !this.settings.model.includes('gpt-4')) {
        throw new Error(`Image analysis requires GPT-4 or GPT-4o. Current model: ${this.settings.model}. Please change to GPT-4 or GPT-4o in settings.`);
      }

      try {
        yield* this.useOpenAIServiceStream(content, attachments, conversationHistory, branchContext);
        return this.createMessage('', 'assistant');
      } catch (error) {
        console.error('OpenAI API error:', error);
        
        // For voice and image processing, we want to show the actual error instead of fallback
        const hasVoiceOrImage = attachments.some(att => 
          att.type.startsWith('audio/') || att.type.startsWith('image/')
        );
        
        if (hasVoiceOrImage) {
          // Show error message instead of falling back to mock for voice/image
          const errorMessage = error instanceof Error ? error.message : 'Unknown OpenAI API error';
          yield `⚠️ **OpenAI API Error**: ${errorMessage}\n\n`;
          yield `This error occurred while processing your ${attachments.some(att => att.type.startsWith('audio/')) ? 'voice recording' : 'image'}. `;
          yield `Please check your OpenAI API key and try again.\n\n`;
          yield `**Troubleshooting:**\n`;
          yield `- Verify your OpenAI API key is valid and has sufficient credits\n`;
          yield `- Check if you have access to the selected model (${this.settings.model})\n`;
          yield `- Ensure your API key has permission for vision/audio processing\n`;
          return this.createMessage('', 'assistant');
        }
        
        // For text-only messages, still fallback but warn the user
        console.warn('Falling back to mock service due to OpenAI API error');
        yield `⚠️ **Note**: Using mock AI service due to API error. Check console for details.\n\n`;
        yield* this.useMockServiceStream(content, attachments, conversationHistory, branchContext);
        return this.createMessage('', 'assistant');
      }
    } else if (this.settings.provider === 'gemini') {
      if (!this.settings.geminiApiKey || !this.isValidGeminiKey(this.settings.geminiApiKey)) {
        throw new Error('Valid Gemini API key is required for this AI engine. Please check your settings and ensure your API key is properly configured.');
      }

      try {
        yield* this.useGeminiServiceStream(content, attachments, conversationHistory, branchContext);
        return this.createMessage('', 'assistant');
      } catch (error) {
        console.error('Gemini API error:', error);
        
        // For voice and image processing, we want to show the actual error instead of fallback
        const hasVoiceOrImage = attachments.some(att => 
          att.type.startsWith('audio/') || att.type.startsWith('image/')
        );
        
        if (hasVoiceOrImage) {
          // Show error message instead of falling back to mock for voice/image
          const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini API error';
          yield `⚠️ **Gemini API Error**: ${errorMessage}\n\n`;
          yield `This error occurred while processing your ${attachments.some(att => att.type.startsWith('audio/')) ? 'voice recording' : 'image'}. `;
          yield `Please check your Gemini API key and try again.\n\n`;
          yield `**Troubleshooting:**\n`;
          yield `- Verify your Gemini API key is valid and has sufficient credits\n`;
          yield `- Check if you have access to the selected model (${this.settings.model})\n`;
          yield `- Ensure your API key has permission for vision/audio processing\n`;
          return this.createMessage('', 'assistant');
        }
        
        // For text-only messages, still fallback but warn the user
        console.warn('Falling back to mock service due to Gemini API error');
        yield `⚠️ **Note**: Using mock AI service due to API error. Check console for details.\n\n`;
        yield* this.useMockServiceStream(content, attachments, conversationHistory, branchContext);
        return this.createMessage('', 'assistant');
      }
    } else {
      // Fallback to mock for unknown providers
      yield* this.useMockServiceStream(content, attachments, conversationHistory, branchContext);
      return this.createMessage('', 'assistant');
    }
  }

  async analyzeFile(file: FileAttachment): Promise<string> {
    if (this.settings.aiEngine === 'mock') {
      return this.mockFileAnalysis(file);
    }

    // Route to provider-specific file analysis
    if (this.settings.provider === 'openai') {
      if (!this.settings.openaiApiKey || !this.isValidOpenAIKey(this.settings.openaiApiKey)) {
        throw new Error('Valid OpenAI API key is required for file analysis. Please check your settings and ensure your API key starts with "sk-" and is properly configured.');
      }

      // For image analysis, ensure we're using a vision-capable model
      if (file.type.startsWith('image/') && !this.settings.model.includes('gpt-4')) {
        throw new Error(`Image analysis requires GPT-4 or GPT-4o. Current model: ${this.settings.model}. Please change to GPT-4 or GPT-4o in settings.`);
      }

      try {
        return await this.analyzeFileWithOpenAI(file);
      } catch (error) {
        console.error('OpenAI file analysis error:', error);
        
        // For image and audio files, provide specific error information
        if (file.type.startsWith('image/') || file.type.startsWith('audio/')) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown OpenAI API error';
          return `⚠️ **OpenAI API Error for ${file.type.startsWith('image/') ? 'Image' : 'Audio'} Analysis**

**Error**: ${errorMessage}

**File**: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})

**Troubleshooting:**
- Verify your OpenAI API key is valid and has sufficient credits
- Check if you have access to GPT-4 Vision (required for image analysis)
- Ensure your API key has permission for vision/audio processing
- For audio files, make sure the format is supported (mp3, wav, m4a, etc.)

**Note**: File analysis requires a valid OpenAI API key and access to GPT-4 Vision for images or Whisper for audio.`;
        }
        
        // For other file types, still fallback but inform the user
        console.warn('Falling back to mock analysis due to OpenAI API error');
        return `⚠️ **Note**: Using mock analysis due to API error.\n\n${this.mockFileAnalysis(file)}`;
      }
    } else if (this.settings.provider === 'gemini') {
      if (!this.settings.geminiApiKey || !this.isValidGeminiKey(this.settings.geminiApiKey)) {
        throw new Error('Valid Gemini API key is required for file analysis. Please check your settings and ensure your API key is properly configured.');
      }

      try {
        return await this.analyzeFileWithGemini(file);
      } catch (error) {
        console.error('Gemini file analysis error:', error);
        
        // For image and audio files, provide specific error information
        if (file.type.startsWith('image/') || file.type.startsWith('audio/')) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown Gemini API error';
          return `⚠️ **Gemini API Error for ${file.type.startsWith('image/') ? 'Image' : 'Audio'} Analysis**

**Error**: ${errorMessage}

**File**: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})

**Troubleshooting:**
- Verify your Gemini API key is valid and has sufficient credits
- Check if you have access to Gemini Pro Vision (required for image analysis)
- Try a different file format or size

**Available Formats:**
- Images: PNG, JPEG, GIF, WebP (max 20MB)
- Audio: MP3, WAV, M4A, FLAC (max 25MB)`;
        }
        
        // For other file types, still fallback but inform the user
        console.warn('Falling back to mock analysis due to Gemini API error');
        return `⚠️ **Note**: Using mock analysis due to API error.\n\n${this.mockFileAnalysis(file)}`;
      }
    } else {
      // Fallback to mock for unknown providers
      return this.mockFileAnalysis(file);
    }
  }

  private async *useOpenAIServiceStream(
    content: string,
    attachments: FileAttachment[],
    conversationHistory: AIMessage[],
    branchContext?: BranchContext
  ): AsyncGenerator<string, void, unknown> {
    // Build conversation history with system prompt
    const messages = this.buildConversationWithSystemPrompt(conversationHistory, branchContext);

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
    let contentBuffer = '';
    let inCodeBlock = false;
    let codeBlockBuffer = '';

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
            if (data === '[DONE]') {
              // Yield any remaining content
              if (contentBuffer.trim()) {
                yield contentBuffer;
              }
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                contentBuffer += deltaContent;
                
                // Check for code block boundaries
                const lines = contentBuffer.split('\n');
                let processedContent = '';
                let tempBuffer = '';
                
                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  
                  // Check for code block start
                  if (line.match(/^```[\w]*$/) && !inCodeBlock) {
                    // Starting a code block
                    inCodeBlock = true;
                    codeBlockBuffer = line + '\n';
                    // Yield any content before the code block
                    if (processedContent.trim()) {
                      yield processedContent;
                      processedContent = '';
                    }
                  } else if (line.trim() === '```' && inCodeBlock) {
                    // Ending a code block
                    inCodeBlock = false;
                    codeBlockBuffer += line + '\n';
                    // Yield the complete code block
                    yield codeBlockBuffer;
                    codeBlockBuffer = '';
                  } else if (inCodeBlock) {
                    // Inside a code block - accumulate
                    codeBlockBuffer += line + (i < lines.length - 1 ? '\n' : '');
                  } else {
                    // Outside code block - process normally
                    if (i === lines.length - 1 && !deltaContent.endsWith('\n')) {
                      // Last line might be incomplete, keep in buffer
                      tempBuffer = line;
                    } else {
                      processedContent += line + (i < lines.length - 1 ? '\n' : '');
                    }
                  }
                }
                
                // Yield processed content if not in code block
                if (!inCodeBlock && processedContent.trim()) {
                  yield processedContent;
                  contentBuffer = tempBuffer;
                } else if (inCodeBlock) {
                  // Keep accumulating in code block
                  contentBuffer = '';
                } else {
                  contentBuffer = tempBuffer;
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      // Handle any remaining content
      if (contentBuffer.trim()) {
        yield contentBuffer;
      }
    } finally {
      reader.releaseLock();
    }
  }

  private buildGeminiConversationHistory(
    conversationHistory: AIMessage[],
    branchContext?: BranchContext
  ): any[] {
    const history: any[] = [];
    
    // Add system message for new conversations as a user/model exchange
    if (this.shouldIncludeSystemPrompt(conversationHistory)) {
      history.push({
        role: 'user',
        parts: [{ text: 'Please understand the context of this conversation tool and optimize your responses accordingly.' }]
      });
      history.push({
        role: 'model',
        parts: [{ text: BRANCH_SYSTEM_PROMPT }]
      });
    }
    
    // Add branch context if provided
    if (branchContext) {
      history.push({
        role: 'user',
        parts: [{ text: `Context: This is a branch from the text "${branchContext.selectedText}" in the previous conversation. Please focus on this specific aspect.` }]
      });
      history.push({
        role: 'model',
        parts: [{ text: 'I understand this is a branch focusing on the selected text. I\'ll provide detailed exploration of this specific aspect.' }]
      });
    }
    
    // Add conversation history
    for (const msg of conversationHistory) {
      history.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }
    
    return history;
  }

  private async *useGeminiServiceStream(
    content: string, 
    attachments: FileAttachment[] = [],
    conversationHistory: AIMessage[] = [],
    branchContext?: BranchContext
  ): AsyncGenerator<string, AIMessage, unknown> {
    try {
      // Initialize the Gemini API client
      const genAI = new GoogleGenerativeAI(this.settings.geminiApiKey);
      
      // Map model ID to actual Gemini model name
      const geminiModel = this.getGeminiModelName(this.settings.model || this.settings.aiEngine);
      console.log('🔍 Gemini request - Model:', geminiModel, 'Settings model:', this.settings.model);
      
      // Get the model instance
      const model = genAI.getGenerativeModel({ model: geminiModel });

      // Build chat history for Gemini with system prompt
      const chatHistory = this.buildGeminiConversationHistory(conversationHistory, branchContext);

      // Start chat with history
      const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        }
      });

      // Prepare the current message parts
      const currentMessageParts: any[] = [{ text: content }];
      
      // Handle attachments for Gemini
      for (const attachment of attachments) {
        if (attachment.type.startsWith('image/')) {
          // For images, add to message parts
          currentMessageParts.push({
            inlineData: {
              mimeType: attachment.type,
              data: attachment.data?.split(',')[1] || attachment.data // Remove data URL prefix if present
            }
          });
        } else {
          // For non-image files, include context about the file
          currentMessageParts.push({
            text: `[File attached: ${attachment.name} (${attachment.type}, ${this.formatFileSize(attachment.size)}). Please analyze this file if relevant to the conversation.]`
          });
        }
      }

      // Send message and stream response
      const result = await chat.sendMessageStream(currentMessageParts);
      
      // Code block boundary detection for Gemini streaming
      let contentBuffer = '';
      let inCodeBlock = false;
      let codeBlockBuffer = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          contentBuffer += chunkText;
          
          // Check for code block boundaries
          const lines = contentBuffer.split('\n');
          let processedContent = '';
          let tempBuffer = '';
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for code block start
            if (line.match(/^```[\w]*$/) && !inCodeBlock) {
              // Starting a code block
              inCodeBlock = true;
              codeBlockBuffer = line + '\n';
              // Yield any content before the code block
              if (processedContent.trim()) {
                yield processedContent;
                processedContent = '';
              }
            } else if (line.trim() === '```' && inCodeBlock) {
              // Ending a code block
              inCodeBlock = false;
              codeBlockBuffer += line + '\n';
              // Yield the complete code block
              yield codeBlockBuffer;
              codeBlockBuffer = '';
            } else if (inCodeBlock) {
              // Inside a code block - accumulate
              codeBlockBuffer += line + (i < lines.length - 1 ? '\n' : '');
            } else {
              // Outside code block - process normally
              if (i === lines.length - 1 && !chunkText.endsWith('\n')) {
                // Last line might be incomplete, keep in buffer
                tempBuffer = line;
              } else {
                processedContent += line + (i < lines.length - 1 ? '\n' : '');
              }
            }
          }
          
          // Yield processed content if not in code block
          if (!inCodeBlock && processedContent.trim()) {
            yield processedContent;
            contentBuffer = tempBuffer;
          } else if (inCodeBlock) {
            // Keep accumulating in code block
            contentBuffer = '';
          } else {
            contentBuffer = tempBuffer;
          }
        }
      }
      
      // Handle any remaining content
      if (contentBuffer.trim()) {
        yield contentBuffer;
      }

      // Return a placeholder message - the actual message will be constructed by the caller
      return this.createMessage('', 'assistant');
    } catch (error) {
      console.error('🔍 Gemini streaming error:', error);
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private async analyzeFileWithGemini(file: FileAttachment): Promise<string> {
    try {
      // Initialize the Gemini API client
      const genAI = new GoogleGenerativeAI(this.settings.geminiApiKey);
      
      // Map model ID to actual Gemini model name
      const geminiModel = this.getGeminiModelName(this.settings.model || this.settings.aiEngine);
      
      // Get the model instance
      const model = genAI.getGenerativeModel({ model: geminiModel });

      let analysisPrompt = '';
      const parts: any[] = [];

      if (file.type.startsWith('image/')) {
        analysisPrompt = `Please analyze this image in detail. Describe what you see, including:
- Main subjects and objects
- Colors, composition, and visual elements
- Any text or writing visible
- Context or setting
- Any notable details or interesting aspects

Please provide a thorough analysis that would be helpful for someone who cannot see the image.`;
        
        parts.push({ text: analysisPrompt });
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: file.data?.split(',')[1] || file.data // Remove data URL prefix if present
          }
        });
      } else if (file.type.startsWith('audio/')) {
        // For audio files, we'll need to handle them differently
        // Gemini doesn't support audio analysis directly, so we'll provide a helpful message
        return `⚠️ **Audio Analysis Not Supported**

**File**: ${file.name} (${file.type}, ${this.formatFileSize(file.size)})

Gemini does not currently support direct audio file analysis. For audio transcription and analysis, please:

1. Use OpenAI (which supports Whisper for audio transcription)
2. Or convert your audio to text first and then analyze the text
3. Or use a dedicated audio transcription service

**Supported File Types with Gemini:**
- Images: PNG, JPEG, GIF, WebP
- Text files: TXT, MD, JSON, etc.`;
      } else {
        // For other file types, we can't process them directly
        analysisPrompt = `I can see you've attached a file named "${file.name}" (${file.type}, ${this.formatFileSize(file.size)}). 

Unfortunately, I cannot directly analyze this file type with Gemini. I can help you with:
- Image analysis (PNG, JPEG, GIF, WebP)
- Text-based discussions about the file
- General questions about this file type

If this is a text file, please copy and paste the content, and I'll be happy to analyze it for you.`;
        
        parts.push({ text: analysisPrompt });
      }

      // Generate content using the official library
      const result = await model.generateContent(parts);
      const response = await result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      console.error('🔍 Gemini file analysis error:', error);
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async *useMockServiceStream(
    content: string, 
    attachments: FileAttachment[], 
    conversationHistory: AIMessage[] = [],
    branchContext?: BranchContext
  ): AsyncGenerator<string, void, unknown> {
    const isNewConversation = this.shouldIncludeSystemPrompt(conversationHistory);
    const isBranch = !!branchContext;
    
    const responses = [
      isNewConversation ? "Hello! I'm Branch AI, your conversational AI with branching capabilities. " : "I can see you've sent a message",
      attachments.length > 0 ? ` with ${attachments.length} file${attachments.length > 1 ? 's' : ''}` : '',
      `. Let me help you with that.`,
      '\n\n',
      isBranch ? `🌿 **Branch Context**: This is a branch exploring "${branchContext?.selectedText}" in more detail.\n\n` : '',
      attachments.length > 0 ? `I notice you've attached:\n${attachments.map(f => `- ${f.name} (${f.type})`).join('\n')}\n\n` : '',
      `Regarding your message: "${content}"`,
      '\n\n',
      isNewConversation ? 'Since this is a new conversation, I\'ll optimize my responses for Branch\'s branching capabilities:\n\n' : '',
      'This is a mock response that simulates streaming. ',
      'In a real implementation, this would be connected to an actual AI service like OpenAI GPT-4 Vision ',
      'which can analyze images, read documents, and understand various file formats.',
      '\n\n',
      '## Enhanced Features:',
      '\n- **🌳 Branching Conversations**: You can branch from any text I provide',
      '\n- **📊 Visual Navigation**: Minimap shows conversation structure',
      '\n- **📎 File Analysis**: Understanding and describing images in detail',
      '\n- **📄 Document Processing**: Reading and analyzing text documents',
      '\n- **🎵 Audio/Video Support**: Handling multimedia files',
      '\n- **🎤 Voice Recording**: Support for voice messages',
      '\n\n',
      '## Branching Suggestions:',
      '\n- --BranchableSection-- **File Processing Details**: How different file types are handled and analyzed',
      '\n- --BranchableSection-- **AI Service Integration**: Technical implementation details and API configurations',
      '\n- --BranchableSection-- **User Interface Features**: Split-screen navigation and minimap capabilities',
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

  private isValidGeminiKey(key: string): boolean {
    return key.startsWith('AIza') && key.length > 20;
  }

  // Test the API key and model access
  async testAPIConnection(): Promise<{ success: boolean; error?: string }> {
    console.log('🔍 testAPIConnection - Provider:', this.settings.provider);
    console.log('🔍 testAPIConnection - Settings:', this.settings);
    
    // Handle different providers
    if (this.settings.provider === 'mock') {
      return { success: true };
    }
    
    if (this.settings.provider === 'openai') {
      console.log('🔍 testAPIConnection - Routing to OpenAI');
      return await this.testOpenAIConnection();
    }
    
    if (this.settings.provider === 'gemini') {
      console.log('🔍 testAPIConnection - Routing to Gemini');
      return await this.testGeminiConnection();
    }

    return { success: false, error: 'Unknown provider' };
  }

  private async testOpenAIConnection(): Promise<{ success: boolean; error?: string }> {
    console.log('🔍 testOpenAIConnection - OpenAI API Key:', this.settings.openaiApiKey ? 'Present' : 'Missing');
    console.log('🔍 testOpenAIConnection - Making request to: https://api.openai.com/v1/models');
    
    if (!this.settings.openaiApiKey || !this.isValidOpenAIKey(this.settings.openaiApiKey)) {
      return { success: false, error: 'Invalid API key format. OpenAI keys should start with "sk-"' };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.settings.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: `API Error (${response.status}): ${errorData.error?.message || response.statusText}` 
        };
      }

      const data = await response.json();
      const availableModels = data.data?.map((model: any) => model.id) || [];
      
      // Check if the selected model is available
      if (!availableModels.includes(this.settings.model)) {
        return { 
          success: false, 
          error: `Model "${this.settings.model}" not available. Available models: ${availableModels.slice(0, 5).join(', ')}${availableModels.length > 5 ? '...' : ''}` 
        };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error connecting to OpenAI' 
      };
    }
  }

  private async testGeminiConnection(): Promise<{ success: boolean; error?: string }> {
    console.log('🔍 testGeminiConnection - Gemini API Key:', this.settings.geminiApiKey ? 'Present' : 'Missing');
    console.log('🔍 testGeminiConnection - Model:', this.settings.model);
    
    if (!this.settings.geminiApiKey || !this.isValidGeminiKey(this.settings.geminiApiKey)) {
      return { success: false, error: 'Invalid API key format. Gemini keys should start with "AIza"' };
    }

    try {
      // Initialize the Gemini API client
      const genAI = new GoogleGenerativeAI(this.settings.geminiApiKey);
      
      const geminiModel = this.getGeminiModelName(this.settings.model);
      console.log('🔍 testGeminiConnection - Using Gemini model:', geminiModel);
      
      // Get the model instance
      const model = genAI.getGenerativeModel({ model: geminiModel });

      // Test with a simple request
      const result = await model.generateContent("Hello");
      const response = await result.response;
      const text = response.text();
      
      console.log('🔍 testGeminiConnection - Response received:', text ? 'Success' : 'Empty response');
      
      return { success: true };
    } catch (error) {
      console.error('🔍 testGeminiConnection - Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error connecting to Gemini' 
      };
    }
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

  private getGeminiModelName(modelId: string): string {
    // Map our internal model IDs to actual Gemini API model names
    const modelMapping: { [key: string]: string } = {
      'gemini-2.5-pro': 'gemini-2.0-flash-exp',
      'gemini-2.5-flash': 'gemini-2.0-flash-exp', 
      'gemini-2.5-flash-lite-preview-06-17': 'gemini-2.0-flash-exp',
      'gemini-2.0-flash': 'gemini-2.0-flash-exp',
      'gemini-2.0-flash-lite': 'gemini-2.0-flash-exp',
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'gemini-1.5-flash-8b': 'gemini-1.5-flash-8b',
      'gemini-1.5-pro': 'gemini-1.5-pro'
    };

    return modelMapping[modelId] || 'gemini-1.5-flash'; // fallback to a known working model
  }
}

export default EnhancedAIService;
