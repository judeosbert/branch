import React, { useEffect, useState } from 'react';

const AnimatedBranchIcon: React.FC = () => {
  const [visibleBranches, setVisibleBranches] = useState(1);

  useEffect(() => {
    const sequence = [1, 2, 3, 4, 1]; // Show 1, then 2, then 3, then 4, then reset
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      setVisibleBranches(sequence[currentIndex]);
      currentIndex = (currentIndex + 1) % sequence.length;
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg relative">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        className="relative z-10"
      >
        {/* Main trunk - always visible */}
        <circle cx="8" cy="8" r="3" fill="white" />
        <line 
          x1="8" y1="11" x2="8" y2="20" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round"
        />
        
        {/* First branch - visible when step >= 2 */}
        {visibleBranches >= 2 && (
          <>
            <line 
              x1="8" y1="16" x2="16" y2="12" 
              stroke="white" 
              strokeWidth="3" 
              strokeLinecap="round"
              className="animate-pulse"
            />
            <circle cx="16" cy="12" r="3" fill="white" className="animate-pulse" />
          </>
        )}
        
        {/* Second branch - visible when step >= 3 */}
        {visibleBranches >= 3 && (
          <>
            <line 
              x1="8" y1="20" x2="16" y2="24" 
              stroke="white" 
              strokeWidth="3" 
              strokeLinecap="round"
              className="animate-pulse"
            />
            <circle cx="16" cy="24" r="3" fill="white" className="animate-pulse" />
          </>
        )}
        
        {/* Third branch - visible when step >= 4 */}
        {visibleBranches >= 4 && (
          <>
            <line 
              x1="16" y1="12" x2="24" y2="8" 
              stroke="white" 
              strokeWidth="3" 
              strokeLinecap="round"
              className="animate-pulse"
            />
            <circle cx="24" cy="8" r="3" fill="white" className="animate-pulse" />
          </>
        )}
      </svg>
      
      {/* Glow effect that pulses when branches are being added */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-green-400 to-green-500 rounded-full transition-opacity duration-300 ${
          visibleBranches > 1 ? 'opacity-30 animate-pulse' : 'opacity-10'
        }`}
      />
    </div>
  );
};

export default AnimatedBranchIcon;
