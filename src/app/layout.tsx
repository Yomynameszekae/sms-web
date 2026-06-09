import type { Metadata } from 'next';
import {
  Geist,
  Hanken_Grotesk,
  Source_Serif_4,
  JetBrains_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
} from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans', display: 'swap' });

const hankenGrotesk = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-hanken-grotesk',
  display: 'swap',
});

const sourceSerif4 = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif-4',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

const fontVars = [
  geist.variable,
  hankenGrotesk.variable,
  sourceSerif4.variable,
  jetbrainsMono.variable,
  ibmPlexSans.variable,
  ibmPlexMono.variable,
].join(' ');

export const metadata: Metadata = {
  title: 'Brite SMS',
  description: 'Ghana School Management System',
};

const THEME_INIT_SCRIPT = `(function(){var t=['sand-clay','greige-sage','slate-peach','deep-navy','navy-gold'];try{var s=localStorage.getItem('brite-theme');if(s&&t.indexOf(s)!==-1){document.documentElement.dataset.theme=s;}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="navy-gold" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full bg-background font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
