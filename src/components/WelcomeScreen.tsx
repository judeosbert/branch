import { Sparkles } from 'lucide-react';

interface SamplePrompt {
  title: string;
  description: string;
  prompt: string;
}

const samplePrompts: SamplePrompt[] = [
  {
    title: "Creative Writing",
    description: "Help me write a story",
    prompt: "Write a short story about a time traveler who accidentally changes history"
  },
  {
    title: "Problem Solving",
    description: "Analyze and solve problems",
    prompt: "What are the pros and cons of remote work vs office work?"
  },
  {
    title: "Learning",
    description: "Explain complex topics",
    prompt: "Explain quantum computing in simple terms"
  },
  {
    title: "Coding Help",
    description: "Programming assistance",
    prompt: "How do I create a REST API in Node.js?"
  }
];

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

const WelcomeScreen = ({ onSelectPrompt }: WelcomeScreenProps) => {
  return (
    <div className="flex items-center justify-center h-full px-4">
      <div className="max-w-4xl w-full text-center">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <Sparkles size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            How can I help you today?
          </h1>
          <p className="text-gray-600">
            Get started by choosing a topic below or type your own message
          </p>
        </div>

        {/* Sample Prompts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {samplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(prompt.prompt)}
              className="group text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {prompt.title}
                  </h3>
                  <p className="text-sm text-gray-600 group-hover:text-blue-600">
                    {prompt.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-sm text-gray-500">
          <p>
            💡 <strong>Tip:</strong> You can ask me about anything - from creative writing to coding help!
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
