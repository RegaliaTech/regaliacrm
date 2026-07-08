import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button that shows a spinner while pending. Consumes the `pending`
 * boolean from `useActionState`'s third tuple element (the pattern already used
 * across every form), standardizing the `Loader2` spinner + disabled state.
 */
export function SubmitButton({
  pending,
  disabled,
  children,
  ...props
}: ButtonProps & { pending?: boolean }) {
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
