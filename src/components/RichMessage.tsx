import React, { useState, useEffect } from 'react';
import { Download, Eye, FileText, Image, FileVideo, FileAudio, File, Maximize2, X } from 'lucide-react';
import MarkdownMessage from './MarkdownMessage';
import type { FileAttachment } from './FileUpload';

interface RichMessageProps {
  content: string;
  attachments?: FileAttachment[];
  messageId: string;
  sender: 'user' | 'assistant';
  onCopyMessage: (content: string) => void;
  onAnalyzeFile?: (file: FileAttachment) => void;
  className?: string;
}

const RichMessage: React.FC<RichMessageProps> = ({
  content,
  attachments = [],
  onAnalyzeFile,
  className = ''
}) => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<string | null>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && expandedImage) {
        setExpandedImage(null);
      }
    };

    if (expandedImage) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [expandedImage]);

  const getFileIcon = (type: string, size: number = 20) => {
    if (type.startsWith('image/')) return <Image size={size} className="text-blue-500" />;
    if (type.startsWith('video/')) return <FileVideo size={size} className="text-purple-500" />;
    if (type.startsWith('audio/')) return <FileAudio size={size} className="text-green-500" />;
    if (type.includes('pdf')) return <FileText size={size} className="text-red-500" />;
    return <File size={size} className="text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAnalyzeFile = async (file: FileAttachment) => {
    if (!onAnalyzeFile) return;
    
    setLoadingAnalysis(file.id);
    try {
      await onAnalyzeFile(file);
    } finally {
      setLoadingAnalysis(null);
    }
  };

  const renderImageAttachment = (file: FileAttachment) => (
    <div key={file.id} className="relative group">
      <img
        src={file.url}
        alt={file.name}
        className="max-w-full h-auto rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
        style={{ maxHeight: '300px' }}
        onClick={() => setExpandedImage(file.url)}
      />
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setExpandedImage(file.url)}
          className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70 transition-colors"
          title="View full size"
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
        <span>{file.name}</span>
        <span>•</span>
        <span>{formatFileSize(file.size)}</span>
      </div>
    </div>
  );

  const renderFileAttachment = (file: FileAttachment) => (
    <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
      <div className="flex-shrink-0">
        {getFileIcon(file.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onAnalyzeFile && (
          <button
            onClick={() => handleAnalyzeFile(file)}
            disabled={loadingAnalysis === file.id}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
            title="Analyze with AI"
          >
            {loadingAnalysis === file.id ? 'Analyzing...' : 'Analyze'}
          </button>
        )}
        <button
          onClick={() => window.open(file.url, '_blank')}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="View"
        >
          <Eye size={16} className="text-gray-600" />
        </button>
        <button
          onClick={() => {
            const a = document.createElement('a');
            a.href = file.url;
            a.download = file.name;
            a.click();
          }}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Download"
        >
          <Download size={16} className="text-gray-600" />
        </button>
      </div>
    </div>
  );

  const renderVideoAttachment = (file: FileAttachment) => (
    <div key={file.id} className="relative">
      <video
        controls
        className="max-w-full h-auto rounded-lg border"
        style={{ maxHeight: '300px' }}
        preload="metadata"
      >
        <source src={file.url} type={file.type} />
        Your browser does not support the video tag.
      </video>
      <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
        <span>{file.name}</span>
        <span>•</span>
        <span>{formatFileSize(file.size)}</span>
      </div>
    </div>
  );

  const renderAudioAttachment = (file: FileAttachment) => (
    <div key={file.id} className="p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <FileAudio size={20} className="text-green-500" />
        <span className="text-sm font-medium">{file.name}</span>
        <span className="text-xs text-gray-500">• {formatFileSize(file.size)}</span>
      </div>
      <audio controls className="w-full">
        <source src={file.url} type={file.type} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Message Content */}
      {content && (
        <MarkdownMessage content={content} />
      )}

      {/* File Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          {attachments.map((file) => {
            if (file.type.startsWith('image/')) {
              return renderImageAttachment(file);
            } else if (file.type.startsWith('video/')) {
              return renderVideoAttachment(file);
            } else if (file.type.startsWith('audio/')) {
              return renderAudioAttachment(file);
            } else {
              return renderFileAttachment(file);
            }
          })}
        </div>
      )}

      {/* File Analysis Results */}
      {attachments.some(file => file.analysisResult) && (
        <div className="space-y-2">
          {attachments.filter(file => file.analysisResult).map((file) => (
            <div key={`analysis-${file.id}`} className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">AI Analysis: {file.name}</span>
              </div>
              <MarkdownMessage content={file.analysisResult!} className="text-sm" />
            </div>
          ))}
        </div>
      )}

      {/* Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute -top-12 right-0 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-colors z-10"
              title="Close (ESC)"
            >
              <X size={20} />
            </button>
            <img
              src={expandedImage}
              alt="Expanded view"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RichMessage;
