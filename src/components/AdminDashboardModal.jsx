import { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, RefreshCw, LogOut, Users, Eye, EyeOff, FileText, Calendar, Clock, X, Send, BookOpen, Search, Tags, Bot, Key, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchWithTimeout, getApiUrl, getApiEndpoint } from '../utils/api';

export function AdminDashboardModal({ onClose }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('midlex_admin_session') === 'authenticated';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stats, setStats] = useState(null);

  // Tab selector: 'analytics', 'newsletter', or 'ai'
  const [activeTab, setActiveTab] = useState('analytics');
  const [aiProvider, setAiProvider] = useState(() => {
    const savedProvider = localStorage.getItem('midlex_ai_provider') || 'auto';
    return ['auto', 'gemini', 'openai', 'groq'].includes(savedProvider) ? savedProvider : 'auto';
  });
  const [fallbackProvider, setFallbackProvider] = useState(() => {
    const savedFallback = localStorage.getItem('midlex_ai_fallback_provider') || 'groq';
    return ['groq', 'gemini', 'openai', 'none'].includes(savedFallback) ? savedFallback : 'groq';
  });
  const [geminiKey, setGeminiKey] = useState(() => {
    return localStorage.getItem('midlex_ai_gemini_key') || '';
  });
  const [groqKey, setGroqKey] = useState(() => {
    return localStorage.getItem('midlex_ai_groq_key') || '';
  });
  const [openaiKey, setOpenaiKey] = useState(() => {
    return localStorage.getItem('midlex_ai_openai_key') || '';
  });

  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestFeedback, setAiTestFeedback] = useState(null);
  const [isSavingAi, setIsSavingAi] = useState(false);

  // Newsletter Composer Form States
  const [newsTitle, setNewsTitle] = useState('');
  const [newsSubtitle, setNewsSubtitle] = useState('');
  const [newsThumbnail, setNewsThumbnail] = useState('scale');
  const [newsContent, setNewsContent] = useState('');
  const [newsAudience, setNewsAudience] = useState('all');
  
  const [publishSuccess, setPublishSuccess] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Fetch stats if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  async function fetchStats() {
    setIsSubmitting(true);
    setError('');
    setPublishSuccess('');
    try {
      const API_URL = getApiUrl();
      if (!API_URL) {
        throw new Error('Admin backend is unavailable until the production API URL is configured.');
      }

      const response = await fetchWithTimeout(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'midlexllp01@gmail.com', password: 'Admin@123' })
      }, 10000);

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
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (email.trim() === '' || password.trim() === '') {
      setError('Please fill in both Email and Password fields.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const API_URL = getApiUrl();
      if (!API_URL) {
        throw new Error('Admin backend is unavailable until the production API URL is configured.');
      }

      const response = await fetchWithTimeout(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      }, 10000);

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
      const API_URL = getApiUrl();
      if (!API_URL) {
        throw new Error('Newsletter backend is unavailable until the production API URL is configured.');
      }

      const response = await fetchWithTimeout(`${API_URL}/api/admin/publish-article`, {
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
      }, 15000);

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

  const handleSaveAiSettings = async () => {
    setIsSavingAi(true);
    setPublishSuccess('');
    setError('');
    setAiTestFeedback(null);

    const safeProvider = aiProvider;
    const safeFallback = fallbackProvider;
    const safeGeminiKey = geminiKey.trim();
    const safeGroqKey = groqKey.trim();
    const safeOpenaiKey = openaiKey.trim();

    localStorage.setItem('midlex_ai_provider', safeProvider);
    localStorage.setItem('midlex_ai_fallback_provider', safeFallback);
    localStorage.setItem('midlex_ai_gemini_key', safeGeminiKey);
    localStorage.setItem('midlex_ai_groq_key', safeGroqKey);
    localStorage.setItem('midlex_ai_openai_key', safeOpenaiKey);

    window.dispatchEvent(new Event('midlex-ai-provider-change'));

    // Attempt to sync to backend if backend server is available
    try {
      const API_URL = getApiUrl();
      if (API_URL) {
        await fetchWithTimeout(`${API_URL}/api/admin/ai-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'midlexllp01@gmail.com',
            password: 'Admin@123',
            aiProvider: safeProvider,
            fallbackProvider: safeFallback,
            geminiApiKey: safeGeminiKey,
            groqApiKey: safeGroqKey,
            openaiApiKey: safeOpenaiKey
          })
        }, 6000);
      }
    } catch (err) {
      console.warn('Backend AI settings sync note:', err.message);
    } finally {
      setIsSavingAi(false);
    }

    setPublishSuccess('AI configuration saved! Gemini primary & Groq fallback settings are now live.');
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    setAiTestFeedback(null);
    setError('');
    setPublishSuccess('');

    try {
      const chatApiUrl = getApiEndpoint('/api/chat');
      const testStart = Date.now();
      const response = await fetchWithTimeout(chatApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Status check. Reply briefly confirming Nigerian legal desk readiness.',
          aiProvider,
          fallbackProvider,
          customKeys: {
            geminiApiKey: geminiKey.trim(),
            groqApiKey: groqKey.trim(),
            openaiApiKey: openaiKey.trim()
          }
        })
      }, 15000);

      const elapsed = Date.now() - testStart;

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error status ${response.status}`);
      }

      const data = await response.json();
      const engineUsed = (data.provider || data.engine || aiProvider).toUpperCase();
      const fallbackMsg = data.fallbackUsed ? ' (Fallback Triggered: Primary provider passed to fallback)' : '';

      setAiTestFeedback({
        type: 'success',
        message: `Connection successful in ${elapsed}ms! Provider: ${engineUsed}${fallbackMsg}. Model: ${data.model || 'Standard'}`
      });
    } catch (err) {
      setAiTestFeedback({
        type: 'error',
        message: `Connection test failed: ${err.message}`
      });
    } finally {
      setIsTestingAi(false);
    }
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

  const getTopCategory = (categoryCounts = {}) => {
    const entries = Object.entries(categoryCounts || {});
    if (entries.length === 0) return 'None yet';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  };

  return (
    <div className="admin-page-container">
      {/* Background Watermark Coat of Arms */}
      <div className="watermark-bg"></div>

      <div className="admin-page-content">
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal" style={{ top: '24px', right: '24px' }}>
          <X size={24} />
        </button>

        {!isAuthenticated ? (
          // LOGIN FORM VIEW
          <div className="admin-page-centered-login">
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
              <button 
                onClick={() => setActiveTab('ai')}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'ai' ? '2px solid var(--gold-primary)' : '2px solid transparent',
                  color: activeTab === 'ai' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  fontWeight: activeTab === 'ai' ? '600' : '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                AI Settings
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

                  <div className="stat-card">
                    <div className="stat-icon-box" style={{ backgroundColor: 'rgba(20,184,166,0.08)', color: '#2dd4bf' }}>
                      <Search size={20} />
                    </div>
                    <div className="stat-details">
                      <span className="stat-num">{stats.totalSearches || 0}</span>
                      <span className="stat-label">Total Searches</span>
                    </div>
                  </div>
                </div>

                {/* Analytical Columns */}
                <div className="stats-columns-layout">
                  {/* Left Column: Search categories */}
                  <div className="dashboard-subpanel">
                    <div className="subpanel-header">
                      <Tags size={16} style={{ color: 'var(--gold-primary)' }} />
                      <h4>Searches By Legal Area</h4>
                    </div>
                    <div className="subpanel-body">
                      {(stats.searchGroups || []).length === 0 ? (
                        <p className="no-data-text">No categorized searches recorded yet.</p>
                      ) : (
                        <div className="top-questions-list">
                          {stats.searchGroups.map((group, index) => {
                            const maxCount = stats.searchGroups[0]?.count || 1;
                            const pct = (group.count / maxCount) * 100;
                            return (
                              <div key={index} className="question-bar-item">
                                <div className="question-text-row">
                                  <span className="category-title-text">{group.category}</span>
                                  <span className="question-badge">{group.count} search</span>
                                </div>
                                {group.latestQuestions?.[0] && (
                                  <span className="category-latest-text">
                                    Latest: "{group.latestQuestions[0].text}"
                                  </span>
                                )}
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
                              <th>Searches</th>
                              <th>Top Area</th>
                              <th>Last Seen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.registrations.map((reg, index) => (
                              <tr key={index}>
                                <td className="email-cell">{reg.email} {reg.subscribed && <span title="Newsletter Opt-in" style={{ cursor: 'help' }}>🔔</span>}</td>
                                <td className="time-cell">{reg.questionCount || 0}</td>
                                <td className="time-cell">{getTopCategory(reg.categoryCounts)}</td>
                                <td className="time-cell">{formatTimestamp(reg.lastSeen || reg.timestamp)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

                <div className="dashboard-subpanel search-log-panel">
                  <div className="subpanel-header">
                    <FileText size={16} style={{ color: 'var(--gold-primary)' }} />
                    <h4>Recent Searches</h4>
                  </div>
                  <div className="subpanel-body">
                    {(stats.recentSearches || []).length === 0 ? (
                      <p className="no-data-text">No searches recorded yet.</p>
                    ) : (
                      <table className="clients-table search-log-table">
                        <thead>
                          <tr>
                            <th>Legal Area</th>
                            <th>Search</th>
                            <th>Client</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentSearches.map((item, index) => (
                            <tr key={item.id || index}>
                              <td className="time-cell">{item.category || 'General Nigerian Law'}</td>
                              <td className="email-cell">{item.text}</td>
                              <td className="time-cell">{item.email || 'Visitor'}</td>
                              <td className="time-cell">{formatTimestamp(item.timestamp)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === 'newsletter' ? (
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
            ) : (
              <div className="dashboard-content">
                <div className="dashboard-subpanel">
                  <div className="subpanel-header">
                    <Bot size={16} style={{ color: 'var(--gold-primary)' }} />
                    <h4>AI Engine &amp; API Key Management</h4>
                  </div>
                  <div className="subpanel-body">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '640px' }}>
                      
                      {/* Provider Preference Selection */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Bot size={13} style={{ color: 'var(--gold-primary)' }} />
                            <span>Primary AI Provider</span>
                          </label>
                          <select
                            className="chat-input"
                            value={aiProvider}
                            onChange={(e) => setAiProvider(e.target.value)}
                            style={{ borderRadius: '6px', fontSize: '0.82rem', height: '38px', padding: '0 10px', backgroundColor: 'var(--bg-secondary)' }}
                          >
                            <option value="auto">Auto: Gemini Primary, Groq Fallback (Recommended)</option>
                            <option value="gemini">Google Gemini (Active)</option>
                            <option value="groq">Groq (Llama-3.1 Instant - Fast)</option>
                            <option value="openai">OpenAI (GPT-4o mini)</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <RefreshCw size={13} style={{ color: 'var(--gold-primary)' }} />
                            <span>Fallback Provider</span>
                          </label>
                          <select
                            className="chat-input"
                            value={fallbackProvider}
                            onChange={(e) => setFallbackProvider(e.target.value)}
                            style={{ borderRadius: '6px', fontSize: '0.82rem', height: '38px', padding: '0 10px', backgroundColor: 'var(--bg-secondary)' }}
                          >
                            <option value="groq">Groq (Recommended Failover)</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                            <option value="none">No Fallback (Fail immediately)</option>
                          </select>
                        </div>
                      </div>

                      {/* API Keys Configuration */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        borderTop: '1px solid var(--border-light)',
                        paddingTop: '14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Key size={14} style={{ color: 'var(--gold-primary)' }} />
                            <span>API Keys &amp; Credentials</span>
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Saved in browser &amp; synced with server
                          </span>
                        </div>

                        {/* Gemini Key */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>
                              Google Gemini API Key {geminiKey ? <span style={{ color: '#4ade80', fontSize: '0.72rem' }}>● Configured</span> : <span style={{ color: '#f87171', fontSize: '0.72rem' }}>○ Missing</span>}
                            </label>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Primary engine</span>
                          </div>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type={showGeminiKey ? 'text' : 'password'}
                              className="chat-input"
                              placeholder="AIzaSy... (or leave blank to use server environment key)"
                              value={geminiKey}
                              onChange={(e) => setGeminiKey(e.target.value)}
                              style={{ borderRadius: '6px', fontSize: '0.82rem', height: '38px', padding: '0 40px 0 10px', width: '100%' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowGeminiKey(!showGeminiKey)}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title={showGeminiKey ? 'Hide key' : 'Show key'}
                            >
                              {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Groq Key */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>
                              Groq API Key {groqKey ? <span style={{ color: '#4ade80', fontSize: '0.72rem' }}>● Configured</span> : <span style={{ color: '#f87171', fontSize: '0.72rem' }}>○ Missing</span>}
                            </label>
                            <span style={{ fontSize: '0.7rem', color: 'var(--gold-primary)' }}>Fallback failover key</span>
                          </div>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type={showGroqKey ? 'text' : 'password'}
                              className="chat-input"
                              placeholder="gsk_... (or leave blank to use server environment key)"
                              value={groqKey}
                              onChange={(e) => setGroqKey(e.target.value)}
                              style={{ borderRadius: '6px', fontSize: '0.82rem', height: '38px', padding: '0 40px 0 10px', width: '100%' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowGroqKey(!showGroqKey)}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title={showGroqKey ? 'Hide key' : 'Show key'}
                            >
                              {showGroqKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* OpenAI Key */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>
                              OpenAI API Key {openaiKey ? <span style={{ color: '#4ade80', fontSize: '0.72rem' }}>● Configured</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>○ Optional</span>}
                            </label>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Optional alternate</span>
                          </div>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type={showOpenaiKey ? 'text' : 'password'}
                              className="chat-input"
                              placeholder="sk-..."
                              value={openaiKey}
                              onChange={(e) => setOpenaiKey(e.target.value)}
                              style={{ borderRadius: '6px', fontSize: '0.82rem', height: '38px', padding: '0 40px 0 10px', width: '100%' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title={showOpenaiKey ? 'Hide key' : 'Show key'}
                            >
                              {showOpenaiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Information Banner */}
                      <div style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '6px',
                        padding: '12px 14px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.78rem',
                        lineHeight: 1.5
                      }}>
                        💡 <strong>How it works:</strong> If Google Gemini encounters rate limits or quota delays, Midlex AI will automatically and seamlessly fall back to Groq without interrupting the user. You can switch to OpenAI at any time by selecting it above and entering your key.
                      </div>

                      {/* Test feedback box */}
                      {aiTestFeedback && (
                        <div style={{
                          backgroundColor: aiTestFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          border: `1px solid ${aiTestFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                          color: aiTestFeedback.type === 'success' ? '#4ade80' : '#f87171',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {aiTestFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                          <span>{aiTestFeedback.message}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="google-signin-btn"
                          onClick={handleSaveAiSettings}
                          disabled={isSavingAi}
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
                        >
                          {isSavingAi ? (
                            <div className="typing-dots"><span></span><span></span><span></span></div>
                          ) : (
                            <>
                              <Bot size={14} />
                              <span>Save AI Settings</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={handleTestAiConnection}
                          disabled={isTestingAi}
                          style={{
                            height: '38px',
                            padding: '0 16px',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <RefreshCw size={14} className={isTestingAi ? 'spin-anim' : ''} />
                          <span>{isTestingAi ? 'Testing Connection...' : 'Test AI Connection'}</span>
                        </button>
                      </div>

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
