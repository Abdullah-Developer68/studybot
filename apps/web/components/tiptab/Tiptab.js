"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import ToolBar from "@components/tiptab/toolbar/ToolBar";
import Highlight from "@tiptap/extension-highlight";

const Tiptap = () => {
  const editor = useEditor({
    extensions: [StarterKit, Highlight.configure({ multicolor: true })],
    content: "<p>Hello World! </p>",
    // Don't render immediately on the server to avoid SSR issues
    immediatelyRender: false,
  });

  return (
    <>
      <div className="flex flex-col items-center w-full h-full">
        {" "}
        {editor && <ToolBar editor={editor} />}
        <EditorContent editor={editor} className="w-1/2 bg-gray-500 h-[1000]" />
        {/* <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>*/}
      </div>
    </>
  );
};

export default Tiptap;

