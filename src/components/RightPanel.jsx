import { BookOpen, Bookmark, Award, FileText, X } from 'lucide-react';

export function RightPanel({ sources = [], reasoning = [], bookmarks = [], onToggleBookmark, mobileOpen, onCloseMobile }) {
  const hasSources = sources && sources.length > 0;

  return (
    <aside className={`sources-panel right-sources-panel ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Legal analysis and sources">
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen className="text-gold" size={20} style={{ color: 'var(--gold-primary)' }} />
          <div>
            <h2 className="panel-title">
              Legal <span>Desk</span>
            </h2>
            <p className="panel-subtitle">Sources &amp; Rationale</p>
          </div>
        </div>
        {mobileOpen && (
          <button className="mobile-drawer-close" onClick={onCloseMobile} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
            <span>Close</span>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="sources-scroll">
        {!hasSources ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            padding: '20px',
            gap: '16px',
            marginTop: '40px'
          }}>
            <FileText size={48} style={{ opacity: 0.2, color: 'var(--gold-primary)' }} />
            <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
              No Active Citation
            </h4>
            <p style={{ fontSize: '0.8rem', lineHeight: '1.6', maxWidth: '280px' }}>
              Ask a question on the right, and the official legal sources and judicial reasoning will populate here automatically.
            </p>
            <div style={{
              marginTop: '16px',
              padding: '12px',
              border: '1px dashed var(--border-light)',
              borderRadius: '8px',
              fontSize: '0.75rem',
              textAlign: 'left',
              width: '100%',
              backgroundColor: 'rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontWeight: 'bold', color: 'var(--gold-primary)' }}>Supported Codes:</span>
              <ul style={{ marginLeft: '14px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li>1999 Constitution (Fundamental Rights)</li>
                <li>Land Use Act of 1978</li>
                <li>Criminal Code Act</li>
                <li>Road Traffic &amp; Vehicle Towing</li>
                <li>Animal Cruelty (Criminal Code)</li>
                <li>Matrimonial Causes Act</li>
                <li>Electoral Act 2022</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '-8px' }}>
              Cited Authorities ({sources.length})
            </div>
            
            {sources.map((source, index) => {
              const isBookmarked = bookmarks.some(b => b.id === source.id);
              const reasonItem = reasoning.find(r => r.id === source.id);

              return (
                <div key={source.id || index} className="glass-card source-card">
                  <div className="source-header">
                    <span className="source-tag">{source.category}</span>
                    <button 
                      className="icon-btn" 
                      onClick={() => onToggleBookmark(source)}
                      style={{ 
                        padding: '4px', 
                        width: '28px', 
                        height: '28px', 
                        color: isBookmarked ? 'var(--gold-primary)' : 'var(--text-secondary)'
                      }}
                      title={isBookmarked ? "Remove bookmark" : "Bookmark this section"}
                    >
                      <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
                    </button>
                  </div>
                  
                  <div className="source-ref">
                    {source.section}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {source.act} - {source.chapter}
                    {source.sourcePage ? ` - ${source.sourcePage}` : ''}
                  </div>
                  
                  <div className="source-body">
                    "{source.content}"
                  </div>

                  {reasonItem && (
                    <div className="reasoning-box">
                      <div className="reasoning-title">
                        <Award size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        Application &amp; Rationale
                      </div>
                      <p className="reasoning-text">
                        {reasonItem.rationale}
                      </p>
                    </div>
                  )}

                  {source.sourceUrl && (
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: '10px', color: 'var(--gold-primary)', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Open public source {source.sourcePage ? `(${source.sourcePage})` : ''}
                    </a>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </aside>
  );
}
