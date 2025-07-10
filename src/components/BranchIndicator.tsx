import { GitBranch, ChevronRight, ArrowDownRight } from 'lucide-react';
import type { ConversationBranch } from '../types';

interface BranchIndicatorProps {
  messageId: string;
  branches: ConversationBranch[];
  onNavigateToBranch: (branchId: string) => void;
  currentBranchId?: string | null;
}

const BranchIndicator = ({ messageId, branches, onNavigateToBranch, currentBranchId }: BranchIndicatorProps) => {
  // Find all branches that stem from this message (including nested ones)
  const getMessageBranches = (msgId: string, allBranches: ConversationBranch[]): ConversationBranch[] => {
    const directBranches = allBranches.filter(branch => branch.parentMessageId === msgId);
    const nestedBranches: ConversationBranch[] = [];
    
    // For each direct branch, get all its nested branches
    directBranches.forEach(branch => {
      const childBranches = allBranches.filter(b => b.parentBranchId === branch.id);
      nestedBranches.push(...childBranches);
    });
    
    return [...directBranches, ...nestedBranches];
  };
  
  const messageBranches = getMessageBranches(messageId, branches);
  
  if (messageBranches.length === 0) return null;

  // Group branches by their hierarchy
  const groupBranchesByHierarchy = (branchList: ConversationBranch[]) => {
    const directBranches = branchList.filter(b => b.parentMessageId === messageId);
    const nestedBranches = branchList.filter(b => b.parentMessageId !== messageId);
    
    return { directBranches, nestedBranches };
  };
  
  const { directBranches, nestedBranches } = groupBranchesByHierarchy(messageBranches);

  const renderBranch = (branch: ConversationBranch, isNested: boolean = false) => (
    <button
      key={branch.id}
      onClick={() => onNavigateToBranch(branch.id)}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        currentBranchId === branch.id
          ? 'bg-green-100 border-green-300 text-green-800 shadow-sm'
          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-green-50 hover:border-green-200 hover:shadow-sm'
      } ${isNested ? 'ml-4 border-l-4 border-l-blue-200' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
          currentBranchId === branch.id ? 'bg-green-500' : 'bg-gray-400'
        }`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              Branch {branches.indexOf(branch) + 1}
            </span>
            
            {branch.depth > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Level {branch.depth + 1}
              </span>
            )}
            
            {isNested && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Nested
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-600 mb-2 line-clamp-2">
            "{branch.branchText}"
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {branch.messages.length > 0 && (
              <span>
                {branch.messages.length} message{branch.messages.length !== 1 ? 's' : ''}
              </span>
            )}
            
            <span>
              Created {branch.createdAt.toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <ChevronRight size={16} className="text-gray-400 mt-1 flex-shrink-0" />
      </div>
    </button>
  );

  return (
    <div className="mt-4 space-y-3">
      <div className="text-xs text-gray-500 font-medium flex items-center gap-2">
        <GitBranch size={14} />
        <span>
          {messageBranches.length === 1 
            ? 'Branch available:' 
            : `${messageBranches.length} branches available:`}
        </span>
        {nestedBranches.length > 0 && (
          <span className="text-blue-600">
            ({nestedBranches.length} nested)
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        {/* Direct branches first */}
        {directBranches.map(branch => renderBranch(branch, false))}
        
        {/* Nested branches with visual indication */}
        {nestedBranches.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-blue-600 font-medium flex items-center gap-1 ml-2">
              <ArrowDownRight size={12} />
              Nested branches:
            </div>
            {nestedBranches.map(branch => renderBranch(branch, true))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BranchIndicator;
