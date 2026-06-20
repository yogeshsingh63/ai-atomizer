import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prism AI | Premium Content Repurposing Engine",
  description: "Repurpose long-form video, audio, or articles into blog posts, X threads, LinkedIn posts, and viral shorts suggestion clips using OpenRouter fallback model chains.",
  keywords: ["Prism AI", "Content Repurposing", "AI Blog Generator", "Social Media Threads", "OpenRouter fallback", "Video highlights"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground">
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
