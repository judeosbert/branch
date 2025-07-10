import { useState, useEffect, useCallback } from 'react';

interface TextSelection {
  text: string;
  range: Range;
  rect: DOMRect;
}

export const useTextSelection = () => {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    
    if (sel && sel.toString().trim() && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Only show selection popup if text is selected and visible
      if (rect.width > 0 && rect.height > 0) {
        setSelection({
          text: sel.toString().trim(),
          range: range.cloneRange(),
          rect
        });
      }
    } else {
      setSelection(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selection, clearSelection };
};
