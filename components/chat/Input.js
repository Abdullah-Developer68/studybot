"use client";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { ArrowUpIcon } from "lucide-react";
import useChatContext from "@/hooks/useChatContext";
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

const Input = () => {
  const [prompt, setPrompt] = useState("");
  const { sendMessage, status } = useChatContext();

  // isLoading is derived from status which is a state variable managed by useChat
  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return; // Guard against empty prompts

    // AI SDK 5.0+ expects a message object with parts, not a plain string
    sendMessage({
      role: "user",
      content: prompt.trim(),
    });
    setPrompt("");
  };

  return (
    <form onSubmit={handleSubmit} className="w-3xl">
      <InputGroup className="w-full">
        <InputGroupTextarea
          placeholder="Ask, Search or Chat..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton
            type="button"
            variant="outline"
            className="rounded-full"
            size="icon-xs"
          >
            <IconPlus />
          </InputGroupButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton type="button" variant="ghost">
                Auto
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="[--radius:0.95rem]"
            >
              <DropdownMenuItem>Auto</DropdownMenuItem>
              <DropdownMenuItem>Agent</DropdownMenuItem>
              <DropdownMenuItem>Manual</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <InputGroupText className="ml-auto">52% used</InputGroupText>
          <Separator orientation="vertical" className="h-4" />
          <InputGroupButton
            type="submit"
            variant="default"
            className="rounded-full cursor-pointer"
            size="icon-xs"
            disabled={!prompt.trim() || isLoading}
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};

export default Input;
