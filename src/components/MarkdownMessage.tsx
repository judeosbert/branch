import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownMessageProps {
  content: string;
  className?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
}

const MarkdownMessage = React.forwardRef<HTMLDivElement, MarkdownMessageProps>(
  ({ content, className = '', onMouseDown, onMouseUp, onDragStart }, ref) => {
    return (
      <div 
        ref={ref}
        className={`markdown-content text-gray-800 leading-relaxed select-text mb-4 cursor-text precise-select ${className}`}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onDragStart={onDragStart}
      >
        <ReactMarkdown
          components={{
            // Custom rendering for code blocks
            code(props: any) {
              const { inline, className, children, ...rest } = props;
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              
              return !inline && language ? (
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={language}
                  PreTag="div"
                  customStyle={{
                    margin: '1rem 0',
                    borderRadius: '8px',
                    fontSize: '0.875rem'
                  }}
                  {...rest}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code 
                  className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...rest}
                >
                  {children}
                </code>
              );
            },
            // Custom rendering for headings
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 border-b border-gray-200 pb-2">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold mt-5 mb-3 text-gray-900">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-medium mt-4 mb-2 text-gray-900">
                {children}
              </h3>
            ),
            // Custom rendering for paragraphs
            p: ({ children }) => (
              <p className="mb-4 last:mb-0 whitespace-pre-wrap">
                {children}
              </p>
            ),
            // Custom rendering for lists
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-4 space-y-1 ml-4">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 space-y-1 ml-4">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-800">
                {children}
              </li>
            ),
            // Custom rendering for blockquotes
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-blue-50 text-gray-700 italic">
                {children}
              </blockquote>
            ),
            // Custom rendering for links
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {children}
              </a>
            ),
            // Custom rendering for tables
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border border-gray-300 rounded-lg">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-left">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-300 px-4 py-2">
                {children}
              </td>
            ),
            // Custom rendering for horizontal rules
            hr: () => (
              <hr className="my-6 border-t border-gray-300" />
            ),
            // Custom rendering for emphasis
            em: ({ children }) => (
              <em className="italic text-gray-700">
                {children}
              </em>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-900">
                {children}
              </strong>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
);

MarkdownMessage.displayName = 'MarkdownMessage';

export default MarkdownMessage;
