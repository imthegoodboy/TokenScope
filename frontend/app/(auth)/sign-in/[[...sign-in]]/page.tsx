import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Logo */}
      <div className="px-8 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-cream" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-lg tracking-tight">TokenScope</span>
        </Link>
      </div>

      {/* Sign In */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-black mb-2">Welcome back</h1>
            <p className="text-sm text-black-muted">
              Sign in to track your AI token usage
            </p>
          </div>
          <SignIn />
        </div>
      </div>
    </div>
  );
}
