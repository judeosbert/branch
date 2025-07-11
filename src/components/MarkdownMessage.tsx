import React, { useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownMessageProps {
  content: string;
  className?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
}

// Configure marked options
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
});

const MarkdownMessage = React.forwardRef<HTMLDivElement, MarkdownMessageProps>(
  ({ content, className = '', onMouseDown, onMouseUp, onDragStart }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Convert markdown to HTML and sanitize it
    const htmlContent = useMemo(() => {
      if (!content) return '';
      
      try {
        // Convert markdown to HTML
        const rawHtml = marked.parse(content);
        
        // Ensure rawHtml is a string (marked.parse can return Promise<string> in some configs)
        const htmlString = typeof rawHtml === 'string' ? rawHtml : '';
        
        // Sanitize the HTML to prevent XSS attacks
        const cleanHtml = DOMPurify.sanitize(htmlString, {
          ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'strong', 'em', 'u', 's',
            'ul', 'ol', 'li',
            'blockquote',
            'a', 'code', 'pre',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'hr', 'span', 'div'
          ],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id']
        });
        
        return cleanHtml;
      } catch (error) {
        console.error('Error converting markdown to HTML:', error);
        return content; // Fallback to plain text
      }
    }, [content]);

    // Add copy buttons to code blocks after rendering
    useEffect(() => {
      if (!containerRef.current) return;

      const preElements = containerRef.current.querySelectorAll('pre');
      
      preElements.forEach((preElement) => {
        // Skip if copy button already exists
        if (preElement.querySelector('.copy-button')) return;
        
        const codeElement = preElement.querySelector('code');
        if (!codeElement) return;

        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = 'Copy';
        copyButton.setAttribute('aria-label', 'Copy code');
        
        copyButton.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(codeElement.textContent || '');
            copyButton.innerHTML = 'Copied!';
            copyButton.classList.add('copied');
            
            setTimeout(() => {
              copyButton.innerHTML = 'Copy';
              copyButton.classList.remove('copied');
            }, 2000);
          } catch (err) {
            console.error('Failed to copy code:', err);
          }
        });

        preElement.appendChild(copyButton);
      });
    }, [htmlContent]);

    return (
      <div 
        ref={ref || containerRef}
        className={`markdown-content text-gray-800 leading-relaxed select-text mb-2 cursor-text ${className}`}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onDragStart={onDragStart}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }
);

MarkdownMessage.displayName = 'MarkdownMessage';

export default MarkdownMessage;
