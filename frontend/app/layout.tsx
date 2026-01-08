import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "./components/UI/ToastProvider";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

