import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google';
import { ErrorBoundary } from '@/shared/components/error-boundary';
import { OfflineIndicator } from '@/shared/components/offline-indicator';
import { ServiceWorkerRegistration } from '@/shared/components/service-worker-registration';
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'], 
});

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-ibm-plex-serif",
  subsets: ["latin"],
  weight: ['400', '700'], 
  style: ['normal', 'italic'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'], 
});

export const metadata: Metadata = {
  title: "Youtube Viewer",
  description: "View and curate your favorite Youtube videos.",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#1E1E1E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${ibmPlexSans.variable} ${ibmPlexSerif.variable} ${ibmPlexMono.variable}`}>
      <body className={`antialiased`}>
        <ServiceWorkerRegistration />
        <OfflineIndicator />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
