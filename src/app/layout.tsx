import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google';
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'], // Include weights you'll use
});

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-ibm-plex-serif",
  subsets: ["latin"],
  weight: ['400', '700'], // Include weights you'll use
  style: ['normal', 'italic'],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'], // Include weights you'll use
});

export const metadata: Metadata = {
  title: "Youtube Viewer", // Updated title
  description: "View and curate your favorite Youtube videos.", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${ibmPlexSans.variable} ${ibmPlexSerif.variable} ${ibmPlexMono.variable}`}>
      <body className={`antialiased`}> {/* Main body font is controlled by html tag now for simplicity, or explicitly font-sans via Tailwind */}
        {children}
      </body>
    </html>
  );
}

