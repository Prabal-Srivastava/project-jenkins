import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// Read session_id from cookie (set by server as HttpOnly — not accessible via JS)
// Instead we pass a flag and let the server validate via the cookie directly.
// For socket.io auth, we use a dedicated endpoint to get a short-lived socket token.

export function useChatSocket(conversationId) {
  const [connected, setConnected] = useState(false);
  const [lastMsg, setLastMsg] = useState(null);
  const socketRef = useRef(null);
  const [sessionId, setSessionId] = useState(null);

  // Fetch a socket session token from the server (reads the HttpOnly cookie server-side)
  useEffect(() => {
    fetch("/api/auth/socket-token", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.socket_token && setSessionId(d.socket_token))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId || !conversationId) return undefined;

    const socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { session_id: sessionId },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join_conversation", { session_id: sessionId, conversation_id: conversationId });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat_message", (payload) => setLastMsg(payload));
    socket.on("error", (e) => console.warn("socket error", e));

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [conversationId, sessionId]);

  const send = (body) => {
    const socket = socketRef.current;
    if (!sessionId || !conversationId || !socket) return;
    socket.emit("chat_message", { session_id: sessionId, conversation_id: conversationId, body });
  };

  return { connected, lastMsg, send };
}
