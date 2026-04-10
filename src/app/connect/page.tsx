'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Link2, Check, Copy, RefreshCw, AlertCircle, Zap } from 'lucide-react';

export default function ConnectPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [connectionToken, setConnectionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate connection token when page loads
  useEffect(() => {
    if (isLoaded && user) {
      generateToken();
    }
  }, [isLoaded, user]);

  // If token in URL, verify it
  useEffect(() => {
    if (tokenFromUrl && isLoaded && user) {
      verifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl, isLoaded, user]);

  const generateToken = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/extension/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        }
      });

      if (res.ok) {
        const data = await res.json();
        setConnectionToken(data.token);
      } else {
        setError('Failed to generate connection token');
      }
    } catch (err) {
      setError('Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async (token: string) => {
    if (!user) return;

    setStatus('connecting');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${apiUrl}/extension/connect/verify?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': user.id
        }
      });

      if (res.ok) {
        setStatus('success');
        // Store user_id in localStorage for extension to use
        localStorage.setItem('tokenscope_user_id', user.id);
        // Redirect after 2 seconds
        setTimeout(() => router.push('/extension'), 2000);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to verify token');
        setStatus('error');
      }
    } catch (err) {
      setError('Failed to verify token');
      setStatus('error');
    }
  };

  const copyToken = async () => {
    if (connectionToken) {
      await navigator.clipboard.writeText(connectionToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
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
          <Link href="/sign-in" className="px-6 py-3 bg-orange text-black font-medium rounded-lg inline-block">
            Sign In
          </Link>
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

        {status === 'success' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-green-400 mb-2">Connected!</h2>
            <p className="text-gray-400">Your extension is now linked to your account</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to Extension Stats...</p>
          </div>
        ) : status === 'connecting' ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-orange border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Connecting...</h2>
            <p className="text-gray-400">Please wait while we verify the connection</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="text-orange" size={20} />
                <span className="font-medium">Connection Token</span>
              </div>

              {connectionToken ? (
                <>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm break-all mb-4">
                    {connectionToken}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={copyToken}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy Token'}
                    </button>
                    <button
                      onClick={generateToken}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <RefreshCw size={16} />
                      Refresh
                    </button>
                  </div>
                </>
              ) : loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-orange border-t-transparent rounded-full animate-spin" />
                </div>
              ) : null}
            </div>

            <div className="space-y-4 text-sm text-gray-400">
              <h3 className="font-medium text-white">How to connect:</h3>
              <ol className="list-decimal list-inside space-y-2 pl-4">
                <li>Copy the connection token above</li>
                <li>Open the TokenScope Chrome extension</li>
                <li>Click the "Connect" button in the extension popup</li>
                <li>Paste the token and click "Connect"</li>
              </ol>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-800">
              <Link href="/extension" className="block text-center text-gray-500 hover:text-white transition-colors">
                Skip for now - Go to Extension Stats
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Link(href: string) {
  return null;
}