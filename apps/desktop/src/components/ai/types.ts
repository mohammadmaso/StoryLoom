import type { StorySuggestion } from "@storyloom/shared";
import type { PlotHoleFinding, StyleProfileData } from "@/lib/api";

export type CopilotMode = "interview" | "whatif" | "plotholes" | "style" | "generate";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  suggestions?: StorySuggestion[];
  appliedSuggestionIds?: string[];
  pendingApproval?: boolean;
  outputPath?: string;
  reportPath?: string;
  severity?: "critical" | "warning" | "info";
  findings?: PlotHoleFinding[];
  styleProfile?: StyleProfileData;
}

export function buildHistoryString(messages: ChatMessage[]): string {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "Author" : "Copilot"}: ${m.content}`)
    .join("\n");
}
