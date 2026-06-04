import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, RefreshCw, LogOut, Users, Eye, FileText, Calendar, Clock, X, Send, BookOpen } from 'lucide-react';

export function AdminDashboardModal({ onClose }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState(null);

  // Tab selector: 'analytics' or 'newsletter'
  const [activeTab, setActiveTab] = useState('analytics');

  // Newsletter Composer Form States
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSubtitle, setNewsSubtitle] = useState('');
  const [newsThumbnail, setNewsThumbnail] = useState('scale');
  const [newsContent, setNewsContent] = useState('');
  const [newsAudience, setNewsAudience] = useState('all');
  
  const [publishSuccess, setPublishSuccess] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Check if admin is already logged in for this browser session
  useEffect(() => {
    const sessionToken = sessionStorage.getItem('midlex_admin_session');
    if (sessionToken === 'authenticated') {
      setIsAuthenticated(true);
      fetchStats();
    }
  }, []);

  const fetchStats = async () => {
    setIsSubmitting(true);
    setError('');
    setPublishSuccess('');
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'midlexllp01@gmail.com', password: 'Admin@123' })
      });

      if (!response.ok) {
        throw new Error('Failed to load analytics statistics.');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (email.trim() === '' || password.trim() === '') {
      setError('Please fill in both Email and Password fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Authentication failed. Please verify credentials.');
      }

      const data = await response.json();
      setStats(data.stats);
      setIsAuthenticated(true);
      sessionStorage.setItem('midlex_admin_session', 'authenticated');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishNewsletter = async (e) => {
    e.preventDefault();
    if (newsTitle.trim() === '' || newsContent.trim() === '') {
      setError('Title and Content body are required to publish.');
      return;
    }

    setIsPublishing(true);
    setError('');
    setPublishSuccess('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/admin/publish-article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'midlexllp01@gmail.com',
          password: 'Admin@123',
          title: newsTitle,
          subtitle: newsSubtitle,
          thumbnail: newsThumbnail,
          content: newsContent,
          audience: newsAudience
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to publish article.');
      }

      const data = await response.json();
      setPublishSuccess(`🎉 Article published successfully and email simulation dispatched to ${data.recipientsCount} client(s)!`);
      
      // Clear form
      setNewsTitle('');
      setNewsSubtitle('');
      setNewsContent('');
      setNewsThumbnail('scale');
      setNewsAudience('all');

      // Refresh Stats history
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('midlex_admin_session');
    setIsAuthenticated(false);
    setStats(null);
    setEmail('');
    setPassword('');
  };

  const formatTimestamp = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal admin-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {!isAuthenticated ? (
          // LOGIN FORM VIEW
          <div className="admin-login-view">
            <div className="brand" style={{ justifyContent: 'center', marginBottom: '16px' }}>
              <ShieldCheck size={40} style={{ color: 'var(--gold-primary)' }} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', textTransform: 'capitalize', textAlign: 'center', marginBottom: '8px' }}>
              Midlex Admin Desk
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '20px' }}>
              Enter your law firm administrator credentials to unlock visitor statistics.
            </p>

            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                marginBottom: '16px',
                lineHeight: '1.4'
              }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Admin Email</label>
                <input 
                  type="email" 
                  className="chat-input"
                  style={{ borderRadius: '6px', height: '38px', padding: '0 12px', fontSize: '0.85rem' }}
                  placeholder="midlexllp01@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Password</label>
                <input 
                  type="password" 
                  className="chat-input"
                  style={{ borderRadius: '6px', height: '38px', padding: '0 12px', fontSize: '0.85rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <button 
                type="submit" 
                className="google-signin-btn" 
                style={{ 
                  marginTop: '12px', 
                  backgroundColor: 'var(--gold-primary)', 
                  border: 'none', 
                  color: 'black', 
                  fontWeight: '600',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Access Dashboard</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          // DASHBOARD PORTAL
          <div className="admin-dashboard-view">
            <header className="dashboard-header" style={{ marginBottom: '10px', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={24} style={{ color: 'var(--gold-primary)' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', color: 'var(--text-primary)' }}>
                  Admin Dashboard
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button 
                  className="btn-secondary" 
                  onClick={fetchStats}
                  disabled={isSubmitting}
                  style={{ padding: '8px 12px', fontSize: '0.78rem', height: '32px' }}
                  title="Refresh stats"
                >
                  <RefreshCw size={14} className={isSubmitting ? 'spin-anim' : ''} />
                  <span>Refresh</span>
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={handleLogout}
                  style={{ padding: '8px 12px', fontSize: '0.78rem', height: '32px', borderColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                  title="Sign out"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </header>

            {/* TAB SELECTOR */}
            <div style={{
              display: 'flex',
              gap: '12px',
              borderBottom: '1px solid var(--border-light)',
              marginBottom: '20px',
              paddingBottom: '2px'
            }}>
              <button 
                onClick={() => setActiveTab('analytics')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'analytics' ? '2px solid var(--gold-primary)' : '2px solid transparent',
                  color: activeTab === 'analytics' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  fontWeight: activeTab === 'analytics' ? '600' : '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                Analytics &amp; Usage
              </button>
              <button 
                onClick={() => setActiveTab('newsletter')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'newsletter' ? '2px solid var(--gold-primary)' : '2px solid transparent',
                  color: activeTab === 'newsletter' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  fontWeight: activeTab === 'newsletter' ? '600' : '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                Newsletter Desk
              </button>
            </div>

            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                marginBottom: '16px'
              }}>
                ⚠️ Error: {error}
              </div>
            )}

            {publishSuccess && (
              <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                color: '#4ade80',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                marginBottom: '16px'
              }}>
                {publishSuccess}
              </div>
            )}

            {!stats ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                <div className="typing-dots" style={{ marginBottom: '16px' }}>
                  <span></span><span></span><span></span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Calculating law desk analytics metrics...</p>
              </div>
            ) : activeTab === 'analytics' ? (
              // TAB 1: ANALYTICS VIEW
              <div className="dashboard-content">
                {/* Stat cards */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon-box" style={{ backgroundColor: 'rgba(212,175,55,0.08)', color: 'var(--gold-primary)' }}>
                      <Users size={20} />
                    </div>
                    <div className="stat-details">
                      <span className="stat-num">{stats.registeredCount}</span>
                      <span className="stat-label">Registered Clients</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon-box" style={{ backgroundColor: 'rgba(34,197,94,0.08)', color: '#4ade80' }}>
                      <Clock size={20} />
                    </div>
                    <div className="stat-details">
                      <span className="stat-num">{stats.visitsToday}</span>
                      <span className="stat-label">Visits Today</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon-box" style={{ backgroundColor: 'rgba(59,130,246,0.08)', color: '#60a5fa' }}>
                      <Calendar size={20} />
                    </div>
                    <div className="stat-details">
                      <span className="stat-num">{stats.visitsThisWeek}</span>
                      <span className="stat-label">Visits This Week</span>
                    </div>
                  </div>

                  <div className="stat-card">
                    <div className="stat-icon-box" style={{ backgroundColor: 'rgba(168,85,247,0.08)', color: '#c084fc' }}>
                      <Eye size={20} />
                    </div>
                    <div className="stat-details">
                      <span className="stat-num">{stats.visitsThisMonth}</span>
                      <span className="stat-label">Visits This Month</span>
                    </div>
                  </div>
                </div>

                {/* Analytical Columns */}
                <div className="stats-columns-layout">
                  {/* Left Column: Top Questions */}
                  <div className="dashboard-subpanel">
                    <div className="subpanel-header">
                      <FileText size={16} style={{ color: 'var(--gold-primary)' }} />
                      <h4>Top Questions Asked</h4>
                    </div>
                    <div className="subpanel-body">
                      {stats.topQuestions.length === 0 ? (
                        <p className="no-data-text">No queries logged in the analytics dataset yet.</p>
                      ) : (
                        <div className="top-questions-list">
                          {stats.topQuestions.map((q, index) => {
                            const maxCount = stats.topQuestions[0]?.count || 1;
                            const pct = (q.count / maxCount) * 100;
                            return (
                              <div key={index} className="question-bar-item">
                                <div className="question-text-row">
                                  <span className="question-title-text">"{q.text}"</span>
                                  <span className="question-badge">{q.count} query</span>
                                </div>
                                <div className="progress-bar-bg">
                                  <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Recent Client Logins */}
                  <div className="dashboard-subpanel">
                    <div className="subpanel-header">
                      <Users size={16} style={{ color: 'var(--gold-primary)' }} />
                      <h4>Recent Client Logins</h4>
                    </div>
                    <div className="subpanel-body" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {stats.registrations.length === 0 ? (
                        <p className="no-data-text">No user sign-in registrations recorded.</p>
                      ) : (
                        <table className="clients-table">
                          <thead>
                            <tr>
                              <th>Client Email</th>
                              <th>Sign-In Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.registrations.map((reg, index) => (
                              <tr key={index}>
                                <td className="email-cell">{reg.email} {reg.subscribed && <span title="Newsletter Opt-in" style={{ cursor: 'help' }}>🔔</span>}</td>
                                <td className="time-cell">{formatTimestamp(reg.timestamp)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // TAB 2: NEWSLETTER DESK VIEW
              <div className="dashboard-content newsletter-desk-content">
                <div className="newsletter-split-layout">
                  {/* Left Column Form */}
                  <form onSubmit={handlePublishNewsletter} className="newsletter-composer-form">
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '14px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Send size={16} style={{ color: 'var(--gold-primary)' }} />
                      <span>Compose Legal Article</span>
                    </h4>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label">Article Title</label>
                        <input 
                          type="text" 
                          className="chat-input"
                          placeholder="e.g. Tenancy Act Rights in Nigeria"
                          value={newsTitle}
                          onChange={(e) => setNewsTitle(e.target.value)}
                          disabled={isPublishing}
                          style={{ borderRadius: '6px', fontSize: '0.82rem', height: '36px', padding: '0 12px' }}
                        />
                      </div>
                      
                      <div style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label">Thumbnail Preset</label>
                        <select 
                          className="chat-input"
                          value={newsThumbnail}
                          onChange={(e) => setNewsThumbnail(e.target.value)}
                          disabled={isPublishing}
                          style={{ borderRadius: '6px', fontSize: '0.82rem', height: '36px', padding: '0 8px', backgroundColor: 'var(--bg-secondary)' }}
                        >
                          <option value="scale">Justice Scales</option>
                          <option value="property">Real Estate / Land</option>
                          <option value="rights">Human Rights</option>
                          <option value="electoral">Electoral / BVAS</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                      <label className="form-label">Subtitle / Excerpt</label>
                      <input 
                        type="text" 
                        className="chat-input"
                        placeholder="A brief 1-sentence summary of what this article explains..."
                        value={newsSubtitle}
                        onChange={(e) => setNewsSubtitle(e.target.value)}
                        disabled={isPublishing}
                        style={{ borderRadius: '6px', fontSize: '0.82rem', height: '36px', padding: '0 12px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label">Article Content Body (supports lists &amp; headings)</label>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Use # headings, - bullets</span>
                      </div>
                      <textarea 
                        className="chat-input"
                        placeholder="Enter the full article body here. Support line breaks..."
                        value={newsContent}
                        onChange={(e) => setNewsContent(e.target.value)}
                        disabled={isPublishing}
                        rows={6}
                        style={{ borderRadius: '6px', fontSize: '0.82rem', padding: '10px 12px', resize: 'none', height: '140px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span className="form-label" style={{ marginBottom: 0 }}>Target Audience:</span>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="audience" 
                            value="all" 
                            checked={newsAudience === 'all'}
                            onChange={() => setNewsAudience('all')}
                            disabled={isPublishing}
                          />
                          <span>All Clients</span>
                        </label>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="audience" 
                            value="subscribed" 
                            checked={newsAudience === 'subscribed'}
                            onChange={() => setNewsAudience('subscribed')}
                            disabled={isPublishing}
                          />
                          <span>Subscribed Only 🔔</span>
                        </label>
                      </div>

                      <button 
                        type="submit" 
                        className="google-signin-btn" 
                        style={{ 
                          width: '180px', 
                          margin: 0, 
                          backgroundColor: 'var(--gold-primary)', 
                          border: 'none', 
                          color: 'black', 
                          fontWeight: '600',
                          fontSize: '0.85rem',
                          height: '38px',
                          gap: '6px'
                        }}
                        disabled={isPublishing}
                      >
                        {isPublishing ? (
                          <div className="typing-dots">
                            <span></span><span></span><span></span>
                          </div>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>Publish &amp; Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Right Column History */}
                  <div className="newsletter-history-panel">
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '14px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={16} style={{ color: 'var(--gold-primary)' }} />
                      <span>Published Newsletter Logs</span>
                    </h4>
                    
                    <div className="newsletter-history-list">
                      {!stats.articles || stats.articles.length === 0 ? (
                        <p className="no-data-text" style={{ marginTop: '60px' }}>No articles published yet.</p>
                      ) : (
                        stats.articles.map((art) => (
                          <div key={art.id} className="news-log-card">
                            <div className="news-log-meta">
                              <span className="log-badge">{art.thumbnail}</span>
                              <span className="log-date">{formatTimestamp(art.timestamp)}</span>
                            </div>
                            <h5 className="news-log-title">{art.title}</h5>
                            <p className="news-log-excerpt">{art.subtitle}</p>
                            <div className="news-log-footer">
                              <span>Recipient Target: <strong>{art.audience === 'all' ? 'All Clients' : 'Subscribers Only'}</strong></span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
