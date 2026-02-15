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
    default: "audioshlf - Organize Your Audiobook Library",
    template: "%s | audioshlf",
  },
  description:
    "Sync your Audible library, browse your audiobook collection, and organize your listening with audioshlf.",
  keywords: ["audible", "audiobooks", "library", "organization", "book tracker", "audioshlf"],
  authors: [{ name: "audioshlf" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://audioshlf.app",
    title: "audioshlf - Organize Your Audiobook Library",
    description:
      "Sync your Audible library, browse your audiobook collection, and organize your listening with audioshlf.",
    siteName: "audioshlf",
  },
  twitter: {
    card: "summary_large_image",
    title: "audioshlf - Organize Your Audiobook Library",
    description:
      "Sync your Audible library, browse your audiobook collection, and organize your listening with audioshlf.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
