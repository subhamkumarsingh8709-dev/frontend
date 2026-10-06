import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

type Source = string | { file: string; snippet?: string };

type Message = {
  role: "user" | "bot";
  text: string;
  sources?: Source[];
  error?: boolean;
  retry?: string;
};

type IconName =
  | "card"
  | "box"
  | "alert"
  | "chat"
  | "send"
  | "close"
  | "file"
  | "up"
  | "mail";

type Topic = {
  title: string;
  desc: string;
  ask: string | null;
  icon: IconName;
};

type ChatWidgetProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  pending: string | null;
  clearPending: () => void;
};

const ICON_PATHS: Record<IconName, string[]> = {
  card: ["M3 7h18v10H3z", "M3 11h18"],

  box: ["M21 8l-9-5-9 5 9 5 9-5z", "M3 8v8l9 5 9-5V8", "M12 13v8"],

  alert: ["M12 3l10 18H2L12 3z", "M12 10v4", "M12 17.5v.01"],

  chat: ["M4 5h16v11H9l-5 4V5z"],

  send: ["M5 12h14", "M13 6l6 6-6 6"],

  close: ["M6 6l12 12", "M18 6L6 18"],

  file: [
    "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z",
    "M14 3v5h5",
  ],

  up: ["M12 19V5", "M5 12l7-7 7 7"],

  mail: ["M3 6h18v12H3z", "M3 7l9 6 9-6"],
};

const TOPICS: Topic[] = [
  {
    title: "Payments and refunds",
    desc: "Double charges, failed payments, refund timelines.",
    ask: "I was charged twice for the same order. Can you help me get a refund?",
    icon: "card",
  },
  {
    title: "Cancel an order",
    desc: "Cancel before it ships and see what happens next.",
    ask: "How do I cancel my order before it ships?",
    icon: "box",
  },
  {
    title: "Payment failed",
    desc: "Money left your account but the order didn't go through.",
    ask: "My payment failed but the money left my account.",
    icon: "alert",
  },
  {
    title: "Talk to the bot",
    desc: "Ask anything in your own words and get an answer.",
    ask: null,
    icon: "chat",
  },
];

const QUICK = [
  "Refund for a double charge",
  "Cancel my order",
  "Payment failed",
];

const GREETING: Message = {
  role: "bot",
  text: "Hi, I'm the Support Copilot. Tell me what's going on with your order or payment and I'll find the answer.",
};

function Icon({
  name,
  className = "h-4 w-4",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICON_PATHS[name].map((path, index) => (
        <path key={index} d={path} />
      ))}
    </svg>
  );
}

function BotLogo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="supportBotGradient" x1="8" y1="8" x2="56" y2="56">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#2DD4BF" />
        </linearGradient>
      </defs>

      <path
        d="M32 6v8"
        stroke="url(#supportBotGradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <circle cx="32" cy="6" r="3.5" fill="#2DD4BF" />

      <rect
        x="4"
        y="27"
        width="6"
        height="14"
        rx="3"
        fill="url(#supportBotGradient)"
      />

      <rect
        x="54"
        y="27"
        width="6"
        height="14"
        rx="3"
        fill="url(#supportBotGradient)"
      />

      <rect
        x="10"
        y="14"
        width="44"
        height="36"
        rx="14"
        fill="url(#supportBotGradient)"
      />

      <rect x="16" y="22" width="32" height="20" rx="10" fill="#0B1220" />

      <circle cx="26" cy="31" r="3.2" fill="#5EEAD4" />
      <circle cx="38" cy="31" r="3.2" fill="#5EEAD4" />

      <path
        d="M28 37.5q4 2.5 8 0"
        stroke="#5EEAD4"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M57 41v3a6 6 0 0 1-6 6h-8"
        stroke="url(#supportBotGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <rect x="37" y="48" width="7" height="4.5" rx="2.2" fill="#2DD4BF" />
    </svg>
  );
}

function ChatWidget({ open, setOpen, pending, clearPending }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ask = async (question: string) => {
    const query = question.trim();

    if (!query || loading) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: query,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}?query=${encodeURIComponent(query)}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error(`The server returned ${response.status}.`);
      }

      const data: {
        answer?: string;
        sources?: Source[];
      } = await response.json();

      const answer =
        typeof data.answer === "string" && data.answer.trim()
          ? data.answer
          : "I couldn't find an answer. Try rewording your question.";

      setMessages((current) => [
        ...current,
        {
          role: "bot",
          text: answer,
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      const friendlyMessage = message.includes("Failed to fetch")
        ? "I can't reach the support service right now. Make sure the FastAPI server is running on localhost:8000."
        : message;

      setMessages((current) => [
        ...current,
        {
          role: "bot",
          error: true,
          retry: query,
          text: friendlyMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pending) {
      return;
    }

    void ask(pending);
    clearPending();

    // We intentionally only react to a new pending question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open]);

  return (
    <>
      {/* Chat panel */}
      <div
        role="dialog"
        aria-label="Support Copilot chat"
        className={`fixed bottom-24 right-3 z-30 flex h-[min(600px,calc(100vh-8rem))] w-[calc(100vw-1.5rem)] max-w-[400px] origin-bottom-right flex-col overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/10 transition duration-200 sm:right-6 ${
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {/* Chat header */}
        <div className="relative flex items-center gap-3 bg-slate-950 px-5 py-4 text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-teal-400/25 blur-3xl"
          />

          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
            <BotLogo className="h-7 w-7" />
          </div>

          <div className="relative">
            <p className="text-sm font-bold">Support Copilot</p>

            <p className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Online, replies in seconds
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="relative ml-auto rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5"
          aria-live="polite"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] ${
                  message.role === "bot" ? "flex gap-2" : ""
                }`}
              >
                {message.role === "bot" && (
                  <BotLogo className="mt-1 h-6 w-6 shrink-0" />
                )}

                <div>
                  <div
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] leading-6 ${
                      message.role === "user"
                        ? "rounded-br-md bg-gradient-to-r from-indigo-600 to-indigo-500 text-white"
                        : message.error
                          ? "rounded-bl-md bg-red-50 text-red-800 ring-1 ring-red-200"
                          : "rounded-bl-md bg-white text-slate-800 shadow-sm ring-1 ring-slate-200"
                    }`}
                  >
                    {message.text}
                  </div>

                  {message.error && message.retry && (
                    <button
                      type="button"
                      onClick={() => void ask(message.retry ?? "")}
                      className="mt-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Try again
                    </button>
                  )}

                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.sources.map((source, sourceIndex) => {
                        const file =
                          typeof source === "string" ? source : source.file;

                        return (
                          <span
                            key={sourceIndex}
                            className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-700 ring-1 ring-teal-100"
                          >
                            <Icon name="file" className="h-3 w-3" />
                            {file}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-2">
              <BotLogo className="mt-1 h-6 w-6 shrink-0" />

              <div
                className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200"
                aria-label="Bot is typing"
              >
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                    style={{
                      animationDelay: `${index * 120}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quick questions */}
          {messages.length === 1 && !loading && (
            <div className="flex flex-wrap gap-2 pl-8">
              {QUICK.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void ask(question)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                >
                  {question}
                </button>
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 bg-white p-3">
          <div className="flex items-end gap-2 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-inset ring-slate-200 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void ask(input);
                }
              }}
              placeholder="Type your question..."
              className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400"
            />

            <button
              type="button"
              onClick={() => void ask(input)}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 transition hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <Icon name="up" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close chat" : "Chat with Support Copilot"}
        className="fixed bottom-5 right-4 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-2xl shadow-indigo-900/30 ring-1 ring-slate-900/5 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:right-6"
      >
        {open ? (
          <Icon name="close" className="h-6 w-6 text-slate-700" />
        ) : (
          <BotLogo className="h-10 w-10" />
        )}

        {!open && (
          <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        )}
      </button>
    </>
  );
}

function App() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  const openBot = (question?: string | null) => {
    setOpen(true);

    if (question) {
      setPending(question);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#EEF1F7] text-slate-900 antialiased"
      style={{
        fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
      >
        <div className="absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-indigo-300/40 blur-3xl" />

        <div className="absolute -right-0 -top-24 h-[380px] w-[380px] rounded-full bg-teal-300/40 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <BotLogo className="h-9 w-9" />

          <span className="text-[15px] font-bold tracking-tight">
            Support Center
          </span>
        </div>

        <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
          <a
            href="#topics"
            className="hidden rounded-lg px-3 py-2 transition hover:bg-white/70 sm:block"
          >
            Help topics
          </a>

          <a
            href="#contact"
            className="hidden rounded-lg px-3 py-2 transition hover:bg-white/70 sm:block"
          >
            Contact
          </a>

          <button
            type="button"
            onClick={() => openBot()}
            className="ml-2 rounded-xl bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Chat with us
          </button>
        </nav>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-24">
        {/* Hero */}
        <section className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              How can we{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">
                help you today?
              </span>
            </h1>

            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
              Our support bot answers questions about payments, orders and
              cancellations instantly. Pick a topic below or open the chat.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => openBot()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                Start chatting
                <Icon name="send" />
              </button>

              <a
                href="#topics"
                className="inline-flex items-center rounded-xl bg-white/70 px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-white backdrop-blur transition hover:bg-white"
              >
                Browse topics
              </a>
            </div>
          </div>

          {/* Bot illustration */}
          <div className="relative mx-auto flex h-72 w-full max-w-md items-center justify-center sm:h-80">
            <div
              aria-hidden="true"
              className="absolute inset-4 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/15 to-teal-400/25 ring-1 ring-white/70"
            />

            <div
              aria-hidden="true"
              className="absolute inset-12 rounded-full bg-white/60 blur-2xl"
            />

            <BotLogo className="relative h-44 w-44 drop-shadow-2xl sm:h-52 sm:w-52" />

            <div className="absolute left-0 top-6 max-w-[11rem] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-xs font-medium text-slate-700 shadow-xl shadow-slate-900/10">
              I was charged twice for my order.
            </div>

            <div className="absolute bottom-6 right-0 max-w-[12rem] rounded-2xl rounded-br-md bg-slate-950 px-4 py-2.5 text-xs font-medium text-white shadow-xl shadow-slate-900/20">
              Found it. Here's how your refund works.
            </div>
          </div>
        </section>

        {/* Topics */}
        <section id="topics" className="scroll-mt-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Popular help topics
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Select one and the bot answers right away.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOPICS.map((topic) => (
              <button
                key={topic.title}
                type="button"
                onClick={() => openBot(topic.ask)}
                className="group flex flex-col rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-teal-400 text-white shadow-md shadow-indigo-500/20">
                  <Icon name={topic.icon} className="h-5 w-5" />
                </span>

                <span className="mt-4 text-[15px] font-bold">
                  {topic.title}
                </span>

                <span className="mt-1 text-sm leading-relaxed text-slate-500">
                  {topic.desc}
                </span>

                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
                  Ask the bot
                  <Icon
                    name="send"
                    className="h-3 w-3 transition group-hover:translate-x-0.5"
                  />
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mt-16 scroll-mt-6">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-8 py-10 text-white sm:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl"
            />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Still need a person?
                </h2>

                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
                  If the bot can't solve it, email us and include your order
                  number. We reply within one business day.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:support@example.com"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
                >
                  <Icon name="mail" />
                  Email support
                </a>

                <button
                  type="button"
                  onClick={() => openBot()}
                  className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/15 transition hover:bg-white/20"
                >
                  Ask the bot first
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <ChatWidget
        open={open}
        setOpen={setOpen}
        pending={pending}
        clearPending={() => setPending(null)}
      />
    </div>
  );
}

export default App;
