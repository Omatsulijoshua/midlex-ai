import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Calendar, BookOpen, X, Scale, Shield, Vote, Home, Newspaper } from 'lucide-react';

export function ArticlesModal({ onClose }) {
  const [articles, setArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch articles on mount
  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);
      setError('');
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/articles`);
        if (!response.ok) {
          throw new Error('Failed to load published articles.');
        }
        const data = await response.json();
        setArticles(data.articles || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArticles();
  }, []);

  // Filter articles based on query
  const filteredArticles = articles.filter(art => 
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimestamp = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Render Category Icon based on article keyword
  const renderCategoryIcon = (keyword) => {
    const key = (keyword || '').toLowerCase();
    switch (key) {
      case 'property':
      case 'land':
        return <Home size={32} style={{ color: '#60a5fa' }} />;
      case 'rights':
      case 'fundamental':
        return <Shield size={32} style={{ color: '#f87171' }} />;
      case 'electoral':
      case 'bvas':
        return <Vote size={32} style={{ color: '#4ade80' }} />;
      default:
        return <Scale size={32} style={{ color: 'var(--gold-primary)' }} />;
    }
  };

  // Render Background Class based on category keyword
  const getThumbnailBgClass = (keyword) => {
    const key = (keyword || '').toLowerCase();
    switch (key) {
      case 'property': return 'property-grad';
      case 'rights': return 'rights-grad';
      case 'electoral': return 'electoral-grad';
      default: return 'scale-grad';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="auth-modal explorer-modal articles-modal-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Close Button */}
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {selectedArticle ? (
          // ARTICLE DETAIL VIEW
          <div className="article-detail-view">
            <header className="article-detail-header">
              <button className="btn-secondary back-btn" onClick={() => setSelectedArticle(null)}>
                <ArrowLeft size={16} />
                <span>Back to Updates</span>
              </button>
            </header>

            <div className="article-detail-content">
              <div className={`detail-hero-banner ${getThumbnailBgClass(selectedArticle.thumbnail)}`}>
                {renderCategoryIcon(selectedArticle.thumbnail)}
              </div>

              <div className="article-meta-row">
                <span className="meta-tag">{selectedArticle.thumbnail || 'Legal Update'}</span>
                <span className="meta-date">
                  <Calendar size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  {formatTimestamp(selectedArticle.timestamp)}
                </span>
              </div>

              <h2 className="article-detail-title">{selectedArticle.title}</h2>
              <p className="article-detail-subtitle">{selectedArticle.subtitle}</p>
              
              <div className="article-detail-body">
                {selectedArticle.content.split('\n').map((line, idx) => {
                  if (line.trim() === '') return <br key={idx} />;
                  if (line.startsWith('### ')) {
                    return <h4 key={idx} className="body-heading-3">{line.replace('### ', '')}</h4>;
                  }
                  if (line.startsWith('## ')) {
                    return <h3 key={idx} className="body-heading-2">{line.replace('## ', '')}</h3>;
                  }
                  if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
                    return <li key={idx} className="body-list-item numbered">{line}</li>;
                  }
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <li key={idx} className="body-list-item bulleted">{line.substring(2)}</li>;
                  }
                  return <p key={idx} className="body-paragraph">{line}</p>;
                })}
              </div>
            </div>
          </div>
        ) : (
          // ARTICLES LIST FEED VIEW
          <div className="articles-feed-view">
            <header className="feed-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Newspaper size={24} style={{ color: 'var(--gold-primary)' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem' }}>Legal Updates &amp; Insights</h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Browse articles and guidelines curated by Midlex LLP advocates regarding the Nigerian Legal System.
              </p>
            </header>

            {/* Search filter */}
            <div className="feed-search-bar">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                className="chat-input search-input"
                placeholder="Search updates by keyword, title, or law code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Scrollable list */}
            <div className="feed-body-scroll">
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px 0' }}>
                  <div className="typing-dots" style={{ marginBottom: '16px' }}>
                    <span></span><span></span><span></span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Retrieving articles feed...</p>
                </div>
              ) : error ? (
                <div style={{ textAlign: 'center', color: '#f87171', padding: '40px' }}>
                  ⚠️ Error loading feed: {error}
                </div>
              ) : filteredArticles.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '60px 0', opacity: 0.6 }}>
                  <BookOpen size={48} style={{ color: 'var(--gold-primary)', marginBottom: '16px' }} />
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>No Articles Found</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '240px', textAlign: 'center' }}>
                    No results match your search keywords, or no newsletters have been published yet.
                  </p>
                </div>
              ) : (
                <div className="articles-grid">
                  {filteredArticles.map((art) => (
                    <div 
                      key={art.id} 
                      className="glass-card article-card"
                      onClick={() => setSelectedArticle(art)}
                    >
                      <div className={`article-card-thumbnail ${getThumbnailBgClass(art.thumbnail)}`}>
                        {renderCategoryIcon(art.thumbnail)}
                      </div>
                      <div className="article-card-details">
                        <div className="article-card-meta">
                          <span className="card-tag">{art.thumbnail || 'General'}</span>
                          <span className="card-date">{formatTimestamp(art.timestamp)}</span>
                        </div>
                        <h4 className="article-card-title">{art.title}</h4>
                        <p className="article-card-subtitle">{art.subtitle}</p>
                        <button className="read-more-link">
                          <span>Read Article</span>
                          <ArrowLeft size={12} style={{ transform: 'rotate(180deg)', display: 'inline', marginLeft: '6px' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
