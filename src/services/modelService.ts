/**
 * Service to fetch available models from AI providers
 */

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  engine: string;
}

interface ProviderModels {
  models: ModelInfo[];
  error?: string;
}

export class ModelService {
  private static instance: ModelService;
  private modelsCache: Map<string, { models: ModelInfo[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ModelService {
    if (!ModelService.instance) {
      ModelService.instance = new ModelService();
    }
    return ModelService.instance;
  }

  /**
   * Get available models for OpenAI
   */
  async getOpenAIModels(apiKey: string): Promise<ProviderModels> {
    try {
      // Check cache first
      const cacheKey = `openai-${apiKey.substring(0, 10)}`;
      const cached = this.modelsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { models: cached.models };
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Filter and map OpenAI models to our format
      const models: ModelInfo[] = data.data
        .filter((model: any) => {
          // Filter for relevant chat models
          const id = model.id.toLowerCase();
          return (
            id.includes('gpt-4') || 
            id.includes('gpt-3.5') || 
            id.includes('gpt-4o')
          ) && !id.includes('instruct') && !id.includes('embed');
        })
        .map((model: any) => ({
          id: model.id,
          name: this.formatModelName(model.id),
          description: this.getModelDescription(model.id),
          engine: `openai-${model.id.replace(/[^a-zA-Z0-9]/g, '')}`
        }))
        .sort((a: ModelInfo, b: ModelInfo) => {
          // Sort by preference: GPT-4o > GPT-4 > GPT-3.5
          const priority = { 'gpt-4o': 3, 'gpt-4': 2, 'gpt-3.5': 1 };
          const getPriority = (name: string) => {
            if (name.includes('gpt-4o')) return priority['gpt-4o'];
            if (name.includes('gpt-4')) return priority['gpt-4'];
            if (name.includes('gpt-3.5')) return priority['gpt-3.5'];
            return 0;
          };
          return getPriority(b.id) - getPriority(a.id);
        });

      // Cache the results
      this.modelsCache.set(cacheKey, { models, timestamp: Date.now() });

      return { models };
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      return {
        models: this.getFallbackOpenAIModels(),
        error: error instanceof Error ? error.message : 'Failed to fetch models'
      };
    }
  }

  /**
   * Get available models for Gemini
   */
  async getGeminiModels(apiKey: string): Promise<ProviderModels> {
    try {
      // Check cache first
      const cacheKey = `gemini-${apiKey.substring(0, 10)}`;
      const cached = this.modelsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { models: cached.models };
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Filter and map Gemini models to our format
      const models: ModelInfo[] = data.models
        .filter((model: any) => {
          // Filter for generative models that support generateContent
          return model.supportedGenerationMethods?.includes('generateContent') &&
                 model.name.includes('gemini');
        })
        .map((model: any) => {
          const modelId = model.name.replace('models/', '');
          return {
            id: modelId,
            name: this.formatGeminiModelName(modelId),
            description: this.getGeminiModelDescription(modelId),
            engine: `gemini-${modelId.replace(/[^a-zA-Z0-9]/g, '')}`
          };
        })
        .sort((a: ModelInfo, b: ModelInfo) => {
          // Sort by version and type preference
          const getPriority = (name: string) => {
            if (name.includes('2.5')) return 300;
            if (name.includes('2.0')) return 200;
            if (name.includes('1.5')) return 100;
            if (name.includes('1.0')) return 50;
            return 0;
          };
          const aScore = getPriority(a.id) + (a.id.includes('pro') ? 10 : 0);
          const bScore = getPriority(b.id) + (b.id.includes('pro') ? 10 : 0);
          return bScore - aScore;
        });

      // Cache the results
      this.modelsCache.set(cacheKey, { models, timestamp: Date.now() });

      return { models };
    } catch (error) {
      console.error('Error fetching Gemini models:', error);
      return {
        models: this.getFallbackGeminiModels(),
        error: error instanceof Error ? error.message : 'Failed to fetch models'
      };
    }
  }

  /**
   * Get mock models (always available)
   */
  getMockModels(): ProviderModels {
    return {
      models: [
        {
          id: 'mock',
          name: 'Mock AI',
          description: 'Simulated responses for demo purposes',
          engine: 'mock'
        }
      ]
    };
  }

  /**
   * Format OpenAI model names for display
   */
  private formatModelName(modelId: string): string {
    const formatMap: { [key: string]: string } = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gpt-3.5-turbo-16k': 'GPT-3.5 Turbo 16K'
    };
    
    return formatMap[modelId] || modelId.toUpperCase().replace(/-/g, ' ');
  }

  /**
   * Format Gemini model names for display
   */
  private formatGeminiModelName(modelId: string): string {
    return modelId
      .replace('gemini-', 'Gemini ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get model descriptions
   */
  private getModelDescription(modelId: string): string {
    const descriptions: { [key: string]: string } = {
      'gpt-4o': 'Most capable model with vision and multimodal capabilities',
      'gpt-4o-mini': 'Efficient version of GPT-4o',
      'gpt-4': 'Advanced reasoning capabilities',
      'gpt-4-turbo': 'Enhanced GPT-4 with improved performance',
      'gpt-3.5-turbo': 'Fast and cost-effective for most tasks',
      'gpt-3.5-turbo-16k': 'GPT-3.5 with extended context length'
    };
    
    return descriptions[modelId] || 'Available model';
  }

  /**
   * Get Gemini model descriptions
   */
  private getGeminiModelDescription(modelId: string): string {
    if (modelId.includes('2.5')) {
      if (modelId.includes('pro')) return 'Enhanced thinking and reasoning, multimodal understanding';
      if (modelId.includes('flash')) return 'Fast and efficient with good performance';
    }
    if (modelId.includes('2.0')) {
      if (modelId.includes('flash')) return 'Next generation features with speed and realtime streaming';
    }
    if (modelId.includes('1.5')) {
      if (modelId.includes('pro')) return 'Complex reasoning tasks requiring more intelligence';
      if (modelId.includes('flash')) return 'Fast and versatile performance across diverse tasks';
    }
    return 'Available Gemini model';
  }

  /**
   * Fallback models for OpenAI when API is unavailable
   */
  private getFallbackOpenAIModels(): ModelInfo[] {
    return [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model with vision', engine: 'openai-gpt4o' },
      { id: 'gpt-4', name: 'GPT-4', description: 'Advanced reasoning capabilities', engine: 'openai-gpt4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective', engine: 'openai-gpt3.5' },
    ];
  }

  /**
   * Fallback models for Gemini when API is unavailable
   */
  private getFallbackGeminiModels(): ModelInfo[] {
    return [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Enhanced thinking and reasoning', engine: 'gemini-2.5-pro' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Adaptive thinking, cost efficiency', engine: 'gemini-2.5-flash' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast and versatile performance', engine: 'gemini-1.5-flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Complex reasoning tasks', engine: 'gemini-1.5-pro' },
    ];
  }

  /**
   * Clear cache for all providers
   */
  clearCache(): void {
    this.modelsCache.clear();
  }

  /**
   * Clear cache for specific provider
   */
  clearProviderCache(provider: 'openai' | 'gemini', apiKey: string): void {
    const cacheKey = `${provider}-${apiKey.substring(0, 10)}`;
    this.modelsCache.delete(cacheKey);
  }
}

export const modelService = ModelService.getInstance();
