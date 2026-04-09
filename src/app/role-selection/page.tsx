'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Code, User, ArrowRight, Zap, BarChart3, Sparkles, Shield } from 'lucide-react';

export default function RoleSelectionPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleRoleSelect = async (role: 'developer' | 'user') => {
    if (!user) return;
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      await fetch(`${apiUrl}/scores/set-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          role: role
        })
      });

      // Redirect based on role
      if (role === 'developer') {
        router.push('/dashboard');
      } else {
        router.push('/user-dashboard');
      }
    } catch (error) {
      console.error('Failed to set role:', error);
      setLoading(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-orange to-orange-light rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <span className="text-black font-bold text-2xl">TS</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Welcome to TokenScope!
          </h1>
          <p className="text-gray-400 text-lg">
            Hello {user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0]}! How will you use TokenScope?
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Developer Card */}
          <button
            onClick={() => handleRoleSelect('developer')}
            disabled={loading}
            className="group relative bg-gray-900 border-2 border-gray-800 hover:border-orange rounded-2xl p-8 text-left transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-5 h-5 text-orange" />
            </div>

            <div className="w-14 h-14 bg-orange/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange/20 transition-colors">
              <Code className="w-7 h-7 text-orange" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">Developer</h2>
            <p className="text-gray-400 mb-6">
              Create proxy URLs, track API usage, integrate with your applications, and access advanced analytics.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                  <Shield className="w-3 h-3 text-green-400" />
                </div>
                API key management
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 text-blue-400" />
                </div>
                Advanced analytics
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                  <Code className="w-3 h-3 text-purple-400" />
                </div>
                Proxy integration
              </div>
            </div>
          </button>

          {/* User Card */}
          <button
            onClick={() => handleRoleSelect('user')}
            disabled={loading}
            className="group relative bg-gray-900 border-2 border-gray-800 hover:border-blue-500 rounded-2xl p-8 text-left transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-5 h-5 text-blue-400" />
            </div>

            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
              <User className="w-7 h-7 text-blue-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">User</h2>
            <p className="text-gray-400 mb-6">
              Optimize prompts, track your attention score, see insights and improvements, and use the browser extension.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-orange" />
                </div>
                Prompt optimization
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                  <Zap className="w-3 h-3 text-yellow-400" />
                </div>
                Attention score
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <div className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 text-green-400" />
                </div>
                Usage insights
              </div>
            </div>
          </button>
        </div>

        {/* Info Text */}
        <p className="text-center text-gray-500 text-sm mt-8">
          You can change your role anytime from settings. This helps us personalize your experience.
        </p>

        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}