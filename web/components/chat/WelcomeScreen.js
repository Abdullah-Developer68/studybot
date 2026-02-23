import {
  Bot,
  MessageSquare,
  FileSearch,
  Lightbulb,
} from "lucide-react";

// Welcome screen component
const WelcomeScreen = () => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4">
    <div className="mb-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto">
        <Bot size={60} className="text-white" />
      </div>
      <h1 className="text-2xl font-semibold text-white mb-2">
        Study Bot is here to help!
      </h1>
      <p className="text-gray-400 max-w-md">
        Start a conversation, ask questions, or upload documents for analysis.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:bg-gray-800 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-3">
          <MessageSquare size={20} className="text-blue-400" />
        </div>
        <h3 className="text-sm font-medium text-white mb-1">Ask Anything</h3>
        <p className="text-xs text-gray-400">
          Get answers to your questions on any topic
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:bg-gray-800 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
          <FileSearch size={20} className="text-purple-400" />
        </div>
        <h3 className="text-sm font-medium text-white mb-1">
          Analyze Documents
        </h3>
        <p className="text-xs text-gray-400">
          Upload PDFs, Word, Excel files for insights
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:bg-gray-800 transition-colors">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-3">
          <Lightbulb size={20} className="text-amber-400" />
        </div>
        <h3 className="text-sm font-medium text-white mb-1">Get Ideas</h3>
        <p className="text-xs text-gray-400">
          Brainstorm and explore creative solutions
        </p>
      </div>
    </div>

    <p className="text-xs text-gray-500 mt-8">
      Type a message below to get started
    </p>
  </div>
);

export default WelcomeScreen;
