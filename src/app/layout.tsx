import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenScope - AI Proxy & Token Analytics",
  description: "Smart LLM proxy with token-level analytics and prompt optimization",
  icons: {
    icon: "/tokenscope-logo.png",
    apple: "/tokenscope-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
