import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Audible Lists - Organize & Share Your Audiobook Library",
    template: "%s | Audible Lists",
  },
  description: "Sync your Audible library, browse your audiobook collection, and create recommendation lists to share with friends.",
  keywords: ["audible", "audiobooks", "library", "lists", "recommendations", "book tracker"],
  authors: [{ name: "Audible Lists" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://audiblelists.com",
    title: "Audible Lists - Organize & Share Your Audiobook Library",
    description: "Sync your Audible library, browse your audiobook collection, and create recommendation lists to share with friends.",
    siteName: "Audible Lists",
  },
  twitter: {
    card: "summary_large_image",
    title: "Audible Lists - Organize & Share Your Audiobook Library",
    description: "Sync your Audible library, browse your audiobook collection, and create recommendation lists to share with friends.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
