import type { SettingsConfig } from '../components/SettingsPopup';

const STORAGE_KEY = 'comfy-chat-settings';

const DEFAULT_SETTINGS: SettingsConfig = {
  openaiApiKey: '',
  geminiApiKey: '',
  provider: 'mock',
  aiEngine: 'mock',
  model: 'mock'
};

export class SettingsService {
  static loadSettings(): SettingsConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const merged = {
          ...DEFAULT_SETTINGS,
          ...parsed
        };
        
        // Ensure model is properly set based on aiEngine
        merged.model = this.getModelForEngine(merged.aiEngine);
        console.log('🔧 Settings loaded from localStorage:', merged);
        
        return merged;
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    console.log('🆕 Using default settings');
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: SettingsConfig): void {
    try {
      // Ensure model is synced with aiEngine before saving
      const settingsToSave = {
        ...settings,
        model: this.getModelForEngine(settings.aiEngine)
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
      console.log('💾 Settings saved to localStorage:', settingsToSave);
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }

  static getModelForEngine(engine: SettingsConfig['aiEngine']): string {
    const modelMap: Record<string, string> = {
      'openai-gpt4o': 'gpt-4o',
      'openai-gpt4': 'gpt-4',
      'openai-gpt3.5': 'gpt-3.5-turbo',
      'mock': 'mock'
    };
    return modelMap[engine] || 'gpt-3.5-turbo';
  }

  static clearSettings(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear settings from localStorage:', error);
    }
  }

  static validateApiKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  }

  static getEngineDisplayName(engine: SettingsConfig['aiEngine']): string {
    const engineNames: Record<string, string> = {
      'openai-gpt4o': 'GPT-4o',
      'openai-gpt4': 'GPT-4',
      'openai-gpt3.5': 'GPT-3.5 Turbo',
      'mock': 'Mock AI'
    };
    return engineNames[engine] || engine;
  }

  static requiresApiKey(engine: SettingsConfig['aiEngine']): boolean {
    return engine !== 'mock';
  }
}
