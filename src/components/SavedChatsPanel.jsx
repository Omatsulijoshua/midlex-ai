import React from 'react';
import { MessageSquare, Plus, Trash2, History, Lock } from 'lucide-react';

export function SavedChatsPanel({ 
  chats = [], 
  activeChatId, 
  onSelectChat, 
  onCreateNewChat, 
  onDeleteChat, 
  currentUser,
  onAdminClick
}) {
  return (
    <aside className="history-panel" aria-label="Chat history">
      {/* Top action button */}
      <div className="history-header">
        <button className="new-chat-btn" onClick={onCreateNewChat}>
          <Plus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      {/* History List */}
      <div className="history-scroll">
        <div className="history-title-row">
          <History size={14} style={{ color: 'var(--gold-primary)' }} />
          <span>Saved Conversations</span>
        </div>

        {!currentUser ? (
          // Guest status prompt
          <div className="guest-history-prompt">
            <Lock size={20} style={{ color: 'var(--gold-primary)', opacity: 0.6, marginBottom: '8px' }} />
            <p className="guest-prompt-title">Guest Mode</p>
            <p className="guest-prompt-desc">
              Sign in with Google in the top-right to save your chats permanently across sessions.
            </p>
          </div>
        ) : chats.length === 0 ? (
          // Empty history prompt for logged in user
          <div className="empty-history-prompt">
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No conversations yet.</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '180px' }}>
              Your future chats will show up here automatically.
            </p>
          </div>
        ) : (
          <div className="history-list">
            {chats.map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <div 
                  key={chat.id} 
                  className={`history-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectChat(chat.id)}
                >
                  <MessageSquare size={14} className="chat-icon" />
                  <span className="chat-title">{chat.title || 'New Conversation'}</span>
                  <button 
                    className="delete-chat-btn"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent choosing the chat when deleting it
                      if (confirm('Are you sure you want to delete this conversation?')) {
                        onDeleteChat(chat.id);
                      }
                    }}
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="sources-footer" style={{ flexDirection: 'column', gap: '14px', padding: '24px 20px' }}>
        <a href="https://midlex-llp.vercel.app/" target="_blank" rel="noopener noreferrer" className="footer-link">
          <img src="/midlex_logo.png" alt="Midlex Logo" className="footer-logo" />
          <span>Powered by Midlex LLP</span>
        </a>
        
        <button 
          className="admin-link-btn" 
          onClick={onAdminClick}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.7rem',
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'none',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            transition: 'var(--transition-smooth)',
            marginTop: '4px'
          }}
          onMouseOver={(e) => e.target.style.color = 'var(--gold-primary)'}
          onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
        >
          🔑 Admin Desk
        </button>
      </div>
    </aside>
  );
}
