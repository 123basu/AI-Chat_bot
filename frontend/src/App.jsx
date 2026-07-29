import { useState, useRef, useEffect } from "react";
import "./App.css";

function App() {
  const [userId] = useState(() => {
    let id = localStorage.getItem("ai-chat-user-id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ai-chat-user-id", id);
    }
    return id;
  });

  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const chatEnd = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function loadSessions() {
    fetch(`/api/sessions/${userId}`)
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => {});
  }

  async function loadMessages(sid) {
    try {
      const res = await fetch(`/api/chat/${sid}/messages`);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          session_id: sessionId,
          user_id: userId,
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
  }

  async function handleSelectSession(sid) {
    if (sid === sessionId) return;
    setSessionId(sid);
    await loadMessages(sid);
  }

  async function handleDelete(sid) {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await fetch(`/api/chat/${sid}`, { method: "DELETE" });
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
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
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
