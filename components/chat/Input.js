"use client";
import { IconPlus } from "@tabler/icons-react";
import { ArrowUpIcon } from "lucide-react";

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
import { useState } from "react";
import { sendUserPrompt } from "@lib/api-client";

const Input = () => {
  const [prompt, setPrompt] = useState();
  const handleUserInput = (e) => {
    setPrompt(e.target.value);
  };
  const submitPrompt = async () => {
    if (!prompt.trim()) return; // Gaurd against empty prompts
    try {
      const res = await sendUserPrompt(prompt.trim());
      console.log(res);
      setPrompt("");
      console.log("Response from API:", res.data);
    } catch (err) {
      // Show toast on here
      console.error(err);
    }
  };
  return (
    <>
      <InputGroup className="w-3xl">
        <InputGroupTextarea
          placeholder="Ask, Search or Chat..."
          onChange={(e) => {
            handleUserInput(e);
          }}
        />
        <InputGroupAddon align="block-end">
          <InputGroupButton
            variant="outline"
            className="rounded-full"
            size="icon-xs"
          >
            <IconPlus />
          </InputGroupButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton variant="ghost">Auto</InputGroupButton>
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
            variant="default"
            className="rounded-full cursor-pointer"
            size="icon-xs"
            disabled={!prompt?.trim()}
            onClick={submitPrompt}
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </>
  );
};

export default Input;
