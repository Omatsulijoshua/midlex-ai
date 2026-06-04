import { useState, useEffect, useCallback } from 'react';
import { SavedChatsPanel } from './components/SavedChatsPanel';
import { ChatAssistant } from './components/ChatAssistant';
import { AuthManager } from './components/AuthManager';
import { DocumentExplorer } from './components/DocumentExplorer';
import { RightPanel } from './components/RightPanel';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { ArticlesModal } from './components/ArticlesModal';
import { fetchWithTimeout, getApiEndpoint, getApiUrl } from './utils/api';
import { Scale, BookOpen, Menu, FileText } from 'lucide-react';

const getChatsStorageKey = (user) => {
  return user ? `midlex_user_chats_${user.id}` : 'midlex_guest_chats';
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  
  // Multi-chat states
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  // Active chat content states
  const [messages, setMessages] = useState([]);
  const [activeSources, setActiveSources] = useState([]);
  const [activeReasoning, setActiveReasoning] = useState([]);

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState(() => {
    const savedBookmarks = localStorage.getItem('midlex_bookmarks');
    return savedBookmarks ? JSON.parse(savedBookmarks) : [];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showArticles, setShowArticles] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [showSourcesMobile, setShowSourcesMobile] = useState(false);

  // Track page visits on mount
  useEffect(() => {
    const trackVisit = async () => {
      const isTracked = sessionStorage.getItem('midlex_session_tracked');
      if (!isTracked) {
        try {
          const API_URL = getApiUrl();
          if (!API_URL) {
            sessionStorage.setItem('midlex_session_tracked', 'true');
            return;
          }
          await fetchWithTimeout(`${API_URL}/api/analytics/visit`, { method: 'POST' }, 6000);
          sessionStorage.setItem('midlex_session_tracked', 'true');
        } catch (err) {
          console.warn('Analytics backend unreachable for visit logging:', err.message);
        }
      }
    };
    trackVisit();
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

  // Sync newsletter subscription status to backend
  const handleToggleSubscribe = (subscribed) => {
    setIsSubscribed(subscribed);
    if (currentUser) {
      const syncSubscription = async () => {
        try {
          const API_URL = getApiUrl();
          if (!API_URL) return;
          await fetchWithTimeout(`${API_URL}/api/analytics/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser.email, subscribed })
          }, 6000);
        } catch (err) {
          console.warn('Failed to sync newsletter subscription status:', err.message);
        }
      };
      syncSubscription();
    }
  };

  // Helper: Create a fresh empty conversation session in memory
  const handleCreateNewChat = () => {
    const newId = `chat_${Date.now()}`;
    setActiveChatId(newId);
    setMessages([]);
    setActiveSources([]);
    setActiveReasoning([]);
  };

  // Helper: Select and load an existing chat
  const handleSelectChat = (chatId) => {
    const selected = chats.find(c => c.id === chatId);
    if (selected) {
      setActiveChatId(chatId);
      setMessages(selected.messages || []);
      setActiveSources(selected.sources || []);
      setActiveReasoning(selected.reasoning || []);
    }
  };

  // Helper: Delete a chat conversation
  const handleDeleteChat = (chatId) => {
    const updatedChats = chats.filter(c => c.id !== chatId);
    setChats(updatedChats);
    
    const key = getChatsStorageKey(currentUser);
    localStorage.setItem(key, JSON.stringify(updatedChats));

    // If the active chat was deleted, open a new blank chat session
    if (activeChatId === chatId) {
      handleCreateNewChat();
    }
  };

  // Helper: Update state & localStorage when a message is sent or generated
  const updateChatsList = (chatId, finalMessages, sources, reasoning, initialText) => {
    const exists = chats.some(c => c.id === chatId);
    let updatedChats;

    if (exists) {
      updatedChats = chats.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            messages: finalMessages,
            sources: sources,
            reasoning: reasoning
          };
        }
        return c;
      });
    } else {
      // First message in this session: create and prepend the chat in the list
      const titleText = initialText.length > 36 ? initialText.substring(0, 36) + '...' : initialText;
      const newChat = {
        id: chatId,
        title: titleText,
        createdAt: Date.now(),
        messages: finalMessages,
        sources: sources,
        reasoning: reasoning
      };
      updatedChats = [newChat, ...chats];
    }

    setChats(updatedChats);
    const key = getChatsStorageKey(currentUser);
    localStorage.setItem(key, JSON.stringify(updatedChats));
  };

  // Handle User Change (login/logout)
  const handleUserChange = useCallback((user) => {
    setCurrentUser(user);
    
    // Ping registration tracking if user signed in
    if (user) {
      const trackRegistration = async () => {
        try {
          const API_URL = getApiUrl();
          if (!API_URL) return;
          await fetchWithTimeout(`${API_URL}/api/analytics/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email })
          }, 6000);
        } catch (err) {
          console.warn('Analytics backend unreachable for registration logging:', err.message);
        }
      };
      trackRegistration();
    }
    
    // Determine the key for the incoming user status
    const key = getChatsStorageKey(user);
    const savedChats = localStorage.getItem(key);
    
    let loadedChats = [];

    if (savedChats) {
      loadedChats = JSON.parse(savedChats);
    } else if (user) {
      // Data Migration check: see if they have old single-chat data we can import
      const oldSingleChat = localStorage.getItem(`midlex_chats_${user.id}`);
      if (oldSingleChat) {
        try {
          const parsedMsgs = JSON.parse(oldSingleChat);
          if (parsedMsgs && parsedMsgs.length > 0) {
            const firstUserMsg = parsedMsgs.find(m => m.role === 'user');
            const initialTitle = firstUserMsg ? firstUserMsg.content : 'Migrated Conversation';
            const migratedChat = {
              id: `chat_migrated_${Date.now()}`,
              title: initialTitle.length > 36 ? initialTitle.substring(0, 36) + '...' : initialTitle,
              createdAt: Date.now(),
              messages: parsedMsgs,
              sources: [],
              reasoning: []
            };
            loadedChats = [migratedChat];
            localStorage.setItem(key, JSON.stringify(loadedChats));
            localStorage.removeItem(`midlex_chats_${user.id}`); // Clean up old single chat key
          }
        } catch (err) {
          console.error('Failed to migrate old single-chat data:', err);
        }
      }
    }

    setChats(loadedChats);

    // requirement: Automatically open a new blank chat session when user logs in/opens the site
    const newId = `chat_${Date.now()}`;
    setActiveChatId(newId);
    setMessages([]);
    setActiveSources([]);
    setActiveReasoning([]);
  }, []);

  // Send Message Logic
  const handleSendMessage = async (text) => {
    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsGenerating(true);
    const startTime = Date.now();

    try {
      const chatApiUrl = getApiEndpoint('/api/chat', { sameOriginInProduction: true });

      // Attempt backend API fetch
      const response = await fetchWithTimeout(chatApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      }, 15000);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gemini API server returned an error.');
      }

      const data = await response.json();

      // Enforce minimum thinking delay
      const elapsed = Date.now() - startTime;
      if (elapsed < 3000) {
        await new Promise(resolve => setTimeout(resolve, 3000 - elapsed));
      }

      const assistantMessage = { 
        role: 'assistant', 
        content: data.answerText,
        query: text // save original text
      };
      
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Update Right Panel sources and reasoning
      const newSources = data.sources || [];
      const newReasoning = data.reasoning || [];
      setActiveSources(newSources);
      setActiveReasoning(newReasoning);
      setIsGenerating(false);

      // Save to chat list
      updateChatsList(activeChatId, finalMessages, newSources, newReasoning, text);
    } catch (err) {
      console.warn('Gemini API unavailable:', err.message);
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsed);

      setTimeout(() => {
        const assistantMessage = { 
          role: 'assistant', 
          content: `**Gemini API unavailable:** ${err.message}\n\nPlease make sure the server has a valid **GEMINI_API_KEY** configured. I did not use the offline fallback for this answer.`,
          query: text
        };
        
        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        
        const newSources = [];
        const newReasoning = [];
        setActiveSources(newSources);
        setActiveReasoning(newReasoning);
        setIsGenerating(false);

        // Save to chat list
        updateChatsList(activeChatId, finalMessages, newSources, newReasoning, text);
      }, remainingTime);
    }
  };

  // Clear Chat Logic
  const handleClearChat = () => {
    setMessages([]);
    setActiveSources([]);
    setActiveReasoning([]);
    
    // Remove the active chat from list if it exists
    const updatedChats = chats.filter(c => c.id !== activeChatId);
    setChats(updatedChats);

    const key = getChatsStorageKey(currentUser);
    localStorage.setItem(key, JSON.stringify(updatedChats));
    
    // Initialize a new empty session
    handleCreateNewChat();
  };

  // Suggestion card clicked
  const handleSuggestionClick = (query) => {
    handleSendMessage(query);
  };

  // Direct Explorer citation injection
  const handleSelectExplorerSection = (section) => {
    // Format the sources and reasoning arrays for Right Panel
    const sourceObj = {
      id: section.id,
      section: section.section,
      title: section.title,
      act: section.act,
      content: section.content,
      chapter: section.chapter,
      part: section.part,
      category: section.category,
      sourceUrl: section.sourceUrl,
      sourcePage: section.sourcePage,
      reasoning: section.reasoning
    };

    const reasoningObj = {
      id: section.id,
      source: `${section.act} - ${section.section}`,
      rationale: section.reasoning
    };

    const newSources = [sourceObj];
    const newReasoning = [reasoningObj];

    setActiveSources(newSources);
    setActiveReasoning(newReasoning);

    // Push system log in chat
    const systemMsg = {
      role: 'assistant',
      content: `I have pre-loaded **${section.section} (${section.title})** of the **${section.act}** onto your Legal Desk. You can read the text and its application rationale directly. What questions do you have regarding this provision?`
    };

    const finalMessages = [...messages, systemMsg];
    setMessages(finalMessages);

    // Save explorer action in chat history list
    updateChatsList(activeChatId, finalMessages, newSources, newReasoning, `Browse: ${section.section}`);
  };

  if (showAdmin) {
    return (
      <AdminDashboardModal 
        onClose={() => setShowAdmin(false)}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Background Watermark Coat of Arms */}
      <div className="watermark-bg"></div>

      {/* Left Sidebar: Saved Chats List */}
      <SavedChatsPanel
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(chatId) => {
          handleSelectChat(chatId);
          setShowHistoryMobile(false);
        }}
        onCreateNewChat={() => {
          handleCreateNewChat();
          setShowHistoryMobile(false);
        }}
        onDeleteChat={handleDeleteChat}
        currentUser={currentUser}
        onAdminClick={() => setShowAdmin(true)}
        onArticlesClick={() => {
          setShowArticles(true);
          setShowHistoryMobile(false);
        }}
        isSubscribed={isSubscribed}
        onToggleSubscribe={handleToggleSubscribe}
        mobileOpen={showHistoryMobile}
        onCloseMobile={() => setShowHistoryMobile(false)}
      />

      {/* Center Panel: Main UI & Assistant Chat */}
      <div className="assistant-panel">
        {/* Topbar navigation */}
        <header className="app-topbar">
          <div className="brand">
            <button 
              className="mobile-menu-toggle-btn" 
              onClick={() => setShowHistoryMobile(true)} 
              aria-label="Open chat history"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                marginRight: '8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.03)'
              }}
            >
              <Menu size={20} />
            </button>
            <Scale size={24} style={{ color: 'var(--green-accent)' }} />
            <h1 className="brand-name">Midlex <span>AI</span></h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {activeSources.length > 0 && (
              <button 
                className="mobile-sources-toggle-btn btn-secondary" 
                onClick={() => setShowSourcesMobile(true)} 
                aria-label="Open legal desk"
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '0.78rem',
                  height: '32px'
                }}
              >
                <FileText size={14} />
                <span>Desk ({activeSources.length})</span>
              </button>
            )}
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
          currentUser={currentUser}
        />
      </div>

      {/* Right Sidebar: Legal Sources & Rationale */}
      <RightPanel 
        sources={activeSources} 
        reasoning={activeReasoning}
        bookmarks={bookmarks}
        onToggleBookmark={handleToggleBookmark}
        mobileOpen={showSourcesMobile}
        onCloseMobile={() => setShowSourcesMobile(false)}
      />

      {/* Mobile drawer backdrop overlay */}
      {(showHistoryMobile || showSourcesMobile) && (
        <div 
          className="mobile-drawer-backdrop" 
          onClick={() => {
            setShowHistoryMobile(false);
            setShowSourcesMobile(false);
          }}
        />
      )}

      {/* Document Explorer Modal */}
      {showExplorer && (
        <DocumentExplorer 
          onClose={() => setShowExplorer(false)} 
          onSelectSection={handleSelectExplorerSection}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdmin && (
        <AdminDashboardModal 
          onClose={() => setShowAdmin(false)}
        />
      )}

      {/* Client Articles Feed Modal */}
      {showArticles && (
        <ArticlesModal 
          onClose={() => setShowArticles(false)}
        />
      )}
    </div>
  );
}

export default App;
