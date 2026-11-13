import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";

export const EDITOR_EXTENSIONS = [StarterKit.configure({ underline: false }), Underline];