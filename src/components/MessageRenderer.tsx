import React from 'react';
import BranchableMessage from './BranchableMessage';
import RichMessage from './RichMessage';
import type { FileAttachment } from './FileUpload';

interface MessageRendererProps {
  content: string;
  attachments?: FileAttachment[];
  messageId: string;
  sender: 'user' | 'assistant';
  onBranch: (parentMessageId: string, branchText: string) => void;
  onSelectBranch: (branchId: string) => void;
  onCopy: (content: string) => void;
  branches: Array<{
    parentMessageId: string;
    branchText: string;
    id: string;
  }>;
  onAnalyzeFile?: (file: FileAttachment) => void;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({
  content,
  attachments = [],
  messageId,
  sender,
  onBranch,
  onSelectBranch,
  onCopy,
  branches,
  onAnalyzeFile
}) => {
  // If message has attachments, render with RichMessage + BranchableMessage
  if (attachments.length > 0) {
    return (
      <div className="space-y-2">
        <RichMessage
          content={content}
          attachments={attachments}
          messageId={messageId}
          sender={sender}
          onCopyMessage={onCopy}
          onAnalyzeFile={onAnalyzeFile}
        />
        <BranchableMessage
          content=""
          messageId={messageId}
          onBranch={onBranch}
          onSelectBranch={onSelectBranch}
          branches={branches}
        />
      </div>
    );
  }

  // For regular messages, use BranchableMessage
  return (
    <BranchableMessage
      content={content}
      messageId={messageId}
      onBranch={onBranch}
      onSelectBranch={onSelectBranch}
      branches={branches}
    />
  );
};

export default MessageRenderer;
