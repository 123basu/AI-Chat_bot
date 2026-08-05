import { useState, useRef, useEffect } from "react";
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
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const chatEnd = useRef(null);
  const editInputRef = useRef(null);

  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || "Request failed");
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
  }

  function loadSessions() {
    fetch(`/api/sessions`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => {});
  }

  async function loadMessages(sid) {
    try {
      const res = await fetch(`/api/chat/${sid}/messages`, { headers: authHeaders() });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      setMessages([]);
    }
  }

  async function handleSend() {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
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
        }),
      });
      const data = await res.json();
      const replyText = res.ok ? data.reply : data.detail || "Server error";
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

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSend();
  }

  if (!token) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>AI made by AI</h1>
          <div className="auth-tabs">
            <button
              className={`auth-tab ${authMode === "login" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
            >
              Log in
            </button>
            <button
              className={`auth-tab ${authMode === "register" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
            >
              Sign up
            </button>
          </div>
          <form className="auth-form" onSubmit={handleAuth}>
            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
            {authError && <p className="auth-error">{authError}</p>}
            <button className="auth-submit" type="submit" disabled={authLoading}>
              {authLoading ? "Please wait..." : authMode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-user">
          <span className="sidebar-email" title={user?.email}>{user?.email}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <button className="new-chat-btn" onClick={handleNewChat}>
          + New Chat
        </button>
        <div className="history-list">
          {sessions.map((s) => (
            <div
              key={s.session_id}
              className={`history-item ${s.session_id === sessionId ? "active" : ""}`}
            >
              <div
                className="history-item-main"
                onClick={() => handleSelectSession(s.session_id)}
              >
                {editingId === s.session_id ? (
                  <input
                    ref={editInputRef}
                    className="rename-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => submitRename(s.session_id)}
                    onKeyDown={(e) => handleRenameKeyDown(e, s.session_id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="history-title">{s.title}</span>
                )}
              </div>
              <div className="history-actions">
                <button
                  className="action-btn"
                  title="Rename"
                  onClick={(e) => {
                    e.stopPropagation();
                    startRename(s);
                  }}
                >
                  ✏️
                </button>
                <button
                  className="action-btn"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(s.session_id);
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="main-area">
        <header className="top-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <h1>AI made by AI</h1>
          <div className="header-spacer" />
        </header>

        <div className="chat-box">
          {messages.length === 0 && <p className="greeting">Hello!</p>}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className={`bubble ${msg.role}`}>{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="bubble assistant thinking">Thinking...</div>
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        <div className="input-row">
          <input
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSend} disabled={loading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
