import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useChatSocket } from "../hooks/useSocket";
import { apiJson } from "../lib/api";
import { Btn, Card, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function ChatPage() {
  const { user } = useAuth();
  const [cid, setCid]       = useState(null);
  const [peer, setPeer]     = useState("");
  const [bookId, setBookId] = useState("");
  const [draft, setDraft]   = useState("");
  const bottomRef           = useRef(null);
  const qc                  = useQueryClient();

  const convs = useQuery({
    queryKey: ["conversations"],
    queryFn: () => apiJson("/api/conversations"),
    enabled: !!user,
  });

  const msgs = useQuery({
    queryKey: ["messages", cid],
    queryFn: () => apiJson(`/api/conversations/${cid}/messages`),
    enabled: !!user && !!cid,
  });

  const { connected, lastMsg, send } = useChatSocket(cid);

  useEffect(() => {
    if (!lastMsg || typeof lastMsg.id !== "string") return;
    qc.invalidateQueries({ queryKey: ["messages", cid] });
  }, [lastMsg, cid, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.data]);

  const start = async () => {
    if (!peer.trim()) return;
    const r = await apiJson("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ peer_user_id: peer.trim(), book_id: bookId.trim() || undefined }),
    });
    setCid(r.id);
    qc.invalidateQueries({ queryKey: ["conversations"] });
  };

  const sendMsg = () => {
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="flex justify-center animate-float">
          <div className="relative w-56 h-56">
            <div className="absolute inset-0 rounded-full bg-primary-200 opacity-40 blur-3xl" />
            <svg viewBox="0 0 220 220" className="relative drop-shadow-xl" fill="none">
              <rect x="30" y="50" width="160" height="110" rx="16" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2"/>
              <rect x="50" y="75"  width="80" height="12" rx="6" fill="#bfdbfe"/>
              <rect x="50" y="95"  width="60" height="12" rx="6" fill="#dbeafe"/>
              <rect x="50" y="115" width="70" height="12" rx="6" fill="#bfdbfe"/>
              <rect x="110" y="160" width="40" height="30" rx="8" fill="#2563eb"/>
              <circle cx="175" cy="55" r="8" fill="#38bdf8" opacity=".7"/>
            </svg>
          </div>
        </div>
        <div className="animate-fade-up text-center lg:text-left">
          <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 mb-3">
            💬 Messaging
          </span>
          <h1 className="text-3xl font-extrabold text-primary-900">Real-time Chat</h1>
          <p className="mt-2 text-primary-500">Chat with buyers and sellers instantly.</p>
          <Link to="/dashboard" className="mt-6 inline-block rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white shadow hover:bg-primary-700 transition">
            Sign in to chat →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 animate-fade-up">
        <span className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 mb-2">
          💬 Messaging
        </span>
        <h1 className="text-2xl font-extrabold text-primary-900">Real-time Chat</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 animate-fade-up" style={{ animationDelay: "100ms" }}>

        {/* Sidebar */}
        <Card className="p-4 flex flex-col gap-3">
          <h3 className="font-bold text-primary-900">Conversations</h3>
          <Input placeholder="Peer user ObjectId" value={peer} onChange={e => setPeer(e.target.value)} />
          <Input placeholder="Optional book ObjectId" value={bookId} onChange={e => setBookId(e.target.value)} />
          <Btn variant="primary" className="w-full" onClick={start}>Start / open thread</Btn>

          <div className="flex-1 overflow-y-auto max-h-64 space-y-1 mt-1">
            {convs.data?.length === 0 && (
              <p className="text-xs text-primary-300 text-center py-4">No conversations yet</p>
            )}
            {convs.data?.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => setCid(c._id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-xs font-mono transition ${
                  cid === c._id
                    ? "bg-primary-600 text-white"
                    : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                }`}
              >
                {c._id.slice(0, 12)}…
              </button>
            ))}
          </div>
        </Card>

        {/* Thread */}
        <Card className="lg:col-span-2 flex flex-col" style={{ minHeight: "480px" }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-primary-50 px-5 py-3">
            <h3 className="font-bold text-primary-900">
              {cid ? `Thread · ${cid.slice(0, 8)}…` : "Select a conversation"}
            </h3>
            <span className={`flex items-center gap-1.5 text-xs font-medium ${connected ? "text-green-500" : "text-primary-300"}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-primary-200"}`} />
              {connected ? "Live" : "REST only"}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {!cid && (
              <div className="flex h-full items-center justify-center text-primary-200 text-sm">
                Select or start a conversation
              </div>
            )}
            {msgs.data?.map((m) => (
              <div key={m._id} className="flex flex-col max-w-xs">
                <span className="text-xs text-primary-300 mb-0.5">{m.sender_id.slice(0, 8)}…</span>
                <div className="rounded-2xl rounded-tl-sm bg-primary-50 border border-primary-100 px-4 py-2 text-sm text-primary-900">
                  {m.body}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-primary-50 px-4 py-3 flex gap-2">
            <Input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={cid ? "Type a message…" : "Select a conversation first"}
              disabled={!cid}
              onKeyDown={e => e.key === "Enter" && sendMsg()}
            />
            <Btn variant="primary" onClick={sendMsg} disabled={!cid || !draft.trim()}>
              Send
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}
