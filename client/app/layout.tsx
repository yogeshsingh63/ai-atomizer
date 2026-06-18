import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "AI Atomizer | Premium Content Repurposing Engine",
  description: "Repurpose long-form video, audio, or articles into blog posts, Twitter threads, LinkedIn posts, and viral shorts suggestion clips using OpenRouter fallback model chains.",
  keywords: ["AI Content Repurposing", "AI Blog Generator", "Social Media Threads", "OpenRouter fallback", "Video highlights"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground">
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
