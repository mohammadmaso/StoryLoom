import type { ChatMessage, CopilotMode } from "@/components/ai/types";
import type { SuggestionApplyMode } from "@storyloom/shared";

export interface CopilotSession {
  version: 2;
  mode: CopilotMode;
  chapterPath: string | null;
  messages: ChatMessage[];
  outline: boolean;
  force: boolean;
  includeAi: boolean;
  applyMode: SuggestionApplyMode;
  updatedAt: number;
}

const STORAGE_PREFIX = "storyloom-copilot:";
const MAX_MESSAGES = 200;

function storageKey(projectRoot: string): string {
  return `${STORAGE_PREFIX}${projectRoot}`;
}

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_MESSAGES) return messages;
  return messages.slice(-MAX_MESSAGES);
}

function isCopilotMode(value: unknown): value is CopilotMode {
  return (
    value === "interview" ||
    value === "whatif" ||
    value === "plotholes" ||
    value === "style" ||
    value === "generate"
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const msg = value as ChatMessage;
  return (
    typeof msg.id === "string" &&
    (msg.role === "user" || msg.role === "assistant" || msg.role === "system") &&
    typeof msg.content === "string" &&
    typeof msg.timestamp === "number"
  );
}

function isApplyMode(value: unknown): value is SuggestionApplyMode {
  return value === "append" || value === "integrate";
}

function parseSession(raw: string): CopilotSession | null {
  try {
    const data = JSON.parse(raw) as Partial<CopilotSession> & { version?: number };
    if (!Array.isArray(data.messages)) return null;
    const messages = data.messages.filter(isChatMessage);
    return {
      version: 2,
      mode: isCopilotMode(data.mode) ? data.mode : "interview",
      chapterPath: typeof data.chapterPath === "string" ? data.chapterPath : null,
      messages: trimMessages(messages),
      outline: Boolean(data.outline),
      force: Boolean(data.force),
      includeAi: data.includeAi !== false,
      applyMode: isApplyMode(data.applyMode) ? data.applyMode : "integrate",
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function loadCopilotSession(projectRoot: string): CopilotSession | null {
  const raw = localStorage.getItem(storageKey(projectRoot));
  if (!raw) return null;
  return parseSession(raw);
}

export function saveCopilotSession(
  projectRoot: string,
  session: Omit<CopilotSession, "version" | "updatedAt">,
): void {
  const payload: CopilotSession = {
    version: 2,
    ...session,
    messages: trimMessages(session.messages),
    updatedAt: Date.now(),
  };
  localStorage.setItem(storageKey(projectRoot), JSON.stringify(payload));
}

export function clearCopilotSession(projectRoot: string): void {
  localStorage.removeItem(storageKey(projectRoot));
}
