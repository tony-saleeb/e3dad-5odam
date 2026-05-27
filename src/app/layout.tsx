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
};

export const metadata: Metadata = {
  title: "جدول حجوزات المشاريع",
  description: "ادارة حجوزات مشاريع تخرج اعداد خدام كنائس وسط القاهرة",
  keywords: ["كنيسة", "حجوزات", "جدول", "خدمات", "تقويم"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
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
      </body>
    </html>
  );
}
