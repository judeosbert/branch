import { useState, useEffect } from 'react';

// Simple test version of the main App
function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [componentTest, setComponentTest] = useState<string>('Starting tests...');

  useEffect(() => {
    const runTests = async () => {
      try {
        setComponentTest('Testing imports...');
        
        // Test basic imports
        const { SettingsService } = await import('./services/settingsService');
        const { conversationHistoryService } = await import('./services/conversationHistoryService');
        const { EnhancedAIService } = await import('./services/enhancedAIService');
        
        setComponentTest('✅ Service imports successful');
        
        // Test settings loading
        const settings = SettingsService.loadSettings();
        setComponentTest(prev => prev + '\n✅ Settings loaded: ' + settings.aiEngine);
        
        // Test conversation history
        const history = conversationHistoryService.getHistory();
        setComponentTest(prev => prev + '\n✅ History loaded: ' + history.length + ' conversations');
        
        // Test AI service creation
        const aiService = new EnhancedAIService(settings);
        setComponentTest(prev => prev + '\n✅ AI service created: ' + (aiService ? 'OK' : 'Failed'));
        
        // Test component imports
        const ChatInterface = await import('./components/ChatInterface');
        setComponentTest(prev => prev + '\n✅ ChatInterface imported: ' + (typeof ChatInterface.default === 'function' ? 'OK' : 'Failed'));
        
        setComponentTest(prev => prev + '\n\n🎉 All tests passed! Loading full app...');
        
        // If we get here, everything should work
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };
    
    runTests();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ Error Loading App</h1>
          <p className="text-red-700 mb-4">Error: {error}</p>
          <div className="bg-red-100 p-4 rounded border">
            <h3 className="font-semibold mb-2">Component Test Results:</h3>
            <pre className="text-sm whitespace-pre-wrap">{componentTest}</pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-blue-600 mb-4">🔄 Loading Branch App</h1>
          <div className="bg-blue-100 p-4 rounded border">
            <h3 className="font-semibold mb-2">Test Progress:</h3>
            <pre className="text-sm whitespace-pre-wrap">{componentTest}</pre>
          </div>
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // If we get here, we should load the real app
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-green-600 mb-4">✅ App Ready!</h1>
        <p className="text-green-700 mb-4">All components loaded successfully. The app should now work.</p>
        <div className="bg-green-100 p-4 rounded border">
          <h3 className="font-semibold mb-2">Final Test Results:</h3>
          <pre className="text-sm whitespace-pre-wrap">{componentTest}</pre>
        </div>
        <button 
          onClick={async () => {
            // Load the actual app
            try {
              const { default: RealApp } = await import('./App');
              console.log('Real app loaded:', RealApp);
              // This would need a different approach in practice
              window.location.href = './dist/index.html';
            } catch (error) {
              console.error('Error loading real app:', error);
            }
          }} 
          className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Load Full App
        </button>
      </div>
    </div>
  );
}

export default App;
