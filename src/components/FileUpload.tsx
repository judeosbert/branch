import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Image, FileText, FileVideo, FileAudio, X, Download, Eye } from 'lucide-react';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  data?: string; // Base64 data for small files
  preview?: string; // Preview URL for images
  lastModified?: number;
  analysisResult?: string; // AI analysis result
}

interface FileUploadProps {
  onFilesAdded: (files: FileAttachment[]) => void;
  onRemoveFile: (fileId: string) => void;
  attachments: FileAttachment[];
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesAdded,
  onRemoveFile,
  attachments,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  acceptedTypes = ['image/*', 'text/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const processFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    const processedFiles: FileAttachment[] = [];

    for (const file of files) {
      try {
        const fileData: FileAttachment = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          lastModified: file.lastModified
        };

        // For small files (< 1MB), store as base64
        if (file.size < 1024 * 1024) {
          const reader = new FileReader();
          await new Promise<void>((resolve) => {
            reader.onload = () => {
              fileData.data = reader.result as string;
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }

        // Generate preview for images
        if (file.type.startsWith('image/')) {
          fileData.preview = fileData.url;
        }

        processedFiles.push(fileData);
      } catch (error) {
        console.error('Error processing file:', file.name, error);
      }
    }

    onFilesAdded(processedFiles);
    setIsUploading(false);
  }, [onFilesAdded]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      if (file.size > maxFileSize) {
        alert(`File "${file.name}" is too large. Maximum size is ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      processFiles(validFiles);
    }
  }, [maxFileSize, processFiles]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    disabled: disabled || isUploading,
    multiple: true,
    noClick: false, // Ensure click is enabled
    noKeyboard: false
  });

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image size={20} className="text-blue-500" />;
    if (type.startsWith('video/')) return <FileVideo size={20} className="text-purple-500" />;
    if (type.startsWith('audio/')) return <FileAudio size={20} className="text-green-500" />;
    if (type.includes('pdf')) return <FileText size={20} className="text-red-500" />;
    return <File size={20} className="text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* File Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={disabled || isUploading ? undefined : open}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-gray-600 mb-2">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag & drop files here, or click to select files'}
        </p>
        <p className="text-sm text-gray-500">
          Support for images, documents, and text files up to {(maxFileSize / (1024 * 1024)).toFixed(1)}MB
        </p>
        {isUploading && (
          <div className="mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Processing files...</p>
          </div>
        )}
      </div>

      {/* File List */}
      {attachments.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Attached Files ({attachments.length})</h4>
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                {getFileIcon(file.type)}
              </div>

              {/* File Preview (for images) */}
              {file.preview && (
                <div className="flex-shrink-0">
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-12 h-12 object-cover rounded border"
                  />
                </div>
              )}

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>

              {/* File Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {file.preview && (
                  <button
                    onClick={() => window.open(file.url, '_blank')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Preview"
                  >
                    <Eye size={16} className="text-gray-600" />
                  </button>
                )}
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
                <button
                  onClick={() => onRemoveFile(file.id)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Remove"
                >
                  <X size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
