import { useState, useRef, useEffect } from "react";
import "./App.css";
import { useTheme } from "./hooks/useTheme";
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatArea from "./components/ChatArea";
import ChatComposer from "./components/ChatComposer";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("ai-chat-token"));

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ai-chat-user") || "null");
    } catch {
      return null;
    }
  });

  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth > 768
  );
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [feedback, setFeedback] = useState({});
  const chatEnd = useRef(null);
  const editInputRef = useRef(null);
  const composerRef = useRef(null);

  const { theme, setTheme } = useTheme();

  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (token) loadSessions();
  }, [token]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function authHeaders(extra = {}) {
    if (!token) return extra;
    return { ...extra, Authorization: `Bearer ${token}` };
  }

  function finishAuth(data) {
    localStorage.setItem("ai-chat-token", data.token);
    localStorage.setItem("ai-chat-user", JSON.stringify({ id: data.user_id, email: data.email }));
    setToken(data.token);
    setUser({ id: data.user_id, email: data.email });
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setFeedback({});
    setAuthError("");
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError("");
    if (!authEmail.trim() || !authPassword) return;
    setAuthLoading(true);
    try {
      const res = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      if (!res.ok) {
        setAuthError(data.detail || `Request failed (HTTP ${res.status})`);
        return;
      }
      finishAuth(data);
      setAuthEmail("");
      setAuthPassword("");
    } catch {
      setAuthError("Error: Could not reach the server.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
    } catch {}
    localStorage.removeItem("ai-chat-token");
    localStorage.removeItem("ai-chat-user");
    setToken(null);
    setUser(null);
    setSessions([]);
    setMessages([]);
    setFeedback({});
    setSessionId(crypto.randomUUID());
  }

  function loadSessions() {
    fetch(`/api/sessions`, { headers: authHeaders() })
      .then((r) => r.text())
      .then((text) => {
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch {}
        setSessions(data.sessions || []);
      })
      .catch(() => {});
  }

  async function loadMessages(sid) {
    try {
      const res = await fetch(`/api/chat/${sid}/messages`, { headers: authHeaders() });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      setMessages(data.messages || []);
      setFeedback({});
    } catch {
      setMessages([]);
    }
  }

  async function sendMessage(content) {
    if (!content.trim()) return;
    const userMsg = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setHistoryIndex(-1);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          message: userMsg.content,
          session_id: sessionId,
        }),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch {}
      const replyText = res.ok
        ? data.reply || "No reply"
        : data.detail || `Server error (HTTP ${res.status})`;
      setMessages((prev) => [...prev, { role: "assistant", content: replyText }]);
      loadSessions();
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error: Could not reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    if (!input.trim()) return;
    sendMessage(input);
  }

  function handleRegenerate() {
    if (loading) return;
    const userMsgs = messages.filter((m) => m.role === "user");
    const last = userMsgs[userMsgs.length - 1];
    if (!last) return;
    sendMessage(last.content);
  }

  function handleFeedback(index, value) {
    setFeedback((prev) => ({ ...prev, [index]: value }));
  }

  function handleSuggestion(prompt) {
    setInput(prompt);
    composerRef.current?.focus();
  }

  function handleNewChat() {
    setMessages([]);
    setFeedback({});
    setSessionId(crypto.randomUUID());
    setSidebarOpen(false);
  }

  async function handleSelectSession(sid) {
    if (sid === sessionId) {
      setSidebarOpen(false);
      return;
    }
    setSessionId(sid);
    await loadMessages(sid);
    setSidebarOpen(false);
  }

  async function handleDelete(sid) {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await fetch(`/api/chat/${sid}`, { method: "DELETE", headers: authHeaders() });
      if (sid === sessionId) {
        setSessionId(crypto.randomUUID());
        setMessages([]);
      }
      loadSessions();
    } catch {
      // best-effort
    }
  }

  function startRename(s) {
    setEditingId(s.session_id);
    setEditTitle(s.title);
  }

  async function submitRename(sid) {
    const title = editTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    try {
      await fetch(`/api/chat/${sid}/rename`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ title }),
      });
      loadSessions();
    } catch {
      // best-effort
    }
    setEditingId(null);
  }

  function handleRenameKeyDown(e, sid) {
    if (e.key === "Enter") submitRename(sid);
    if (e.key === "Escape") setEditingId(null);
  }

  function handleComposerKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Arrow-up/down recall of previous prompts — only when the caret sits at
    // the very start/end so multiline caret movement still works naturally.
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;

    if (e.key === "ArrowUp" && atStart) {
      const userMsgs = messages.filter((m) => m.role === "user");
      if (userMsgs.length === 0) return;
      e.preventDefault();
      const next = historyIndex === -1 ? userMsgs.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(userMsgs[next].content);
    } else if (e.key === "ArrowDown" && atEnd) {
      if (historyIndex === -1) return;
      e.preventDefault();
      const userMsgs = messages.filter((m) => m.role === "user");
      if (historyIndex >= userMsgs.length - 1) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        const next = historyIndex + 1;
        setHistoryIndex(next);
        setInput(userMsgs[next].content);
      }
    }
  }

  if (!token) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authError={authError}
        authLoading={authLoading}
        handleAuth={handleAuth}
      />
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        sessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
        editingId={editingId}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        startRename={startRename}
        submitRename={submitRename}
        handleRenameKeyDown={handleRenameKeyDown}
        editInputRef={editInputRef}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
      />

      <div className="main-area">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          theme={theme}
          setTheme={setTheme}
        />

        <ChatArea
          messages={messages}
          loading={loading}
          chatEndRef={chatEnd}
          onSuggestion={handleSuggestion}
          feedback={feedback}
          onFeedback={handleFeedback}
          onRegenerate={handleRegenerate}
        />

        <ChatComposer
          input={input}
          setInput={(value) => {
            setInput(value);
            setHistoryIndex(-1);
          }}
          onSend={handleSend}
          onKeyDown={handleComposerKeyDown}
          loading={loading}
          inputRef={composerRef}
        />
      </div>
    </div>
  );
}

export default App;
