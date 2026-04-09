import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange to-orange-light rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <span className="text-black font-bold text-2xl">TS</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        <p className="text-gray-400 mt-2">Get started with TokenScope today</p>
      </div>
      <SignUp fallbackRedirectUrl="/role-selection" signInFallbackRedirectUrl="/role-selection" />
    </div>
  );
}