import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { BookingsProvider } from "@/contexts/BookingsContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { SettingsProvider } from "@/contexts/SettingsContext";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#059669',
};

export const metadata: Metadata = {
  title: "جدول حجوزات المشاريع",
  description: "ادارة حجوزات مشاريع تخرج اعداد خدام كنائس وسط القاهرة",
  keywords: ["كنيسة", "حجوزات", "جدول", "خدمات", "تقويم"],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'إعداد 5odam',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${cairo.variable} font-sans antialiased bg-slate-50`}>
        <SettingsProvider>
          <AuthProvider>
            <BookingsProvider>
              <ModalProvider>
                {children}
              </ModalProvider>
            </BookingsProvider>
          </AuthProvider>
        </SettingsProvider>
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

