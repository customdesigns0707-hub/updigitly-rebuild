import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { siteConfig } from '@/config/site';
import { CustomCursor } from '@/components/CustomCursor';
import { PanelGlow } from '@/components/PanelGlow';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Updigitly | Managed Digital Growth Partner',
    template: '%s | Updigitly',
  },
  description: siteConfig.description,
  openGraph: {
    title: 'Updigitly | Managed Digital Growth Partner',
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: 'Updigitly',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  themeColor: '#0A0B0F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Fonts loaded via <link> (not next/font) so the build never depends on
          a Google Fonts fetch and works on any network. Design DNA: Space
          Grotesk (display) · Inter (body) · JetBrains Mono (mono/data).
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@200;300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CustomCursor />
        <PanelGlow />
        {children}
        {/*
          PLACEHOLDER (Chat 2/3): GHL is retained as the CRM / workflow / comms
          layer only. If a web-chat widget is kept, it mounts here — deferred to
          the enrollment/comms chats so this foundation shell stays GHL-free.
        */}
        <Analytics />
      </body>
    </html>
  );
}
