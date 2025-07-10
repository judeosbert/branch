import { GitBranch, X, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SelectionPopupProps {
  selectedText: string;
  position: { x: number; y: number };
  onBranch: () => void;
  onClose: () => void;
}

const SelectionPopup = ({ selectedText, position, onBranch, onClose }: SelectionPopupProps) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  const handleBranch = async () => {
    setIsCreatingBranch(true);
    try {
      await onBranch();
    } finally {
      setIsCreatingBranch(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Calculate optimal position to avoid overlap
  const getOptimalPosition = () => {
    const popupHeight = 100; // Estimated popup height
    const margin = 20;
    
    // Try to position above the selection first
    let top = position.y - popupHeight - margin;
    
    // If there's not enough space above, position below
    if (top < margin) {
      top = position.y + margin;
    }
    
    return {
      left: Math.max(margin, Math.min(position.x, window.innerWidth - 200)),
      top: Math.max(margin, top),
    };
  };

  const optimalPosition = getOptimalPosition();

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-48 max-w-80"
      style={{
        left: optimalPosition.left,
        top: optimalPosition.top,
      }}
    >
      <div className="text-xs text-gray-600 mb-3 px-1">
        <span className="font-medium">Selected text:</span>
        <div className="mt-1 p-2 bg-gray-50 rounded border text-gray-800 italic">
          "{selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText}"
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleBranch}
          disabled={isCreatingBranch}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreatingBranch ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Branching...
            </>
          ) : (
            <>
              <GitBranch size={16} />
              Branch now
            </>
          )}
        </button>
        
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default SelectionPopup;
