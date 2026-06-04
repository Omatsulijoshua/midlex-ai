import { useState } from 'react';
import { X, Search, BookOpen, CornerDownRight } from 'lucide-react';
import { legalData } from '../data/legalData';

export function DocumentExplorer({ onClose, onSelectSection }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeSectionId, setActiveSectionId] = useState(legalData[0]?.id);

  const categories = ['All', 'Constitution', 'Property & Land Law', 'Criminal Law', 'Road Traffic Law', 'Family Law', 'Electoral & Political Law'];

  const filteredData = legalData.filter(item => {
    const matchesSearch = 
      item.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.act.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const activeSection = legalData.find(item => item.id === activeSectionId) || filteredData[0];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="explorer-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="explorer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen style={{ color: 'var(--gold-primary)' }} size={24} />
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem' }}>Official Legal Registry</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Browse authentic texts of Nigerian Statutes &amp; Codes</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: 'rgba(0,0,0,0.1)'
        }}>
          {/* Categories Selector */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flex: 1 }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: selectedCategory === cat ? 'var(--green-accent)' : 'var(--border-light)',
                  backgroundColor: selectedCategory === cat ? 'rgba(22, 101, 52, 0.15)' : 'transparent',
                  color: selectedCategory === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div style={{
            position: 'relative',
            width: '240px'
          }}>
            <Search 
              size={14} 
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
            />
            <input
              type="text"
              placeholder="Search sections..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Body Split */}
        <div className="explorer-body">
          {/* Left Sidebar List */}
          <div className="explorer-sidebar">
            {filteredData.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No sections matched your criteria.
              </div>
            ) : (
              filteredData.map(item => (
                <div
                  key={item.id}
                  className={`explorer-nav-item ${activeSectionId === item.id ? 'active' : ''}`}
                  onClick={() => setActiveSectionId(item.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: 'var(--gold-primary)' }}>{item.section}</span>
                    <span style={{ fontSize: '0.65rem', padding: '1px 5px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                      {item.category.split(' ')[0]}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Reader Content */}
          <div className="explorer-content">
            {activeSection ? (
              <>
                <div>
                  <span style={{
                    fontSize: '0.7rem',
                    backgroundColor: 'var(--green-primary)',
                    border: '1px solid var(--green-accent)',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '99px',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}>
                    {activeSection.category}
                  </span>
                  
                  <h2 className="explorer-law-title" style={{ marginTop: '12px' }}>
                    {activeSection.section}: {activeSection.title}
                  </h2>
                  
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Part of the <strong>{activeSection.act}</strong> ({activeSection.chapter} / {activeSection.part})
                  {activeSection.sourcePage ? ` - ${activeSection.sourcePage}` : ''}
                </p>
                </div>

                <div style={{
                  padding: '24px',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-light)',
                  borderRadius: '12px',
                  lineHeight: '1.7',
                  fontSize: '0.98rem',
                  fontFamily: 'var(--font-serif)',
                  color: '#e5e7eb',
                  borderLeft: '4px solid var(--gold-primary)',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                }}>
                  "{activeSection.content}"
                </div>

                <div>
                  <h4 style={{ fontFamily: 'var(--font-serif)', color: 'var(--gold-primary)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <CornerDownRight size={16} /> Legal Purpose &amp; Rationale
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {activeSection.reasoning}
                  </p>
                  {activeSection.sourceUrl && (
                    <a
                      href={activeSection.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: '10px', color: 'var(--gold-primary)', fontSize: '0.82rem', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Open public source {activeSection.sourcePage ? `(${activeSection.sourcePage})` : ''}
                    </a>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn-gold" 
                    onClick={() => {
                      onSelectSection(activeSection);
                      onClose();
                    }}
                  >
                    Cite in Left Panel
                  </button>
                  <button className="btn-secondary" onClick={onClose}>
                    Close Registry
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Select a section from the index to read.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
