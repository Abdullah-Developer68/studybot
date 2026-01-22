// ---------- THE FOLLOWING IS TIPTAP IMPLEMENTATION -------------
// import Tiptap from "@/components/tiptab/Tiptab";

// const newTemplate = () => {
//   return (
//     <>
//       <Tiptap />
//     </>
//   );
// };

// export default newTemplate;

// ---- PREBUILT RICH TEXT EDITOR IMPLEMENTATION ----

"use client";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

const NewTemplate = () => {
  return <SimpleEditor />;
};
export default NewTemplate;
