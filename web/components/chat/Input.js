"use client";
import { useState, useRef } from "react";
import { IconPlus } from "@tabler/icons-react";
import {
  ArrowUpIcon,
  X,
  FileText,
  Loader2,
  Square,
  Bolt,
  BadgeQuestionMark,
  WalletCards,
} from "lucide-react";
import useChatContext from "@/hooks/chat/useChatContext";
import { uploadDocument } from "@/lib/api-client";
import { getSupportedExtensions, MAX_FILE_SIZE_MB } from "@studybot/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";

const SUPPORTED_FILE_TYPES = getSupportedExtensions();

// Validate file before upload
const validateFile = (file) => {
  // Check file size
  const fileSizeInMB = file.size / (1024 * 1024);
  if (fileSizeInMB > MAX_FILE_SIZE_MB) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Current size: ${fileSizeInMB.toFixed(2)}MB`,
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = SUPPORTED_FILE_TYPES.some((ext) =>
    fileName.endsWith(ext),
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Unsupported file type. Supported formats: ${SUPPORTED_FILE_TYPES.join(", ")}`,
    };
  }

  return { valid: true, error: null };
};

const Input = () => {
  const [prompt, setPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, status, stop } = useChatContext();

  // isLoading is derived from status which is a state variable managed by useChat
  const isLoading = status === "submitted" || status === "streaming";

  // Handle file selection button click
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection (multiple files)
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset previous error
    setUploadError(null);

    // Validate all files first
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadError(`${file.name}: ${validation.error}`);
        return;
      }
    }

    setIsUploading(true);

    try {
      // Upload all files in parallel
      const uploadPromises = files.map(async (file) => {
        const data = await uploadDocument(file);
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          extractedText: data.extractedText,
          wasTruncated: data.wasTruncated,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Add to existing attached files
      setAttachedFiles((prev) => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error("File upload error:", error);
      setUploadError(error.message);
    } finally {
      setIsUploading(false);
      // Reset file input so same files can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Remove a specific attached file
  const handleRemoveFile = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadError(null);
  };

  // Remove all attached files
  const handleRemoveAllFiles = () => {
    setAttachedFiles([]);
    setUploadError(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      (!prompt.trim() && attachedFiles.length === 0) ||
      isLoading ||
      isUploading
    )
      return;

    // Get user's actual prompt
    const userPrompt = prompt.trim() || "Please summarize these documents.";

    // Build the full message content for AI (all file contents first, then user prompt)
    let messageForAI = userPrompt;
    if (attachedFiles.length > 0) {
      const documentsContent = attachedFiles
        .map((file) => `[Document: ${file.name}]\n\n${file.extractedText}`)
        .join("\n\n---\n\n");
      messageForAI = `${documentsContent}\n\n[User Request]: ${userPrompt}`;
    }

    // AI SDK 5.0+ expects a message object with parts, not a plain string
    sendMessage({
      role: "user",
      content: messageForAI,
    });

    setPrompt("");
    setAttachedFiles([]);
    setUploadError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="w-3xl">
      {/* File attachments preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-blue-700 scrollbar-track-transparent">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 bg-blue-900/30 border border-blue-700 rounded-lg px-2 py-1.5 text-xs shrink-0 max-w-35"
              >
                <FileText size={14} className="text-blue-400 shrink-0" />
                <span className="text-blue-200 truncate" title={file.name}>
                  {file.name}
                </span>
                {file.wasTruncated && (
                  <span
                    className="text-yellow-400 text-[10px]"
                    title="Content was truncated"
                  >
                    !
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="text-blue-300 hover:text-white transition-colors p-0.5 rounded hover:bg-blue-800/50 shrink-0"
                  title="Remove file"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          {attachedFiles.length > 1 && (
            <button
              type="button"
              onClick={handleRemoveAllFiles}
              className="text-xs text-blue-300 hover:text-white mt-1"
            >
              Remove all
            </button>
          )}
        </div>
      )}

      {/* Upload error message */}
      {uploadError && (
        <div className="mb-2 flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-300">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="ml-auto text-red-300 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <InputGroup className="w-full">
        <InputGroupTextarea
          placeholder={
            attachedFiles.length > 0
              ? "Ask a question about the documents..."
              : "Ask, Search or Chat..."
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
        />
        <InputGroupAddon align="block-end">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_FILE_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
            multiple
          />

          {/* File upload button */}
          <InputGroupButton
            type="button"
            variant="outline"
            className="rounded-full"
            size="icon-xs"
            onClick={handleFileButtonClick}
            disabled={isLoading}
            title="Attach document (PDF, Word, Excel, PowerPoint, etc.)"
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <IconPlus />
            )}
          </InputGroupButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton type="button" variant="ghost">
                <Bolt size={28} />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="[--radius:0.95rem]"
            >
              <DropdownMenuItem>
                <span className="flex items-center gap-2 justify-between w-full">
                  <p>Quiz</p>
                  <BadgeQuestionMark size={20} />
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span className="flex items-center gap-2 justify-between w-full">
                  <p>Flash Cards</p>
                  <WalletCards size={20} />
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <span className="flex items-center gap-2 justify-between w-full">
                  <p>Manual</p>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <InputGroupText className="ml-auto group relative">
            {/* Context Window */}
            <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-600 cursor-help"></div>
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              52% context used
            </div>
          </InputGroupText>
          <Separator orientation="vertical" className="h-4" />

          {/* Send or Stop button */}
          {isLoading ? (
            <InputGroupButton
              type="button"
              variant="destructive"
              className="rounded-full cursor-pointer"
              size="icon-xs"
              onClick={stop}
              title="Stop generating"
            >
              <Square size={14} fill="currentColor" />
              <span className="sr-only">Stop</span>
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="default"
              className="rounded-full cursor-pointer"
              size="icon-xs"
              disabled={!prompt.trim() || isUploading}
            >
              <ArrowUpIcon />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};

export default Input;
