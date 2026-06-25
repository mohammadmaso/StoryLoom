import { useMemo } from "react";
import clsx from "clsx";
import { markdownToHtml } from "@/lib/markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const html = useMemo(() => markdownToHtml(content), [content]);

  return (
    <div
      className={clsx("copilot-markdown prose-invert max-w-none text-sm leading-relaxed", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
