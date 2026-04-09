import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "TokenScope — AI Token Analytics",
  description:
    "Track, analyze, and optimize your AI token usage across OpenAI, Anthropic, and Google Gemini.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230A0A0A'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' fill='%23FAF7F2' font-size='18' font-family='monospace' font-weight='bold'>T</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <body className="font-sans bg-cream text-black antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
