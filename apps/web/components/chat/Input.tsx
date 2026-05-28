"use client";

import type { ChangeEvent } from "react";
import type { AttachedFile, FormSubmitEvent } from "@studybot/types";

import { useRef, useState } from "react";
import { ArrowUpIcon, X, FileText, Loader2, Square, Plus } from "lucide-react";
import useChatContext from "@/hooks/chat/useChatContext";
import { createClient } from "@/utils/supabase/client";
import { uploadDocument } from "@studybot/api-client";
import {
  getSupportedExtensions,
  validateFile,
} from "@studybot/utils/global/file-utils";
import { uploadFilesWithProgress } from "@studybot/utils/global/upload.utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import ModelSelectionMenu from "./ModelSelectionMenu";
import { useModelSelectionStore } from "@/stores/modelSelectionStore";

const SUPPORTED_FILE_TYPES = getSupportedExtensions();
const supabaseClient = createClient();

const Input = () => {
  const { sendMessage, status, stop } = useChatContext();
  const selectedModelId = useModelSelectionStore(
    (state) => state.selectedModelId,
  );
  const [prompt, setPrompt] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isLoading = status === "submitted" || status === "streaming";

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadError(null);

    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadError(`${file.name}: ${validation.error}`);
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: sessionResult, error: sessionError } =
        await supabaseClient.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const accessToken = sessionResult?.session?.access_token;

      if (!accessToken) {
        throw new Error("Please sign in again before uploading files.");
      }

      const uploadedFiles = await uploadFilesWithProgress({
        files,
        uploadDocument: (file, onProgress) =>
          uploadDocument(file, onProgress, { accessToken }),
        onOverallProgress: (overallProgress: number) => {
          setUploadProgress(overallProgress);
        },
      });

      setAttachedFiles((prev) => [...prev, ...uploadedFiles]);
    } catch (error: unknown) {
      console.error("File upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload files";
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadError(null);
  };

  const handleRemoveAllFiles = () => {
    setAttachedFiles([]);
    setUploadError(null);
  };

  const buildMessageForAI = (userPrompt: string) => {
    let messageForAI = userPrompt;

    if (attachedFiles.length > 0) {
      const documentsContent = attachedFiles
        .map(
          (file: AttachedFile) =>
            `[Document: ${file.name}]\n\n${file.extractedText}`,
        )
        .join("\n\n---\n\n");

      messageForAI = `${documentsContent}\n\n[User Request]: ${userPrompt}`;
    }

    return messageForAI;
  };

  const handleSubmit = async (e: FormSubmitEvent) => {
    e.preventDefault();

    if (
      (!prompt.trim() && attachedFiles.length === 0) ||
      isLoading ||
      isUploading
    ) {
      return;
    }

    const userPrompt = prompt.trim() || "Please summarize these documents.";
    const messageForAI = buildMessageForAI(userPrompt);

    sendMessage(
      {
        role: "user",
        text: messageForAI,
      },
      {
        body: {
          model: selectedModelId,
          attachments: attachedFiles.map((file) => ({
            name: file.name,
            type: file.type,
            wasTruncated: file.wasTruncated,
          })),
        },
      },
    );

    setPrompt("");
    setAttachedFiles([]);
    setUploadError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl">
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

      {isUploading && (
        <div className="mb-2 rounded-lg border border-blue-700 bg-blue-900/30 px-3 py-2 text-xs text-blue-200">
          <div className="mb-1 flex items-center justify-between">
            <span>Uploading files...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full rounded bg-blue-950">
            <div
              className="h-1.5 rounded bg-blue-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
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
        <InputGroupAddon align="block-end" className="">
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_FILE_TYPES.join(",")}
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading}
            multiple
          />

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
              <Plus size={16} />
            )}
          </InputGroupButton>

          <ModelSelectionMenu />
          <InputGroupText className="ml-auto group relative">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-600 cursor-help"></div>
            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              52% context used
            </div>
          </InputGroupText>
          <Separator orientation="vertical" className="h-4" />

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
