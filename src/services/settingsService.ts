import type { SettingsConfig } from '../components/SettingsPopup';

const STORAGE_KEY = 'comfy-chat-settings';

const DEFAULT_SETTINGS: SettingsConfig = {
  openaiApiKey: '',
  aiEngine: 'mock',
  model: 'mock'
};

export class SettingsService {
  static loadSettings(): SettingsConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: SettingsConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
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
    const engineNames = {
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
