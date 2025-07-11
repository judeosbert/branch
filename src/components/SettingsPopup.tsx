import React, { useState, useEffect, useRef } from 'react';
import { X, Key, Brain, Save, AlertCircle, Type } from 'lucide-react';
import { versionService } from '../services/versionService';

export interface SettingsConfig {
  openaiApiKey: string;
  aiEngine: 'openai-gpt4' | 'openai-gpt3.5' | 'openai-gpt4o' | 'mock';
}

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: SettingsConfig) => void;
  currentSettings: SettingsConfig;
}

const AI_ENGINES = [
  { value: 'openai-gpt4o' as const, label: 'GPT-4o (Latest)', description: 'Most capable model' },
  { value: 'openai-gpt4' as const, label: 'GPT-4', description: 'Advanced reasoning' },
  { value: 'openai-gpt3.5' as const, label: 'GPT-3.5 Turbo', description: 'Fast and efficient' },
  { value: 'mock' as const, label: 'Mock AI (Demo)', description: 'For testing without API key' },
];

const SettingsPopup: React.FC<SettingsPopupProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSettings
}) => {
  const [apiKey, setApiKey] = useState(currentSettings.openaiApiKey);
  const [selectedEngine, setSelectedEngine] = useState(currentSettings.aiEngine);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [useTextArea, setUseTextArea] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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
    setApiKey(currentSettings.openaiApiKey);
    setSelectedEngine(currentSettings.aiEngine);
    setHasChanges(false);
  }, [currentSettings, isOpen]);

  useEffect(() => {
    const hasApiKeyChange = apiKey !== currentSettings.openaiApiKey;
    const hasEngineChange = selectedEngine !== currentSettings.aiEngine;
    setHasChanges(hasApiKeyChange || hasEngineChange);
  }, [apiKey, selectedEngine, currentSettings]);

  const handleSave = () => {
    onSave({
      openaiApiKey: apiKey,
      aiEngine: selectedEngine
    });
    onClose();
  };

  const handleCancel = () => {
    setApiKey(currentSettings.openaiApiKey);
    setSelectedEngine(currentSettings.aiEngine);
    setHasChanges(false);
    onClose();
  };

  const maskApiKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '*'.repeat(key.length);
    return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center animate-fade-in py-8">
      <div ref={modalRef} className="bg-white rounded-lg shadow-2xl max-w-md w-full m-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 flex items-center justify-between">
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
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API Key Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={16} className="text-gray-600" />
                <label className="text-sm font-medium text-gray-700">
                  OpenAI API Key
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
                  ref={(input) => {
                    // Ensure the input can receive focus and paste events
                    if (input) {
                      input.addEventListener('paste', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const pastedText = e.clipboardData?.getData('text') || '';
                        if (pastedText) {
                          setApiKey(pastedText.trim());
                        }
                      });
                    }
                  }}
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => {
                    // Handle Ctrl+V / Cmd+V explicitly
                    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                      e.preventDefault();
                      navigator.clipboard.readText().then(text => {
                        if (text) {
                          setApiKey(text.trim());
                        }
                      }).catch(() => {
                        // Fallback - let the browser handle it normally
                        e.target.dispatchEvent(new Event('paste', { bubbles: true }));
                      });
                    }
                  }}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-24"
                  autoComplete="off"
                  spellCheck={false}
                  style={{ 
                    WebkitTextSecurity: showApiKey ? 'none' : 'disc' 
                  } as React.CSSProperties}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setApiKey(text.trim());
                        }
                      } catch (err) {
                        console.warn('Could not read clipboard:', err);
                        // Show user feedback
                        alert('Please try using Ctrl+V (or Cmd+V) to paste, or use the "Having Paste Issues?" link above for an alternative input method');
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
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your OpenAI API key here (sk-...)"
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
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                  >
                    {showApiKey ? 'Hide' : 'Show'} Characters
                  </button>
                </div>
                {!showApiKey && (
                  <div className="bg-gray-100 p-2 rounded text-xs font-mono text-gray-600">
                    {apiKey ? '*'.repeat(Math.min(apiKey.length, 50)) : 'No API key entered'}
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">BYOK (Bring Your Own Key)</p>
                  <p className="text-xs mt-1">
                    Your API key is stored locally and never sent to our servers. 
                    Get your key from{' '}
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      OpenAI Platform
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Engine Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">
              AI Engine
            </label>
            
            <div className="space-y-2">
              {AI_ENGINES.map((engine) => (
                <label
                  key={engine.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedEngine === engine.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="aiEngine"
                    value={engine.value}
                    checked={selectedEngine === engine.value}
                    onChange={(e) => setSelectedEngine(e.target.value as SettingsConfig['aiEngine'])}
                    className="mt-1 text-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{engine.label}</div>
                    <div className="text-sm text-gray-600">{engine.description}</div>
                    {engine.value !== 'mock' && !apiKey && (
                      <div className="text-xs text-red-600 mt-1">
                        Requires API key
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Current Status */}
          {currentSettings.openaiApiKey && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                <p className="font-medium">Current API Key:</p>
                <p className="font-mono text-xs mt-1">
                  {maskApiKey(currentSettings.openaiApiKey)}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs">v{versionService.getCurrentVersion()}</span>
              {hasChanges && (
                <span className="text-amber-600">• Unsaved changes</span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPopup;
