import React, { useState, useEffect } from 'react';
import { LeftPanel } from './components/LeftPanel';
import { ChatAssistant } from './components/ChatAssistant';
import { AuthManager } from './components/AuthManager';
import { DocumentExplorer } from './components/DocumentExplorer';
import { searchLegalDatabase } from './utils/legalSearch';
import { Scale, BookOpen, BookmarkCheck } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeSources, setActiveSources] = useState([]);
  const [activeReasoning, setActiveReasoning] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);

  // Load bookmarks on mount
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('midlex_bookmarks');
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }
  }, []);

  // Sync bookmarks to localStorage
  const handleToggleBookmark = (source) => {
    let updatedBookmarks;
    const exists = bookmarks.some(b => b.id === source.id);
    if (exists) {
      updatedBookmarks = bookmarks.filter(b => b.id !== source.id);
    } else {
      updatedBookmarks = [...bookmarks, source];
    }
    setBookmarks(updatedBookmarks);
    localStorage.setItem('midlex_bookmarks', JSON.stringify(updatedBookmarks));
  };

  // Handle User Change (login/logout)
  const handleUserChange = (user) => {
    setCurrentUser(user);
    if (user) {
      // Load user specific chat history
      const savedChats = localStorage.getItem(`midlex_chats_${user.id}`);
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        setMessages(parsedChats);
        
        // Restore sources/reasoning from the last assistant message if possible
        const assistantMsgs = parsedChats.filter(m => m.role === 'assistant');
        if (assistantMsgs.length > 0) {
          const lastMsg = assistantMsgs[assistantMsgs.length - 1];
          if (lastMsg.query) {
            const results = searchLegalDatabase(lastMsg.query);
            setActiveSources(results.sources);
            setActiveReasoning(results.reasoning);
          }
        }
      } else {
        setMessages([]);
        setActiveSources([]);
        setActiveReasoning([]);
      }
    } else {
      // Clear messages on logout
      setMessages([]);
      setActiveSources([]);
      setActiveReasoning([]);
    }
  };

  // Send Message Logic
  const handleSendMessage = async (text) => {
    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsGenerating(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      // Attempt backend API fetch
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error('API server returned error status');
      }

      const data = await response.json();

      const assistantMessage = { 
        role: 'assistant', 
        content: data.answerText,
        query: text // save original text
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Update Left Panel sources and reasoning
      setActiveSources(data.sources || []);
      setActiveReasoning(data.reasoning || []);
      setIsGenerating(false);

      // Save to localStorage if logged in
      if (currentUser) {
        localStorage.setItem(`midlex_chats_${currentUser.id}`, JSON.stringify(finalMessages));
      }
    } catch (err) {
      console.warn('⚠️ Midlex Backend API unavailable, falling back to local search engine:', err.message);
      
      // Fallback local engine search
      const searchResults = searchLegalDatabase(text);

      // Simulate minor processing lag for fallback so it feels realistic
      setTimeout(() => {
        const assistantMessage = { 
          role: 'assistant', 
          content: searchResults.answerText,
          query: text
        };
        
        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        setActiveSources(searchResults.sources);
        setActiveReasoning(searchResults.reasoning);
        setIsGenerating(false);

        if (currentUser) {
          localStorage.setItem(`midlex_chats_${currentUser.id}`, JSON.stringify(finalMessages));
        }
      }, 800);
    }
  };

  // Clear Chat Logic
  const handleClearChat = () => {
    setMessages([]);
    setActiveSources([]);
    setActiveReasoning([]);
    if (currentUser) {
      localStorage.removeItem(`midlex_chats_${currentUser.id}`);
    }
  };

  // Suggestion card clicked
  const handleSuggestionClick = (query) => {
    handleSendMessage(query);
  };

  // Direct Explorer citation injection
  const handleSelectExplorerSection = (section) => {
    // Format the sources and reasoning arrays for Left Panel
    const sourceObj = {
      id: section.id,
      section: section.section,
      title: section.title,
      act: section.act,
      content: section.content,
      chapter: section.chapter,
      part: section.part,
      category: section.category
    };

    const reasoningObj = {
      id: section.id,
      source: `${section.act} - ${section.section}`,
      rationale: section.reasoning
    };

    setActiveSources([sourceObj]);
    setActiveReasoning([reasoningObj]);

    // Push system log in chat
    const systemMsg = {
      role: 'assistant',
      content: `I have pre-loaded **${section.section} (${section.title})** of the **${section.act}** onto your Left Analysis Desk. You can read the text and its application rationale directly. What questions do you have regarding this provision?`
    };

    const finalMessages = [...messages, systemMsg];
    setMessages(finalMessages);

    if (currentUser) {
      localStorage.setItem(`midlex_chats_${currentUser.id}`, JSON.stringify(finalMessages));
    }
  };

  return (
    <div className="app-container">
      {/* Background Watermark Coat of Arms */}
      <div className="watermark-bg"></div>

      {/* Left Panel: Legal Sources & Rationale */}
      <LeftPanel 
        sources={activeSources} 
        reasoning={activeReasoning}
        bookmarks={bookmarks}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* Right Panel: Main UI & Assistant Chat */}
      <div className="assistant-panel">
        {/* Topbar navigation */}
        <header className="app-topbar">
          <div className="brand">
            <Scale size={24} style={{ color: 'var(--green-accent)' }} />
            <h1 className="brand-name">Midlex <span>AI</span></h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn-secondary" onClick={() => setShowExplorer(true)}>
              <BookOpen size={16} />
              <span>Browse Laws</span>
            </button>
            <AuthManager currentUser={currentUser} onUserChange={handleUserChange} />
          </div>
        </header>

        {/* Guest Warning Banner */}
        {!currentUser && (
          <div className="guest-warning-banner">
            <span>⚠️ <strong>Security Warning:</strong> You are browsing in guest mode. Please sign in with Google in the top-right corner to retain your chat history, otherwise all conversations will be permanently lost and cannot be recovered.</span>
          </div>
        )}

        {/* Chat window */}
        <ChatAssistant 
          messages={messages} 
          onSendMessage={handleSendMessage}
          onClearChat={handleClearChat}
          isGenerating={isGenerating}
          onSuggestionClick={handleSuggestionClick}
        />
      </div>

      {/* Document Explorer Modal */}
      {showExplorer && (
        <DocumentExplorer 
          onClose={() => setShowExplorer(false)} 
          onSelectSection={handleSelectExplorerSection}
        />
      )}
    </div>
  );
}

export default App;
