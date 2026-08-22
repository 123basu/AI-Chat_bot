import { useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import {
  LogoMark,
  PlusIcon,
  ChatBubbleIcon,
  PencilIcon,
  TrashIcon,
  LogoutIcon,
  CloseIcon,
} from "./icons";

function groupLabel(dateStr) {
  // Normalize "2026-08-22 10:00:00+00" → ISO-parsable form
  const raw = String(dateStr ?? "")
    .trim()
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);
  if (d >= startOfToday) return "Today";
  if (d >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

function groupSessions(sessions) {
  const groups = [];
  const index = new Map();
  for (const s of sessions || []) {
    const label = groupLabel(s.created_at);
    if (!index.has(label)) {
      index.set(label, []);
      groups.push({ label, items: index.get(label) });
    }
    index.get(label).push(s);
  }
  return groups;
}

export default function Sidebar({
  open,
  onClose,
  sessions,
  sessionId,
  onSelectSession,
  onNewChat,
  onDelete,
  editingId,
  editTitle,
  setEditTitle,
  startRename,
  submitRename,
  handleRenameKeyDown,
  editInputRef,
  user,
  onLogout,
  theme,
  setTheme,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const groups = groupSessions(sessions);

  return (
    <>
      <div
        className={`backdrop ${open ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`sidebar ${open ? "open" : ""}`}
        aria-label="Conversations sidebar"
      >
        <div className="sidebar-head">
          <a className="brand" href="/" onClick={(e) => e.preventDefault()}>
            <LogoMark size={26} />
            <span className="brand-name">
              AI made by <span className="grad-text">AI</span>
            </span>
          </a>
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <button type="button" className="new-chat-btn" onClick={onNewChat}>
          <PlusIcon size={17} />
          New Chat
        </button>

        <div className="sidebar-section-label">Recent Chats</div>

        <nav className="history-list" aria-label="Chat history">
          {sessions.length === 0 && (
            <p className="history-empty">No conversations yet. Start a new chat!</p>
          )}
          {groups.map((group) => (
            <div key={group.label} className="history-group">
              <div className="history-group-label">{group.label}</div>
              {group.items.map((s) => {
                const active = s.session_id === sessionId;
                return (
                  <div
                    key={s.session_id}
                    className={`history-item ${active ? "active" : ""}`}
                  >
                    {active && <span className="history-active-dot" aria-hidden="true" />}
                    {editingId === s.session_id ? (
                      <input
                        ref={editInputRef}
                        className="rename-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => submitRename(s.session_id)}
                        onKeyDown={(e) => handleRenameKeyDown(e, s.session_id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Rename conversation"
                      />
                    ) : (
                      <button
                        type="button"
                        className="history-item-main"
                        onClick={() => onSelectSession(s.session_id)}
                        title={s.title}
                        aria-current={active ? "true" : undefined}
                      >
                        <ChatBubbleIcon size={14} className="history-icon" />
                        <span className="history-title">{s.title}</span>
                      </button>
                    )}
                    {editingId !== s.session_id && (
                      <div className="history-actions">
                        <button
                          type="button"
                          className="icon-btn sm"
                          title="Rename"
                          aria-label={`Rename ${s.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(s);
                          }}
                        >
                          <PencilIcon size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn sm danger"
                          title="Delete"
                          aria-label={`Delete ${s.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(s.session_id);
                          }}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <ThemeToggle theme={theme} setTheme={setTheme} />

          <div className="user-block">
            <span className="avatar" aria-hidden="true">
              {(user?.email || "?").charAt(0).toUpperCase()}
            </span>
            <span className="sidebar-email" title={user?.email}>
              {user?.email}
            </span>
            <button
              type="button"
              className="icon-btn logout-btn"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
            >
              <LogoutIcon size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
