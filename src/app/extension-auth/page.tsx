'use client';

import { useEffect, useState } from 'react';
import { useSignIn, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ExtensionAuthPage() {
  const { isLoaded, isSignedIn, user, signIn } = useSignIn();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Store auth data for extension
      const userId = user.id;

      // Store in localStorage for the extension to access
      localStorage.setItem('tokenscope_extension_auth', JSON.stringify({
        user_id: userId,
        email: user.emailAddresses[0]?.emailAddress,
        timestamp: Date.now()
      }));

      // Notify background script
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'SET_USER_AUTH',
          payload: {
            user_id: userId,
            auth_token: `clerk_${userId}_${Date.now()}`
          }
        }).catch(console.error);
      }

      setStatus('success');

      // Redirect back to extension after short delay
      setTimeout(() => {
        // Close the tab
        window.close();
      }, 1500);
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    // Check for existing auth in localStorage (from redirect)
    const storedAuth = localStorage.getItem('tokenscope_extension_auth');
    if (storedAuth) {
      try {
        const auth = JSON.parse(storedAuth);
        if (auth.user_id && typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({
            type: 'SET_USER_AUTH',
            payload: {
              user_id: auth.user_id,
              auth_token: `clerk_${auth.user_id}_${auth.timestamp}`
            }
          }).catch(console.error);
        }
      } catch (e) {
        console.error('Failed to parse stored auth:', e);
      }
    }
  }, []);

  const handleSignIn = async () => {
    try {
      await signIn.create({
        strategy: 'email_link',
        emailAddress: user?.emailAddresses[0]?.emailAddress || ''
      });
    } catch (e: any) {
      setError(e.message || 'Sign in failed');
      setStatus('error');
    }
  };

  if (!isLoaded || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="text-gray-400">Connecting extension to your account...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Extension Connected!</h1>
          <p className="text-gray-400">Your extension is now synced with your account.</p>
          <p className="text-orange text-sm mt-4">Closing window...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange to-orange-light rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-black font-bold text-2xl">TS</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Connect Extension</h1>
            <p className="text-gray-400">Sign in to sync your extension data across all devices</p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <Link
              href="/sign-in"
              className="block w-full text-center px-6 py-4 bg-orange hover:bg-orange-light text-black font-semibold rounded-lg transition-colors"
            >
              Sign In to Connect
            </Link>

            <div className="mt-6 pt-6 border-t border-gray-800">
              <p className="text-gray-500 text-sm text-center">
                Don't have an account?{' '}
                <Link href="/sign-up" className="text-orange hover:underline">
                  Create one
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-gray-500 hover:text-gray-400 text-sm">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}