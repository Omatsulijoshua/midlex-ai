import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Trash2, ArrowRight, BookOpen } from 'lucide-react';

export function ChatAssistant({ messages, onSendMessage, onClearChat, isGenerating, onSuggestionClick }) {
  const [input, setInput] = useState('');
  const [thinkingText, setThinkingText] = useState('Searching legal database...');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isGenerating) {
      setThinkingText('Searching legal database...');
      return;
    }

    const phases = [
      'Searching legal database...',
      'Analyzing relevant statutory provisions...',
      'Synthesizing counsel rationale...',
      'Drafting final response...'
    ];

    let currentPhase = 0;
    setThinkingText(phases[0]);

    const interval = setInterval(() => {
      currentPhase++;
      if (currentPhase < phases.length) {
        setThinkingText(phases[currentPhase]);
      } else {
        clearInterval(interval);
      }
    }, 850);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const suggestions = [
    {
      headline: "Fundamental Rights",
      body: "What are my rights if arrested by the police?",
      query: "what are my fundamental rights under police arrest?"
    },
    {
      headline: "Land & Property",
      body: "Can the Governor revoke my Certificate of Occupancy?",
      query: "can the governor revoke my C of O land ownership?"
    },
    {
      headline: "Criminal Penalties",
      body: "What is the legal definition and punishment for stealing?",
      query: "what is the definition and punishment for stealing?"
    },
    {
      headline: "Electoral Law",
      body: "How does the Electoral Act 2022 enforce BVAS usage?",
      query: "how does the electoral act enforce BVAS usage in voting?"
    }
  ];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() === '' || isGenerating) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Scrollable messages container */}
      <div className="chat-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-logo">
              <svg viewBox="0 0 100 100" fill="none" style={{ width: '100%', height: '100%' }}>
                {/* Custom Nigerian Scale of Justice Icon */}
                <circle cx="50" cy="50" r="45" stroke="var(--green-accent)" strokeWidth="3" fill="rgba(22, 101, 52, 0.05)" />
                <path d="M50 20 V80 M30 80 H70" stroke="var(--gold-primary)" strokeWidth="4" strokeLinecap="round" />
                <path d="M30 35 H70" stroke="var(--gold-primary)" strokeWidth="3" strokeLinecap="round" />
                {/* Left scale pan */}
                <path d="M30 35 L20 55 M30 35 L40 55" stroke="var(--text-secondary)" strokeWidth="1.5" />
                <path d="M15 55 H45" stroke="var(--gold-primary)" strokeWidth="3" strokeLinecap="round" />
                {/* Right scale pan */}
                <path d="M70 35 L60 55 M70 35 L80 55" stroke="var(--text-secondary)" strokeWidth="1.5" />
                <path d="M55 55 H85" stroke="var(--gold-primary)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            
            <h1 className="welcome-title">
              Midlex AI: <span>Nigerian Law Assistant</span>
            </h1>
            <p className="welcome-desc">
              Ask legal questions regarding the Constitution of Nigeria, Land Use Act, Electoral Act, and Criminal Codes. Receive instant citations and legal rationale in real time.
            </p>

            <div className="suggestion-grid">
              {suggestions.map((s, idx) => (
                <button 
                  key={idx} 
                  className="suggestion-card"
                  onClick={() => onSuggestionClick(s.query)}
                >
                  <div className="suggestion-headline">{s.headline}</div>
                  <div className="suggestion-body">{s.body}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`message-bubble ${msg.role}`}>
              <div className={`avatar ${msg.role}`}>
                {msg.role === 'user' ? 'U' : 'AI'}
              </div>
              <div className="message-content">
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {/* Simplistic renderer for bolding, bullet points and blockquotes */}
                  {msg.content.split('\n').map((line, lIdx) => {
                    if (line.startsWith('> ')) {
                      return <blockquote key={lIdx}>{line.replace('> ', '')}</blockquote>;
                    }
                    if (line.startsWith('• ')) {
                      return <li key={lIdx} style={{ marginLeft: '16px' }}>{line.replace('• ', '')}</li>;
                    }
                    
                    // Simple inline bold formatting **text**
                    const parts = line.split('**');
                    if (parts.length > 1) {
                      return (
                        <p key={lIdx} style={{ margin: '6px 0' }}>
                          {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} style={{ color: 'var(--gold-primary)' }}>{part}</strong> : part)}
                        </p>
                      );
                    }

                    return <p key={lIdx} style={{ margin: '6px 0' }}>{line}</p>;
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="message-bubble assistant">
            <div className="avatar assistant">AI</div>
            <div className="message-content" style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '10px' }}>{thinkingText}</span>
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel at bottom */}
      <div className="input-panel">
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="input-wrapper">
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about Nigerian law (e.g., 'fundamental rights', 'C of O revocation')..."
              disabled={isGenerating}
            />
            <div className="action-buttons">
              {messages.length > 0 && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onClearChat}
                  title="Clear conversation"
                  disabled={isGenerating}
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                type="submit"
                className="icon-btn send-btn"
                disabled={input.trim() === '' || isGenerating}
                title="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </form>
        <div style={{
          textAlign: 'center',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          marginTop: '10px',
          lineHeight: '1.4'
        }}>
          Disclaimer: Midlex AI provides general information based on public codes and gazettes. It does not constitute formal legal counsel. <br />
          If you need further legal assistance, please <a href="https://midlex-llp.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold-primary)', textDecoration: 'none', fontWeight: '500' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>click here to visit Midlex LLP</a>.
        </div>
      </div>
    </div>
  );
}
