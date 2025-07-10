import { GitBranch } from 'lucide-react';

interface SamplePrompt {
  title: string;
  description: string;
  prompt: string;
}

const samplePrompts: SamplePrompt[] = [
  {
    title: "Explore Ideas",
    description: "Brainstorm and branch out concepts",
    prompt: "Help me brainstorm creative solutions for reducing plastic waste in cities"
  },
  {
    title: "Compare Options",
    description: "Analyze different paths forward",
    prompt: "What are the different approaches to learning a new programming language?"
  },
  {
    title: "Deep Dive",
    description: "Start broad, then branch into specifics",
    prompt: "Explain artificial intelligence and its main applications"
  },
  {
    title: "Creative Writing",
    description: "Build stories with branching narratives",
    prompt: "Write a story about a decision that could change everything"
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
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <GitBranch size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Branch
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Explore conversations that branch and grow
          </p>
          <p className="text-gray-500">
            Start a conversation and discover new paths by selecting text to create branches
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
            🌿 <strong>Tip:</strong> Select any part of my response to create a new branch and explore different directions!
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
