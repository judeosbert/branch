import React from 'react';
import { GitBranch, Sparkles } from 'lucide-react';

interface BranchCreationProgressProps {
  isVisible: boolean;
  isSuccess?: boolean;
}

const BranchCreationProgress: React.FC<BranchCreationProgressProps> = ({ 
  isVisible,
  isSuccess: _isSuccess = false
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4 animate-bounce-in">
        <div className="text-center">
          {/* Animated Branch Icon */}
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <GitBranch size={24} className="text-white" />
            </div>
            {/* Pulsing ring animation */}
            <div className="absolute inset-0 bg-green-300 rounded-full animate-ping opacity-75"></div>
            <div className="absolute inset-2 bg-green-400 rounded-full animate-pulse opacity-50"></div>
          </div>

          {/* Progress Text */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-center gap-2">
              <Sparkles size={18} className="text-yellow-500 animate-pulse" />
              Creating Branch
              <Sparkles size={18} className="text-yellow-500 animate-pulse" />
            </h3>
            <p className="text-sm text-gray-600">
              Generating AI-powered title and setting up your new conversation branch...
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full animate-pulse"
                style={{
                  width: '100%',
                  animation: 'progress-wave 2s ease-in-out infinite'
                }}
              >
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              💡 <strong>Tip:</strong> Your branch will include the selected text as context for the AI conversation.
            </p>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes progress-wave {
          0%, 100% { transform: translateX(-30%); }
          50% { transform: translateX(0%); }
        }
        
        @keyframes bounce-in {
          0% { 
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% { 
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BranchCreationProgress;
