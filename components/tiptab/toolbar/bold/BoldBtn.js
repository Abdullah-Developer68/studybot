import { useEditorState } from "@tiptap/react";
import { Toggle } from "@/components/ui/toggle";
import { Bold } from "lucide-react";

const BoldBtn = ({ editor }) => {
  const editorState = useEditorState({
    editor,
    selector: (context) => {
      if (!editor) return null;

      return {
        isBoldActive: context.editor.isActive("bold") ?? false,
      };
    },
  });

  return (
    <>
      <Toggle
        aria-label="Toggle bookmark"
        size="sm"
        variant="outline"
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="group-data-[state=on]/toggle:fill-foreground" />
      </Toggle>
    </>
  );
};

export default BoldBtn;
