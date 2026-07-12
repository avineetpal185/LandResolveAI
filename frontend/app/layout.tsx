import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://landresolve-ai.vercel.app"),
  title: {
    default: "LandResolve AI",
    template: "%s | LandResolve AI",
  },
  description:
    "AI-powered legal guidance platform for land disputes, property documents, Jamabandi, Mutation, Registry, and legal assistance in India.",

  applicationName: "LandResolve AI",

  keywords: [
    "LandResolve AI",
    "Land Dispute",
    "Property Law",
    "Legal AI",
    "Jamabandi",
    "Mutation",
    "Registry",
    "Punjab Land Records",
    "AI Legal Assistant",
  ],

  authors: [{ name: "LandResolve AI Team" }],

  creator: "LandResolve AI",

  openGraph: {
    title: "LandResolve AI",
    description:
      "AI-powered legal guidance platform for land disputes and property documents.",
    siteName: "LandResolve AI",
    url: "https://landresolve-ai.vercel.app",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "LandResolve AI",
    description:
      "AI-powered legal guidance platform for land disputes.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
