import type { ReactNode } from "react";

interface LabelProps {
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}

export function Label({ children, htmlFor, className = "" }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-xs uppercase tracking-wider font-semibold text-neutral-300 mb-2 ${className}`}
    >
      {children}
    </label>
  );
}
