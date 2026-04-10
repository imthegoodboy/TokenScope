'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export default function ExtensionAuthSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      // Store user ID for extension to access
      localStorage.setItem('tokenscope_user_id', user.id);
      localStorage.setItem('tokenscope_user_email', user.emailAddresses[0]?.emailAddress || '');

      // Try to notify extension via chrome runtime
      try {
        chrome.runtime.sendMessage({
          type: 'SET_USER_CONTEXT',
          payload: {
            userId: user.id,
            email: user.emailAddresses[0]?.emailAddress
          }
        }).catch(() => {
          // Extension not installed or not accessible
        });
      } catch (e) {
        // Extension not available
      }
    }
  }, [isLoaded, user]);

  return null;
}