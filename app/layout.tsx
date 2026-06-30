import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'YOU SABI BALL — Draft · Court · Glory',
  description: 'Draft five NBA stars, run the playoffs, chase the title.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased" style={{ background: '#16181D', margin: 0, overflowX: 'hidden' }}>{children}</body>
    </html>
  );
}
