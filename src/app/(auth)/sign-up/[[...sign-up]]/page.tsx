import { SignUp } from "@clerk/nextjs";
import { LogoMark } from "@/components/LogoMark";

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex justify-center">
          <LogoMark size={64} rounded="2xl" priority />
        </div>
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        <p className="text-gray-400 mt-2">Get started with TokenScope today</p>
      </div>
      <SignUp />
    </div>
  );
}
