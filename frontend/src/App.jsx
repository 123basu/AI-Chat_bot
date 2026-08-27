import { useState, useEffect } from "react";
import useTheme from "./useTheme";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatArea from "./components/ChatArea";
import ChatComposer from "./components/ChatComposer";
import SettingsPanel from "./components/SettingsPanel";
import "./App.css";

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
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [mode, setMode] = useState("chat");
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const { preference: themePref, setTheme: setThemePref } = useTheme();

  useEffect(() => {
    document.getElementById("chat-end")?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (token) loadSessions();
  }, [token]);

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
    setSessionId(crypto.randomUUID());
    setSidebarOpen(false);
  }

  function loadSessions() {
    fetch("/api/sessions", { headers: authHeaders() })
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
    } catch {
      setMessages([]);
    }
  }

  async function handleSend(inputOverride) {
    const msgText = (inputOverride || input).trim();
    if (!msgText) return;
    const userMsg = { role: "user", content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          message: userMsg.content,
          session_id: sessionId,
          mode: mode,
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

  function handleNewChat() {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setSidebarOpen(false);
  }

  async function handleSelectSession(sid) {
    if (sid === sessionId) return;
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
    } catch {}
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
    } catch {}
    setEditingId(null);
  }

  function handleRenameKeyDown(e, sid) {
    if (e.key === "Enter") submitRename(sid);
    if (e.key === "Escape") setEditingId(null);
  }

  function handleSuggestionClick(text) {
    setInput(text);
  }

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="auth-brand-icon">✦</span>
            <h1 className="auth-brand-title">AI made by AI</h1>
            <p className="auth-brand-subtitle">Your intelligent chat assistant</p>
          </div>
          <div className="auth-tabs">
            <button
              className={`auth-tab ${authMode === "login" ? "active" : ""}`}
              onClick={() => { setAuthMode("login"); setAuthError(""); }}
            >
              Log in
            </button>
            <button
              className={`auth-tab ${authMode === "register" ? "active" : ""}`}
              onClick={() => { setAuthMode("register"); setAuthError(""); }}
            >
              Sign up
            </button>
          </div>
          <form className="auth-form" onSubmit={handleAuth}>
            <div className="auth-field">
              <label htmlFor="auth-email" className="auth-label">Email</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="auth-password" className="auth-label">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder={authMode === "register" ? "At least 6 characters" : "Enter your password"}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </div>
            {authError && <p className="auth-error" role="alert">{authError}</p>}
            <button className="auth-submit" type="submit" disabled={authLoading}>
              {authLoading ? (
                <span className="auth-submit-loading">Please wait...</span>
              ) : authMode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        sessions={sessions}
        currentSessionId={sessionId}
        editingId={editingId}
        editTitle={editTitle}
        sidebarOpen={sidebarOpen}
        themePref={themePref}
        onThemeChange={setThemePref}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDelete={handleDelete}
        onStartRename={startRename}
        onEditTitleChange={setEditTitle}
        onSubmitRename={submitRename}
        onRenameKeyDown={handleRenameKeyDown}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        onSettingsOpen={() => setSettingsOpen(true)}
        user={user}
      />

      <div className="main-area">
        <Header
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          mode={mode}
          onModeChange={setMode}
          onSettingsOpen={() => setSettingsOpen(true)}
          themePref={themePref}
          onThemeChange={setThemePref}
        />

        <ChatArea
          messages={messages}
          loading={loading}
          mode={mode}
          onSend={handleSuggestionClick}
        />

        <ChatComposer
          input={input}
          onInputChange={setInput}
          onSend={() => handleSend()}
          loading={loading}
          mode={mode}
        />
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        themePref={themePref}
        onThemeChange={setThemePref}
        mode={mode}
        onModeChange={setMode}
      />
    </div>
  );
}

export default App;