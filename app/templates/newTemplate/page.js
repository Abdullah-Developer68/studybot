"use client";
import dynamic from "next/dynamic";
import { useState } from "react";

// This tells Next.js: "Only load this on the client's computer"
const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

const NewTemplate = () => {
  const [content, setContent] = useState(
    "# My New Document\nStart typing here...",
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">User-Friendly Editor</h1>

      <Editor markdown={content} onChange={(v) => setContent(v)} />

      <div className="mt-10 p-4 bg-gray-50 rounded border">
        <h2 className="text-sm font-mono text-gray-500 mb-2">
          Saved Markdown Output:
        </h2>
        <pre className="text-xs">{content}</pre>
      </div>
    </div>
  );
};

export default NewTemplate;
