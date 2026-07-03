import { Sparkles, FolderSearch2, Code, BookOpen } from "lucide-react";
import type { ReactElement } from "react";

const btnBase =
  "flex justify-center items-center gap-2 w-[130px] px-4 py-2 rounded-full bg-sky-500/15 text-sky-100 hover:bg-sky-500/25 transition-shadow shadow-sm hover:shadow-md border border-sky-400/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50";

const Buttons = (): ReactElement => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 w-full">
      <button className={btnBase}>
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium font-proxima">Create</span>
      </button>

      <button className={btnBase}>
        <FolderSearch2 className="w-4 h-4" />
        <span className="text-sm font-medium font-proxima">Explore</span>
      </button>

      <button className={btnBase}>
        <Code className="w-4 h-4" />
        <span className="text-sm font-medium font-proxima">Code</span>
      </button>

      <button className={btnBase}>
        <BookOpen className="w-4 h-4" />
        <span className="text-sm font-medium font-proxima">Learn</span>
      </button>
    </div>
  );
};

const suggestions: string[] = [
  "How does AI work?",
  "Are black holes real?",
  'How many Rs are in the word "strawberry"?',
  "What is the meaning of life?",
];

const WelcomeScreen = (): ReactElement => {
  return (
    <div className="w-full min-h-[60vh] flex items-center justify-cente">
      <div className="w-full max-w-3xl px-6 md:px-0">
        <div className="flex flex-col items-center text-center gap-6">
          <h1 className="text-3xl md:text-4xl font-bold font-proxima">
            How can I help you?
          </h1>

          <div className="w-full px-2">
            <Buttons />
          </div>

          <div className="w-full mt-6">
            <div className="flex flex-col items-center gap-4">
              {suggestions.map((text, i) => (
                <div key={text} className="w-full flex flex-col items-center">
                  <button
                    type="button"
                    className={
                      `w-full md:w-3/4 lg:w-1/2 mx-auto text-center px-6 py-3 rounded-md transition-colors ` +
                      (i === 0
                        ? "bg-sky-500/15 text-sky-100 border border-sky-400/25 font-proxima"
                        : "text-sky-200 hover:bg-sky-500/10 font-proxima")
                    }
                  >
                    {text}
                  </button>

                  <div className="w-full md:w-3/4 lg:w-1/2 mx-auto border-t border-sky-400/15 mt-3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
