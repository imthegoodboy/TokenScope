import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-8 py-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-jaffa rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-lg tracking-tight">TokenScope</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">
              Create your account
            </h1>
            <p className="text-sm opacity-60">
              Start tracking and optimizing your AI spend
            </p>
          </div>
          <SignUp />
        </div>
      </div>
    </div>
  );
}
