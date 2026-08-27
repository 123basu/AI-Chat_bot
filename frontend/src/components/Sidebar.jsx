import { useRef, useEffect } from "react";
import AIAvatar from "./AIAvatar";
import ThemeToggle from "./ThemeToggle";

function groupSessions(sessions) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = { today: [], yesterday: [], older: [] };
  sessions.forEach((s) => {
    const d = new Date(s.created_at);
    if (d >= today) groups.today.push(s);
    else if (d >= yesterday) groups.yesterday.push(s);
    else groups.older.push(s);
  });
  return groups;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  editingId,
  editTitle,
  sidebarOpen,
  themePref,
  onThemeChange,
  onSelectSession,
  onNewChat,
  onDelete,
  onStartRename,
  onEditTitleChange,
  onSubmitRename,
  onRenameKeyDown,
  onClose,
  onLogout,
  onSettingsOpen,
  user,
}) {
  const editRef = useRef(null);

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus();
  }, [editingId]);

  const groups = groupSessions(sessions);
  const groupLabels = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "older", label: "Older" },
  ];

  return (
    <>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <AIAvatar size={24} />
            <span className="sidebar-brand-text">AI made by AI</span>
          </div>
        </div>

        <button className="new-chat-btn" onClick={onNewChat} aria-label="Start new chat">
          <span className="new-chat-icon">+</span>
          <span>New Chat</span>
        </button>

        <div className="sidebar-divider" />

        <div className="sidebar-history">
          {sessions.length === 0 && (
            <div className="sidebar-empty">No conversations yet</div>
          )}
          {groupLabels.map((g) => {
            const items = groups[g.key];
            if (!items || items.length === 0) return null;
            return (
              <div key={g.key} className="history-group">
                <div className="history-group-label">{g.label}</div>
                {items.map((s) => {
                  const isActive = s.session_id === currentSessionId;
                  return (
                    <div
                      key={s.session_id}
                      className={`history-item ${isActive ? "active" : ""}`}
                    >
                      <div
                        className="history-item-main"
                        onClick={() => onSelectSession(s.session_id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`Switch to ${s.title}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") onSelectSession(s.session_id);
                        }}
                      >
                        {editingId === s.session_id ? (
                          <input
                            ref={editRef}
                            className="rename-input"
                            value={editTitle}
                            onChange={(e) => onEditTitleChange(e.target.value)}
                            onBlur={() => onSubmitRename(s.session_id)}
                            onKeyDown={(e) => onRenameKeyDown(e, s.session_id)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Rename conversation"
                          />
                        ) : (
                          <span className="history-title" title={s.title}>
                            {s.title}
                          </span>
                        )}
                      </div>
                      <div className="history-actions">
                        <button
                          className="history-action-btn"
                          title="Rename"
                          aria-label="Rename conversation"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartRename(s);
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                          </svg>
                        </button>
                        <button
                          className="history-action-btn"
                          title="Delete"
                          aria-label="Delete conversation"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(s.session_id);
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-footer">
          <button
            className="sidebar-footer-btn"
            onClick={onSettingsOpen}
            aria-label="Open settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z"/>
            </svg>
            <span>Settings</span>
          </button>

          <div className="sidebar-theme-section">
            <ThemeToggle preference={themePref} onChange={onThemeChange} />
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {(user?.email || "U")[0].toUpperCase()}
            </div>
            <span className="sidebar-user-email" title={user?.email}>{user?.email}</span>
            <button
              className="logout-btn"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}