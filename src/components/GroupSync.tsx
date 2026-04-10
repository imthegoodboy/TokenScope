'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export default function GroupSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      // Get user's active group from localStorage
      const activeGroupId = localStorage.getItem('tokenscope_active_group_id');

      if (activeGroupId) {
        // Sync with extension
        try {
          chrome.runtime.sendMessage({
            type: 'SET_GROUP_ID',
            payload: { groupId: parseInt(activeGroupId) }
          }).catch(() => {
            // Extension not installed, ignore
          });
        } catch (e) {
          // Extension not available
        }
      }
    }
  }, [isLoaded, user]);

  return null;
}