/**
 * Utility functions for handling code block unification
 * This ensures code blocks remain as single logical units
 */

/**
 * Unifies fragmented code blocks in text content
 * @param content - The text content to process
 * @returns The processed content with unified code blocks
 */
export function unifyCodeBlocks(content: string): string {
  if (!content.trim()) return content;
  
  const lines = content.split('\n');
  const processedLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for code block start
    if (line.match(/^```[\w]*$/) && !inCodeBlock) {
      inCodeBlock = true;
      codeBlockBuffer = [line];
      continue;
    }
    
    // Check for code block end
    if (line.trim() === '```' && inCodeBlock) {
      inCodeBlock = false;
      codeBlockBuffer.push(line);
      
      // Add the complete code block as a single unit
      processedLines.push(codeBlockBuffer.join('\n'));
      codeBlockBuffer = [];
      continue;
    }
    
    // Inside code block - accumulate lines
    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }
    
    // Outside code block - add line normally
    processedLines.push(line);
  }
  
  // Handle unclosed code block
  if (inCodeBlock && codeBlockBuffer.length > 0) {
    processedLines.push(codeBlockBuffer.join('\n'));
  }
  
  return processedLines.join('\n');
}

/**
 * Processes streaming content to maintain code block boundaries
 * @param chunk - The current chunk of content
 * @param contentBuffer - The accumulated content buffer
 * @param inCodeBlock - Whether we're currently inside a code block
 * @param codeBlockBuffer - The current code block buffer
 * @returns Object with processed content and updated state
 */
export function processStreamingChunk(
  chunk: string,
  contentBuffer: string,
  inCodeBlock: boolean,
  codeBlockBuffer: string
): {
  processedContent: string;
  newContentBuffer: string;
  newInCodeBlock: boolean;
  newCodeBlockBuffer: string;
} {
  const updatedBuffer = contentBuffer + chunk;
  const lines = updatedBuffer.split('\n');
  let processedContent = '';
  let tempBuffer = '';
  let newInCodeBlock = inCodeBlock;
  let newCodeBlockBuffer = codeBlockBuffer;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLastLine = i === lines.length - 1;
    
    // If it's the last line and there's no trailing newline, keep it in buffer
    if (isLastLine && !chunk.endsWith('\n')) {
      tempBuffer = line;
      continue;
    }
    
    // Check for code block boundaries
    if (line.match(/^```[\w]*$/) && !newInCodeBlock) {
      // Starting a code block
      newInCodeBlock = true;
      newCodeBlockBuffer = line;
      continue;
    } else if (line.trim() === '```' && newInCodeBlock) {
      // Ending a code block
      newInCodeBlock = false;
      newCodeBlockBuffer += '\n' + line;
      
      // Output the complete code block
      processedContent += newCodeBlockBuffer + (i < lines.length - 1 ? '\n' : '');
      newCodeBlockBuffer = '';
      continue;
    } else if (newInCodeBlock) {
      // Inside code block - accumulate
      newCodeBlockBuffer += (newCodeBlockBuffer ? '\n' : '') + line;
      continue;
    } else {
      // Outside code block - add normally
      processedContent += line + (i < lines.length - 1 ? '\n' : '');
    }
  }
  
  return {
    processedContent,
    newContentBuffer: tempBuffer,
    newInCodeBlock,
    newCodeBlockBuffer
  };
}
