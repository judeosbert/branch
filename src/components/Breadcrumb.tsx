import { ChevronRight, MessageCircle, GitBranch, Home } from 'lucide-react';

interface BreadcrumbItem {
  id: string;
  label: string;
  type: 'main' | 'branch';
  branchText?: string;
  depth?: number;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (itemId: string) => void;
  totalBranches?: number;
}

const Breadcrumb = ({ items, onNavigate, totalBranches = 0 }: BreadcrumbProps) => {
  if (items.length <= 1 && totalBranches === 0) return null;

  return (
    <div className="bg-blue-50 border-b border-blue-200 p-3">
      <div className="flex items-center gap-2 text-sm">
        <MessageCircle size={16} className="text-blue-600" />
        <span className="text-blue-800 font-medium">Conversation Path:</span>
        
        <div className="flex items-center gap-1 ml-2 flex-wrap">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-1">
              {index > 0 && <ChevronRight size={14} className="text-blue-400" />}
              
              <button
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  index === items.length - 1
                    ? 'bg-blue-200 text-blue-800 font-medium'
                    : 'text-blue-600 hover:bg-blue-100'
                }`}
              >
                {item.type === 'main' ? (
                  <Home size={12} />
                ) : (
                  <GitBranch size={12} />
                )}
                {item.label}
                {item.depth !== undefined && item.depth > 0 && (
                  <span className="text-xs bg-blue-300 text-blue-800 px-1 py-0.5 rounded ml-1">
                    L{item.depth + 1}
                  </span>
                )}
              </button>
              
              {item.branchText && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full max-w-32 truncate">
                  "{item.branchText}"
                </span>
              )}
            </div>
          ))}
          
          {/* Show total branches indicator in main view */}
          {items.length === 1 && totalBranches > 0 && (
            <div className="ml-4 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              {totalBranches} branch{totalBranches !== 1 ? 'es' : ''} available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Breadcrumb;
