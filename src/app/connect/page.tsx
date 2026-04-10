'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Link2, Check, Copy, RefreshCw, AlertCircle, Zap, Loader2 } from 'lucide-react';

export default function ConnectPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualToken, setManualToken] = useState('');

  // Check if already connected on load
  useEffect(() => {
    const storedId = localStorage.getItem('tokenscope_user_id');
    if (storedId && storedId.startsWith('user_')) {
      setConnectionStatus('success');
    }
  }, []);

  // Save user ID to localStorage when logged in
  useEffect(() => {
    if (isLoaded && user) {
      localStorage.setItem('tokenscope_user_id', user.id);
      localStorage.setItem('tokenscope_user_email', user.emailAddresses[0]?.emailAddress || '');
    }
  }, [isLoaded, user]);

  const connectExtension = async () => {
    if (!user) return;

    setConnectionStatus('connecting');

    try {
      // 1. Get connection token from backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const tokenRes = await fetch(`${apiUrl}/extension/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        }
      });

      if (!tokenRes.ok) {
        throw new Error('Failed to generate connection token');
      }

      const tokenData = await tokenRes.json();

      // 2. Verify the token (this links the extension to this user)
      const verifyRes = await fetch(`${apiUrl}/extension/connect/verify?token=${tokenData.token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        }
      });

      if (!verifyRes.ok) {
        throw new Error('Failed to verify connection');
      }

      // 3. Save user ID to localStorage
      localStorage.setItem('tokenscope_user_id', user.id);
      localStorage.setItem('tokenscope_connection_token', tokenData.token);

      // 4. Try to notify extension
      try {
        const w = window as any;
        if (w.chrome?.runtime?.sendMessage) {
          w.chrome.runtime.sendMessage({
            type: 'SET_USER_CONTEXT',
            payload: {
              userId: user.id,
              email: user.emailAddresses[0]?.emailAddress,
              connected: true
            }
          });
        }
      } catch (e) {
        // Extension not available, that's ok
        console.log('Extension not found, user ID saved locally');
      }

      setConnectionStatus('success');

    } catch (err: any) {
      setError(err.message || 'Connection failed');
      setConnectionStatus('error');
    }
  };

  const handleManualConnect = () => {
    if (manualToken && user) {
      localStorage.setItem('tokenscope_user_id', user.id);
      localStorage.setItem('tokenscope_connection_token', manualToken);
      setConnectionStatus('success');
      setManualToken('');
    }
  };

  const copyUserId = async () => {
    if (user) {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Sign In Required</h1>
          <p className="text-gray-400 mb-6">Please sign in to connect your extension</p>
          <a href="/sign-in" className="inline-block px-6 py-3 bg-orange text-black font-medium rounded-lg">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange to-orange-light rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Link2 className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Connect Extension</h1>
          <p className="text-gray-400">Link your Chrome extension to your TokenScope account</p>
        </div>

        {connectionStatus === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-green-400 mb-2">Connected!</h2>
            <p className="text-gray-400 mb-4">Your extension is now linked to your account</p>
            <p className="text-sm text-gray-500 mb-6">User ID: {user.id.slice(0, 20)}...</p>
            <div className="flex gap-3 justify-center">
              <a href="/extension" className="px-6 py-3 bg-orange text-black font-medium rounded-lg">
                View Extension Stats
              </a>
              <button onClick={() => setConnectionStatus('idle')} className="px-6 py-3 bg-gray-800 text-white rounded-lg">
                Disconnect
              </button>
            </div>
          </div>
        ) : connectionStatus === 'connecting' ? (
          <div className="text-center py-8">
            <Loader2 className="w-16 h-16 mx-auto mb-4 text-orange animate-spin" />
            <h2 className="text-xl font-bold mb-2">Connecting...</h2>
            <p className="text-gray-400">Please wait while we link your extension</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Quick Connect Button */}
            <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="text-orange" size={20} />
                <span className="font-medium">Quick Connect</span>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Click the button below to instantly connect your extension to your account.
              </p>
              <button
                onClick={connectExtension}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange hover:bg-orange-light text-black font-semibold rounded-lg transition-colors"
              >
                <Zap size={20} />
                Connect Extension Now
              </button>
            </div>

            {/* Current User Info */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Current User</span>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Signed In</span>
              </div>
              <div className="font-mono text-sm truncate">{user.id}</div>
              <button
                onClick={copyUserId}
                className="mt-2 text-sm text-orange hover:text-orange-light flex items-center gap-1"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy User ID'}
              </button>
            </div>

            {/* Manual Connection */}
            <div className="border-t border-gray-800 pt-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Manual Connection</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste connection token"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-orange"
                />
                <button
                  onClick={handleManualConnect}
                  disabled={!manualToken}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Connect
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-800 text-center">
              <a href="/extension" className="text-gray-500 hover:text-white transition-colors text-sm">
                Skip for now - Go to Extension Stats
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}