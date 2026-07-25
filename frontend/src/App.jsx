import { useState, useRef, useEffect } from "react";
import SpidermanAnimation from "./SpidermanAnimation";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const chatEnd = useRef(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        body: JSON.stringify({ message: userMsg.content, session_id: sessionId }),
      });
      const data = await res.json();
      const replyText = res.ok ? data.reply : data.detail || "Server error";
      setMessages((prev) => [...prev, { role: "assistant", content: replyText }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error: Could not reach the server." }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleNewChat() {
    setMessages([]);
    try {
      await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      // session reset on backend is best-effort
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <>
    <SpidermanAnimation />
    <div className="deco-side left">
      <div className="fig color-a"><div className="head" /><div className="body" /></div>
      <div className="fig color-b"><div className="head" /><div className="body" /></div>
      <div className="fig color-c"><div className="head" /><div className="body" /></div>
      <div className="fig color-d"><div className="head" /><div className="body" /></div>
      <div className="fig color-a"><div className="head" /><div className="body" /></div>
    </div>
    <div className="deco-side right">
      <div className="fig color-c"><div className="head" /><div className="body" /></div>
      <div className="fig color-d"><div className="head" /><div className="body" /></div>
      <div className="fig color-a"><div className="head" /><div className="body" /></div>
      <div className="fig color-b"><div className="head" /><div className="body" /></div>
      <div className="fig color-c"><div className="head" /><div className="body" /></div>
    </div>
    <div className="container">
      <div className="header">
        <h1>AI made by AI</h1>
        <button className="new-chat-btn" onClick={handleNewChat}>New Chat</button>
      </div>
      <div className="chat-box">
        {messages.length === 0 && <p className="greeting">Hello!</p>}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            {msg.role === "assistant" ? (
              <div className="reply-box">{msg.content}</div>
            ) : (
              <div className="user-bubble">{msg.content}</div>
            )}
          </div>
        ))}
        {loading && <div className="message assistant"><div className="reply-box thinking">Thinking...</div></div>}
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
    </>
  );
}

export default App;
