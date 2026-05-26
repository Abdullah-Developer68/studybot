import type { ComponentPropsWithoutRef } from "react";

export type CodeRendererProps = ComponentPropsWithoutRef<"code"> & {
  inline?: boolean;
  node?: unknown;
};