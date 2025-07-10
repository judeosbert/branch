import { useState, useEffect, useCallback, useRef } from 'react';

interface TextSelection {
  text: string;
  range: Range;
  rect: DOMRect;
}

export const useTextSelection = () => {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isUpdatingRef = useRef(false);

  const handleSelectionChange = useCallback(() => {
    // Prevent rapid updates during selection changes
    if (isUpdatingRef.current) return;
    
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Very minimal debounce for stability
    timeoutRef.current = setTimeout(() => {
      isUpdatingRef.current = true;
      
      const sel = window.getSelection();
      
      if (sel && sel.rangeCount > 0) {
        const selectedText = sel.toString().trim();
        
        // Only proceed if we have a meaningful selection (not just whitespace or auto-expanded)
        if (selectedText.length > 0 && selectedText.length < 1000) { // Prevent whole-message selections
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Ensure the selection has visible dimensions and is intentional
          if (rect.width > 0 && rect.height > 0 && rect.width < window.innerWidth * 0.8) {
            setSelection({
              text: selectedText,
              range: range.cloneRange(),
              rect
            });
          } else {
            setSelection(null);
          }
        } else {
          setSelection(null);
        }
      } else {
        setSelection(null);
      }
      
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 30);
    }, 10); // Very fast response time
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      isUpdatingRef.current = false;
    };
  }, [handleSelectionChange]);

  const clearSelection = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    isUpdatingRef.current = false;
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return { selection, clearSelection };
};
