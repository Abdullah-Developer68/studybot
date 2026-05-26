import type { ComponentProps } from "react";

// Start with the full props type React exposes for a <form> element.
// This gives us the same typing React uses instead of inventing our own event shape.
export type FormSubmitEvent = Parameters<
  // Look up the onSubmit prop from the form props type.
  // The result is the exact function type React expects for a form submit handler.
  NonNullable<ComponentProps<"form">["onSubmit"]>
  // Remove null or undefined before reading the function's parameter list.
  // This matters because onSubmit is optional in the props type, so TypeScript may
  // see it as "function type | undefined" unless we narrow it first.
  // Parameters<> turns a function type into a tuple of its arguments.
  // Since a submit handler usually takes one event argument, [0] gives us that event type.
>[0];