import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <div className="px-8 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 relative">
            <Image src="/logo.svg" alt="TokenScope" width={32} height={32} />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight leading-none">TokenScope</span>
            <span className="block text-[10px] text-black-soft tracking-wide uppercase">Token Analytics</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Create your account</h1>
            <p className="text-sm opacity-60">Start tracking and optimizing your AI spend</p>
          </div>
          <SignUp />
        </div>
      </div>
    </div>
  );
}
