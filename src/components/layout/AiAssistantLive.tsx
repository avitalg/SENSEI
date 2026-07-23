// Live-mode assistant controller — streams answers from the senseiapi
// /assistant/chat endpoint via @ai-sdk/react's useChat (Vercel AI-SDK UI message
// stream). This module is the ONLY consumer of @ai-sdk/react + ai, and it is
// lazy-loaded (see AiAssistant.tsx) so the ~heavy AI SDK is split into its own
// chunk and never ships in the default client-only build (no VITE_API_BASE_URL).
import { useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, getToolName, isTextUIPart, isToolUIPart, type UIMessage } from 'ai';
import { useApp } from '../../store/AppStore';
import { API_BASE_URL } from '../../services/apiClient';
import { getApiAccessToken } from '../../services/apiAuth';
import { AiPanel, type PanelMessage, type ToolView } from './AiPanel';

// The subset of an AI-SDK tool part we read (its typed shape varies by state).
interface ToolPartLike {
  toolCallId: string
  state?: string
  input?: unknown
  output?: unknown
}

// Turn a UIMessage's tool parts into 1-line views. discover_api → "גילוי כלים";
// http_get → "קריאה ל-API · <path>" so the therapist sees exactly what was fetched.
function toolViews(message: UIMessage): ToolView[] {
  return message.parts.filter(isToolUIPart).map((part) => {
    const name = getToolName(part);
    const p = part as unknown as ToolPartLike;
    const path =
      p.input && typeof p.input === 'object' ? (p.input as { path?: string }).path : undefined;
    const label =
      name === 'http_get' && path
        ? `קריאה ל-API · ${path}`
        : name === 'discover_api'
          ? 'גילוי כלים זמינים'
          : `כלי · ${name}`;
    return { id: p.toolCallId, label, input: p.input, output: p.output, done: p.state === 'output-available' };
  });
}

// The visible text of a UIMessage is the concatenation of its text parts.
function messageText(message: UIMessage): string {
  return message.parts.filter(isTextUIPart).map((part) => part.text).join('');
}

export default function LiveAssistant() {
  const { S, set, toast } = useApp();
  const [input, setInput] = useState('');
  // Seed the conversation once with whatever is already persisted (the greeting on
  // first run); lazy init so it does not re-read the store on every render.
  const [initialMessages] = useState(() => storeToUiMessages(S.aiMessages));

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE_URL}/assistant/chat`,
        credentials: 'omit',
        // Bearer token when the backend enforces auth; absent in the open dev default.
        headers: (): Record<string, string> => {
          const token = getApiAccessToken();
          const h: Record<string, string> = {};
          if (token) h.Authorization = `Bearer ${token}`;
          return h;
        },
      }),
    [],
  );

  const { messages, sendMessage, status } = useChat({
    id: 'sensei-assistant',
    messages: initialMessages,
    transport,
    onError: () => toast('לא הצלחנו לקבל תשובה מסנסיי כרגע. נסו שוב.', 'error'),
    // Persist the finished transcript so it survives a reload (as the demo mode does).
    onFinish: ({ messages: final }) => set({ aiMessages: uiToStoreMessages(final) }),
  });

  const panelMessages: PanelMessage[] = messages.map((m) => ({
    me: m.role === 'user',
    text: messageText(m),
    tools: m.role === 'user' ? undefined : toolViews(m),
  }));
  // Show the typing dots while waiting, and until the first streamed token arrives.
  const lastText = panelMessages.length ? panelMessages[panelMessages.length - 1] : null;
  const typing = status === 'submitted' || (status === 'streaming' && (!lastText || lastText.me || !lastText.text));

  const onSend = (text: string) => {
    const q = (text || '').trim();
    if (!q || status === 'submitted' || status === 'streaming') return;
    setInput('');
    void sendMessage({ text: q });
  };

  return (
    <AiPanel
      open={S.aiOpen}
      onOpen={() => set({ aiOpen: true })}
      onClose={() => set({ aiOpen: false })}
      messages={panelMessages}
      typing={typing}
      input={input}
      onInput={setInput}
      onSend={onSend}
    />
  );
}

function storeToUiMessages(stored: { role: string; text: string }[]): UIMessage[] {
  return (stored || []).map((m, i) => ({
    id: `seed-${i}`,
    role: m.role === 'me' ? 'user' : 'assistant',
    parts: [{ type: 'text', text: m.text }],
  }));
}

function uiToStoreMessages(messages: UIMessage[]): { role: 'me' | 'ai'; text: string }[] {
  return messages.map((m) => ({ role: m.role === 'user' ? 'me' : 'ai', text: messageText(m) }));
}
