import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { Send, Paperclip, Mic, Square, Pause, Play } from 'lucide-react';
import FileUpload, { type FileAttachment } from './FileUpload';

/**
 * IMPORTANT: INPUT SIZE STANDARDS
 * ================================
 * This component uses NORMAL chat input sizing:
 * - Input height: h-9 (36px) - Standard for chat interfaces
 * - Button size: h-9 w-9 (36px x 36px) - Matches input height
 * - Icon size: 16px - Appropriate for buttons
 * 
 * DO NOT RESIZE to larger dimensions without good reason.
 * Previous versions were too large and looked unprofessional.
 * 
 * If you need to change sizes, maintain consistency:
 * - All buttons should match input height
 * - Icons should be proportional to button size
 * - Padding should maintain visual balance
 */

interface MessageInput {
  content: string;
  attachments: FileAttachment[];
}

interface EnhancedInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (input: MessageInput) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  showVoiceRecording?: boolean;
}

const EnhancedInput = forwardRef<HTMLTextAreaElement, EnhancedInputProps>(({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  placeholder = "Type a message...",
  disabled = false,
  className = '',
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedFileTypes = [
    'image/*',
    'text/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'audio/*',
    'video/*'
  ],
  showVoiceRecording = true
}, ref) => {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);

  // Merge internal ref with forwarded ref
  const mergedRef = useCallback((node: HTMLTextAreaElement) => {
    textareaRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }, [ref]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  // Auto-focus on mount
  useEffect(() => {
    console.log('EnhancedInput mounted, attempting auto-focus...');
    
    // Use requestAnimationFrame to ensure DOM is ready
    const focusElement = () => {
      console.log('Attempting to focus textarea...');
      if (textareaRef.current && !textareaRef.current.disabled) {
        try {
          textareaRef.current.focus();
          console.log('Textarea focus successful');
        } catch (error) {
          console.warn('Failed to focus textarea:', error);
        }
      } else {
        console.log('Textarea not ready for focus:', {
          exists: !!textareaRef.current,
          disabled: textareaRef.current?.disabled
        });
      }
    };

    // Use a small delay to ensure everything is mounted
    const timer = setTimeout(focusElement, 50);
    
    return () => {
      clearTimeout(timer);
      console.log('EnhancedInput unmounted');
    };
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if ((!value.trim() && attachments.length === 0) || disabled) return;
    
    onSubmit({
      content: value,
      attachments: attachments
    });
    
    // Clear form
    onChange('');
    setAttachments([]);
    setShowFileUpload(false);
  }, [value, attachments, disabled, onSubmit, onChange]);

  const handleFilesAdded = useCallback((files: FileAttachment[]) => {
    setAttachments(prev => [...prev, ...files]);
  }, []);

  const handleRemoveFile = useCallback((fileId: string) => {
    setAttachments(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    onKeyDown?.(e);
  }, [handleSubmit, onKeyDown]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        
        // Create file attachment for the recording
        const audioFile: FileAttachment = {
          id: `audio-${Date.now()}`,
          name: `voice-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`,
          size: blob.size,
          type: 'audio/wav',
          url: URL.createObjectURL(blob)
        };
        
        setAttachments(prev => [...prev, audioFile]);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const canSubmit = (value.trim() || attachments.length > 0) && !disabled;

  return (
    <div className={`border border-gray-300 rounded-lg bg-white ${className}`}>
      {/* File Upload Area */}
      {showFileUpload && (
        <div className="p-4 border-b border-gray-200">
          <FileUpload
            onFilesAdded={handleFilesAdded}
            onRemoveFile={handleRemoveFile}
            attachments={attachments}
            maxFileSize={maxFileSize}
            acceptedTypes={acceptedFileTypes}
            disabled={disabled}
          />
        </div>
      )}

      {/* Recording Controls */}
      {isRecording && (
        <div className="p-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-red-700">
              Recording {formatTime(recordingTime)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={pauseRecording}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            <button
              onClick={stopRecording}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Stop recording"
            >
              <Square size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="flex items-center gap-2 p-3">
        {/* File Upload Button - KEEP SIZE: h-9 w-9 matches input height */}
        <button
          onClick={() => setShowFileUpload(!showFileUpload)}
          className={`h-9 w-9 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center ${
            showFileUpload
              ? 'bg-blue-100 text-blue-600'
              : 'hover:bg-gray-100 text-gray-500'
          }`}
          title="Attach files"
          disabled={disabled}
        >
          <Paperclip size={16} />
        </button>

        {/* Voice Recording Button - KEEP SIZE: h-9 w-9 matches input height */}
        {showVoiceRecording && (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`h-9 w-9 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center ${
              isRecording
                ? 'bg-red-100 text-red-600'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            title={isRecording ? "Stop recording" : "Start voice recording"}
            disabled={disabled}
          >
            <Mic size={16} />
          </button>
        )}

        {/* Text Input - IMPORTANT: Keep this input box at normal size (h-9 = 36px total height) */}
        {/* DO NOT RESIZE - This is the standard chat input size. Previous versions were too large. */}
        <div className="flex-1 relative">
          <textarea
            ref={mergedRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full resize-none border-none outline-none bg-transparent max-h-32 h-9 py-2 px-3 rounded-lg hover:bg-gray-50 focus:bg-gray-50 transition-colors text-sm leading-5"
            rows={1}
          />
          
          {/* Character count or file count indicator */}
          {(value.length > 0 || attachments.length > 0) && (
            <div className="absolute bottom-1 right-2 text-xs text-gray-400">
              {attachments.length > 0 && (
                <span className="mr-2">{attachments.length} file{attachments.length > 1 ? 's' : ''}</span>
              )}
              {value.length > 0 && <span>{value.length}</span>}
            </div>
          )}
        </div>

        {/* Send Button - KEEP SIZE: h-9 w-9 matches input height */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`h-9 w-9 rounded-lg transition-colors flex-shrink-0 flex items-center justify-center ${
            canSubmit
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title="Send message"
        >
          <Send size={16} />
        </button>
      </div>

      {/* Quick File Actions */}
      {attachments.length > 0 && !showFileUpload && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{attachments.length} file{attachments.length > 1 ? 's' : ''} attached</span>
            <button
              onClick={() => setShowFileUpload(true)}
              className="text-blue-500 hover:text-blue-600 underline"
            >
              View
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

EnhancedInput.displayName = 'EnhancedInput';

export default EnhancedInput;