import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
