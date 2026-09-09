import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              shape?: 'rectangular' | 'pill';
              text?: 'signin_with' | 'continue_with' | 'signup_with';
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

interface GoogleSignInProps {
  onCredential: (credential: string) => void;
}

/**
 * Google Sign In button backed by Google Identity Services. Renders nothing
 * (and the sign-in stays email/password only) when VITE_GOOGLE_CLIENT_ID is
 * not configured.
 */
export const GoogleSignIn: React.FC<GoogleSignInProps> = ({ onCredential }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    const initializeButton = () => {
      if (cancelled || !window.google?.accounts?.id || !containerRef.current) return;
      const baseWidth = containerRef.current.clientWidth || 320;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => callbackRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: Math.min(400, baseWidth),
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existingScript) {
      initializeButton();
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = initializeButton;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.dividerWrap}>
        <div style={styles.divider} />
        <span style={styles.dividerText}>o continúa con</span>
        <div style={styles.divider} />
      </div>
      <div ref={containerRef} style={styles.button} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  dividerWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginTop: '0.25rem',
  },
  divider: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--border-color)',
  },
  dividerText: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  button: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
    marginTop: '0.75rem',
    minHeight: '44px',
  },
};