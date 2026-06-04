import { useState, useEffect } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { auth, googleProvider, isConfigured } from '../config/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

export function AuthManager({ onUserChange, currentUser }) {
  const [showModal, setShowModal] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Monitor Authentication Session
  useEffect(() => {
    if (isConfigured && auth) {
      // Real Firebase Session Observer
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const userObj = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Anonymous Advocate',
            email: firebaseUser.email || '',
            avatar: firebaseUser.displayName 
              ? firebaseUser.displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
              : 'U',
            provider: 'google'
          };
          onUserChange(userObj);
        } else {
          onUserChange(null);
        }
      });
      return () => unsubscribe();
    } else {
      // Local Mock Session observer fallback
      const savedUser = localStorage.getItem('midlex_user');
      if (savedUser) {
        onUserChange(JSON.parse(savedUser));
      }
    }
  }, [onUserChange]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    
    if (isConfigured && auth) {
      try {
        // Real Google Authentication Popup via Firebase Web SDK
        await signInWithPopup(auth, googleProvider);
        setShowModal(false);
      } catch (err) {
        console.error('❌ Firebase Google Sign-In failed:', err.message);
        alert(`Google Sign-In failed: ${err.message}`);
      } finally {
        setIsSigningIn(false);
      }
    } else {
      // Mock flow fallback
      setTimeout(() => {
        const mockUser = {
          id: 'google-user-101',
          name: 'Barrister Nnamdi Bello',
          email: 'nnamdi.bello@nigerianbar.org',
          avatar: 'NB',
          provider: 'google'
        };
        localStorage.setItem('midlex_user', JSON.stringify(mockUser));
        onUserChange(mockUser);
        setIsSigningIn(false);
        setShowModal(false);
      }, 1500);
    }
  };

  const handleSignOut = async () => {
    if (isConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('❌ Firebase Sign-Out failed:', err.message);
      }
    } else {
      // Mock Sign-Out
      localStorage.removeItem('midlex_user');
      onUserChange(null);
    }
  };

  return (
    <div className="user-profile">
      {currentUser ? (
        <>
          <div className="user-details">
            <div className="user-name">{currentUser.name}</div>
            <div className="user-email">{currentUser.email}</div>
          </div>
          <button 
            className="avatar user" 
            onClick={handleSignOut} 
            title="Click to sign out"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {currentUser.avatar}
          </button>
        </>
      ) : (
        <button className="btn-secondary" onClick={() => setShowModal(true)}>
          <LogIn size={16} />
          <span>Sign In</span>
        </button>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--gold-primary)' }}>
              <ShieldCheck size={48} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '12px' }}>
              Access Midlex AI
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Sign in to retain your search history, bookmark constitutional clauses, and sync chats across sessions.
            </p>

            <button 
              className="google-signin-btn" 
              onClick={handleGoogleSignIn} 
              disabled={isSigningIn}
            >
              {isSigningIn ? (
                <div className="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              ) : (
                <>
                  <svg className="google-logo" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <button 
              className="btn-secondary" 
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
