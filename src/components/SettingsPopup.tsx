import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Brain, AlertCircle, Type, CheckCircle, Wifi, RefreshCw } from 'lucide-react';
import { versionService } from '../services/versionService';
import { EnhancedAIService } from '../services/enhancedAIService';
import { modelService } from '../services/modelService';

export interface SettingsConfig {
  openaiApiKey: string;
  geminiApiKey: string;
  provider: 'openai' | 'gemini' | 'mock';
  aiEngine: string;
  model: string;
}

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: SettingsConfig) => void;
  currentSettings: SettingsConfig;
}

interface AIProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  models: Array<{
    id: string;
    name: string;
    description: string;
    engine: string;
  }>;
  isLoadingModels?: boolean;
  modelsError?: string;
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings
}) => {
  const [openaiApiKey, setOpenaiApiKey] = useState(currentSettings.openaiApiKey || '');
  const [geminiApiKey, setGeminiApiKey] = useState(currentSettings.geminiApiKey || '');
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini' | 'mock'>(currentSettings.provider || 'openai');
  const [selectedEngine, setSelectedEngine] = useState(currentSettings.aiEngine || 'openai-gpt3.5');
  const [showApiKey, setShowApiKey] = useState(false);
  const [useTextArea, setUseTextArea] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize providers with base configuration
  useEffect(() => {
    const baseProviders: AIProvider[] = [
      {
        id: 'openai',
        name: 'OpenAI',
        icon: '🤖',
        description: 'GPT models for advanced reasoning and conversation',
        apiKeyLabel: 'OpenAI API Key',
        apiKeyPlaceholder: 'sk-...',
        models: []
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        icon: '✨',
        description: 'Google\'s advanced AI models with multimodal capabilities',
        apiKeyLabel: 'Gemini API Key',
        apiKeyPlaceholder: 'AIza...',
        models: []
      },
      {
        id: 'mock',
        name: 'Demo Mode',
        icon: '🎭',
        description: 'Mock AI for testing without API keys',
        apiKeyLabel: '',
        apiKeyPlaceholder: '',
        models: modelService.getMockModels().models
      }
    ];
    setProviders(baseProviders);
  }, []);

  // Load models when API key changes
  useEffect(() => {
    if (selectedProvider === 'openai' && openaiApiKey) {
      loadModelsForProvider('openai', openaiApiKey);
    } else if (selectedProvider === 'gemini' && geminiApiKey) {
      loadModelsForProvider('gemini', geminiApiKey);
    }
  }, [openaiApiKey, geminiApiKey, selectedProvider]);

  const loadModelsForProvider = async (provider: 'openai' | 'gemini', apiKey: string) => {
    setIsLoadingModels(true);
    
    try {
      const result = provider === 'openai' 
        ? await modelService.getOpenAIModels(apiKey)
        : await modelService.getGeminiModels(apiKey);

      setProviders(prev => prev.map(p => 
        p.id === provider 
          ? { 
              ...p, 
              models: result.models,
              isLoadingModels: false,
              modelsError: result.error 
            }
          : p
      ));
    } catch (error) {
      console.error(`Error loading ${provider} models:`, error);
      setProviders(prev => prev.map(p => 
        p.id === provider 
          ? { 
              ...p, 
              models: [],
              isLoadingModels: false,
              modelsError: error instanceof Error ? error.message : 'Failed to load models'
            }
          : p
      ));
    } finally {
      setIsLoadingModels(false);
    }
  };

  const refreshModels = async () => {
    const currentApiKey = selectedProvider === 'openai' ? openaiApiKey : geminiApiKey;
    if (currentApiKey && selectedProvider !== 'mock') {
      // Clear cache for the current provider
      modelService.clearProviderCache(selectedProvider, currentApiKey);
      await loadModelsForProvider(selectedProvider, currentApiKey);
    }
  };

  // Get current provider data
  const currentProviderData = providers.find(p => p.id === selectedProvider) || providers[0];
  const currentApiKey = selectedProvider === 'openai' ? openaiApiKey : 
                       selectedProvider === 'gemini' ? geminiApiKey : '';

  // Helper function to get model name from engine
  const getModelFromEngine = (engine: string): string => {
    for (const provider of providers) {
      const model = provider.models.find((m: any) => m.engine === engine);
      if (model) return model.id;
    }
    return 'gpt-3.5-turbo'; // fallback
  };

  // Helper function to get provider from engine
  const getProviderFromEngine = (engine: string): string => {
    for (const provider of providers) {
      if (provider.models.some((m: any) => m.engine === engine)) {
        return provider.id;
      }
    }
    return 'openai'; // fallback
  };

  // Handle outside click to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    setOpenaiApiKey(currentSettings.openaiApiKey || '');
    setGeminiApiKey(currentSettings.geminiApiKey || '');
    setSelectedProvider(currentSettings.provider || 'openai');
    setSelectedEngine(currentSettings.aiEngine || 'openai-gpt3.5');
  }, [currentSettings, isOpen]);

  // Clear connection result when provider changes
  useEffect(() => {
    setConnectionResult(null);
  }, [selectedProvider]);

  // Auto-select first available model when provider changes or models are loaded
  useEffect(() => {
    if (currentProviderData?.models && currentProviderData.models.length > 0) {
      const firstModel = currentProviderData.models[0];
      if (firstModel.engine && selectedEngine !== firstModel.engine) {
        setSelectedEngine(firstModel.engine);
      }
    }
  }, [currentProviderData, selectedProvider]);

  // Handle immediate model selection change with persistence
  const handleEngineChange = (newEngine: string) => {
    setSelectedEngine(newEngine);
    setConnectionResult(null);
    
    const newProvider = getProviderFromEngine(newEngine);
    setSelectedProvider(newProvider as 'openai' | 'gemini' | 'mock');
    
    const updatedSettings: SettingsConfig = {
      openaiApiKey,
      geminiApiKey,
      provider: newProvider as 'openai' | 'gemini' | 'mock',
      aiEngine: newEngine,
      model: getModelFromEngine(newEngine)
    };

    console.log('🔄 Engine changed to:', newEngine, 'Provider:', newProvider);
    onSave(updatedSettings);
  };

  // Handle immediate API key change with persistence
  const handleApiKeyChange = (newApiKey: string, provider: string) => {
    if (provider === 'openai') {
      setOpenaiApiKey(newApiKey);
    } else if (provider === 'gemini') {
      setGeminiApiKey(newApiKey);
    }
    
    const updatedSettings: SettingsConfig = {
      openaiApiKey: provider === 'openai' ? newApiKey : openaiApiKey,
      geminiApiKey: provider === 'gemini' ? newApiKey : geminiApiKey,
      provider: selectedProvider as 'openai' | 'gemini' | 'mock',
      aiEngine: selectedEngine,
      model: getModelFromEngine(selectedEngine)
    };

    console.log(`🔑 ${provider} API key updated and auto-saved`);
    onSave(updatedSettings);
  };

  const handleCancel = () => {
    setOpenaiApiKey(currentSettings.openaiApiKey || '');
    setGeminiApiKey(currentSettings.geminiApiKey || '');
    setSelectedProvider(currentSettings.provider || 'openai');
    setSelectedEngine(currentSettings.aiEngine || 'openai-gpt3.5');
    setConnectionResult(null);
    onClose();
  };

  const testConnection = async () => {
    const actualProvider = getProviderFromEngine(selectedEngine);
    console.log('🔍 Test Connection - Selected Provider Tab:', selectedProvider);
    console.log('🔍 Test Connection - Selected Engine:', selectedEngine);
    console.log('🔍 Test Connection - Actual Provider for Engine:', actualProvider);
    
    if (actualProvider === 'mock') {
      setConnectionResult({ success: true, message: 'Mock AI service is working correctly.' });
      return;
    }

    const currentApiKey = actualProvider === 'openai' ? openaiApiKey : geminiApiKey;
    if (!currentApiKey.trim()) {
      setConnectionResult({ success: false, message: 'Please enter an API key first.' });
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const testSettings = {
        openaiApiKey,
        geminiApiKey,
        provider: actualProvider as 'openai' | 'gemini' | 'mock', // Use the provider that matches the selected engine
        aiEngine: selectedEngine,
        model: getModelFromEngine(selectedEngine)
      };
      
      console.log('🔍 Test Connection - Settings:', testSettings);
      
      const testService = new EnhancedAIService(testSettings);

      const result = await testService.testAPIConnection();
      setConnectionResult({
        success: result.success,
        message: result.success ? 'Connection successful! API key and model are working.' : result.error || 'Unknown error'
      });
    } catch (error) {
      setConnectionResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to test connection'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in py-8">
      <div ref={modalRef} className="bg-white rounded-lg shadow-2xl max-w-md w-full m-4 max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Branch Settings</h3>
              <p className="text-sm text-blue-100">Configure your AI engine and API key</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            
            {/* Provider Tabs */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-gray-700">
                AI Provider
              </label>
              
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setSelectedProvider(provider.id as 'openai' | 'gemini' | 'mock');
                      setConnectionResult(null); // Clear connection result when switching providers
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedProvider === provider.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-lg">{provider.icon}</span>
                    <span>{provider.name}</span>
                  </button>
                ))}
              </div>

              {/* Provider Description */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>{currentProviderData.name}:</strong> {currentProviderData.description}
                </p>
              </div>

              {/* API Key Section (only for non-mock providers) */}
              {selectedProvider !== 'mock' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key size={16} className="text-gray-600" />
                      <label className="text-sm font-medium text-gray-700">
                        {currentProviderData.apiKeyLabel}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseTextArea(!useTextArea)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      {useTextArea ? 'Use Input Field' : 'Having Paste Issues?'}
                    </button>
                  </div>
                  
                  {!useTextArea ? (
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={currentApiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value, selectedProvider)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                            e.preventDefault();
                            navigator.clipboard.readText().then(text => {
                              if (text) {
                                handleApiKeyChange(text.trim(), selectedProvider);
                              }
                            }).catch(() => {
                              // Fallback handled normally
                            });
                          }
                        }}
                        placeholder={currentProviderData.apiKeyPlaceholder}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) {
                                handleApiKeyChange(text.trim(), selectedProvider);
                              }
                            } catch (err) {
                              console.warn('Could not read clipboard:', err);
                              alert('Please try using Ctrl+V (or Cmd+V) to paste');
                            }
                          }}
                          className="text-blue-500 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded border border-blue-300 hover:border-blue-500 transition-colors"
                          title="Paste API key from clipboard"
                        >
                          Paste
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-gray-500 hover:text-gray-700 text-sm font-medium px-1"
                        >
                          {showApiKey ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={currentApiKey}
                        onChange={(e) => handleApiKeyChange(e.target.value, selectedProvider)}
                        placeholder={`Paste your ${currentProviderData.name} API key here (${currentProviderData.apiKeyPlaceholder})`}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        autoComplete="off"
                        spellCheck={false}
                        rows={3}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-600">
                          <Type size={12} className="inline mr-1" />
                          Alternative input method - paste should work here
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          {showApiKey ? 'Hide' : 'Show'} API key
                        </button>
                      </div>
                    </div>
                  )}

                  {/* API Key Info */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-amber-600" />
                      <div className="text-xs text-amber-700">
                        <strong>BYOK (Bring Your Own Key)</strong><br />
                        Your API key is stored locally and never sent to our servers.
                      </div>
                    </div>
                  </div>

                  {/* Test Connection Button - Only show for provider that matches currently selected model */}
                  {selectedProvider === getProviderFromEngine(selectedEngine) && 
                    (getProviderFromEngine(selectedEngine) === 'mock' || (currentApiKey && currentApiKey.trim().length > 0)) && (
                    <button
                      onClick={testConnection}
                      disabled={testingConnection}
                      className={`w-full font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                        connectionResult?.success
                          ? 'bg-green-500 text-white'
                          : testingConnection
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {testingConnection ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Testing Connection...
                        </>
                      ) : connectionResult?.success ? (
                        <>
                          <CheckCircle 
                            size={16} 
                            className="text-white animate-bounce" 
                            style={{ animationDuration: '1s', animationIterationCount: '2' }}
                          />
                          Connection Successful!
                        </>
                      ) : connectionResult?.success === false ? (
                        <>
                          <AlertCircle size={16} className="text-red-400" />
                          Connection Failed - Try Again
                        </>
                      ) : (
                        <>
                          <Wifi size={16} />
                          Test {currentProviderData.name} Connection
                        </>
                      )}
                    </button>
                  )}

                  {/* Connection Error Message (only for failures) */}
                  {connectionResult && !connectionResult.success && (
                    <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-700">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{connectionResult.message}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Model Selection
                </label>
                
                <div className="space-y-2">
                  {isLoadingModels ? (
                    <div className="flex items-center justify-center p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 text-gray-600">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Loading models...
                      </div>
                    </div>
                  ) : currentProviderData.modelsError ? (
                    <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-red-600 text-sm mb-2">
                        Error loading models: {currentProviderData.modelsError}
                      </p>
                      {selectedProvider !== 'mock' && currentApiKey && (
                        <button
                          onClick={refreshModels}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry
                        </button>
                      )}
                    </div>
                  ) : currentProviderData.models.length === 0 && selectedProvider !== 'mock' ? (
                    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                      <p className="text-gray-600 text-sm">
                        {currentApiKey ? 'No models available' : 'Enter API key to load models'}
                      </p>
                    </div>
                  ) : (
                    currentProviderData.models.map((model) => (
                      <label
                        key={model.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedEngine === model.engine
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="aiModel"
                          value={model.engine}
                          checked={selectedEngine === model.engine}
                          onChange={(e) => handleEngineChange(e.target.value)}
                          className="mt-1 text-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{model.name}</div>
                          <div className="text-sm text-gray-600">{model.description}</div>
                          {selectedProvider !== 'mock' && !currentApiKey && (
                            <div className="text-xs text-red-600 mt-1">
                              Requires {currentProviderData.name} API key
                            </div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
                
                {/* Refresh button for models */}
                {selectedProvider !== 'mock' && currentApiKey && !isLoadingModels && (
                  <button
                    onClick={refreshModels}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh models
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t flex-shrink-0">
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs">v{versionService.getCurrentVersion()}</span>
              <span className="text-green-600">• Auto-save enabled</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPopup;
