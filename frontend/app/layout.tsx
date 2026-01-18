import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ToastProvider } from "./components/UI/ToastProvider";
import DeviceGate from "./components/UI/DeviceGate";

// Using DM Sans as the closest Google Sans alternative available on Google Fonts
// It has similar clean, geometric characteristics
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-google-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chronos-X | UIDAI Demand Forecasting",
  description: "AI-Powered Weather Forecast for Aadhaar - Predicting Migration, Settlement, and Labor Trends",
  keywords: ["UIDAI", "Aadhaar", "Forecasting", "AI", "Migration", "India"],
  authors: [{ name: "Team Chronos-X" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${GeistMono.variable}`}>
      <body className={dmSans.className}>
        <DeviceGate>
          <ToastProvider>
            {children}
          </ToastProvider>
        </DeviceGate>
      </body>
    </html>
  );
}
