'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

// This component syncs the auth state from the frontend to the Chrome extension
export default function ExtensionAuthSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      // Send user ID to extension via message
      if (typeof window !== 'undefined') {
        // Store user ID for extension to access
        localStorage.setItem('tokenscope_user_id', user.id);
        localStorage.setItem('tokenscope_user_email', user.emailAddresses[0]?.emailAddress || '');

        // Also set in extension storage if possible
        try {
          // We'll use a message to the extension
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = `chrome-extension://${process.env.NEXT_PUBLIC_EXTENSION_ID || 'tokenscope'}/auth-sync.html?userId=${encodeURIComponent(user.id)}`;
          document.body.appendChild(iframe);
          setTimeout(() => iframe.remove(), 100);
        } catch (e) {
          // Extension not installed, ignore
        }
      }
    }
  }, [isLoaded, user]);

  // This component renders nothing visible
  return null;
}