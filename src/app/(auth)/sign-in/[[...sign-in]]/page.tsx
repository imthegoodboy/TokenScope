import { SignIn } from "@clerk/nextjs";
import { LogoMark } from "@/components/LogoMark";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <LogoMark size={64} rounded="2xl" priority />
        </div>
        <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
        <p className="text-gray-400 mt-2">Sign in to your TokenScope account</p>
      </div>
      <SignIn />
    </div>
  );
}
