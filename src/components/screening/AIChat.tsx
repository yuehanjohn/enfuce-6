"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Card } from "@heroui/react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatProps {
  queueId: string;
  onTranscriptUpdate?: (transcript: string) => void;
}

export function AIChat({ queueId, onTranscriptUpdate }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (onTranscriptUpdate && messages.length > 0) {
      const transcript = messages
        .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join("\n\n");
      onTranscriptUpdate(transcript);
    }
  }, [messages, onTranscriptUpdate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/screening/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue_id: queueId, messages: newMessages }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              assistantText += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantText };
                return updated;
              });
            }
          } catch {
            // skip unparseable chunks
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev.filter((m) => m.content !== ""),
        {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}. Make sure your OpenRouter API key is configured.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <Card.Header>
        <div className="flex w-full items-center gap-2">
          <svg
            className="h-5 w-5 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
            />
          </svg>
          <Card.Title>AI Assistant</Card.Title>
        </div>
      </Card.Header>
      <Card.Content className="flex flex-1 flex-col gap-0 p-0">
        {/* Messages area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[400px]"
        >
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-center">
              <div className="space-y-2 text-default-400">
                <p className="text-sm">Ask questions about this case</p>
                <div className="space-y-1 text-xs">
                  <p>&quot;Find recent news about this person&quot;</p>
                  <p>&quot;Is there a court record for this individual?&quot;</p>
                  <p>&quot;Compare the DOB discrepancy in detail&quot;</p>
                </div>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-default-100 text-default-700"
                }`}
              >
                <p className="whitespace-pre-wrap">
                  {msg.content || (isLoading ? "Thinking..." : "")}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-default-200 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this case..."
              disabled={isLoading}
              className="flex-1 rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isDisabled={!input.trim() || isLoading}
            >
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}
