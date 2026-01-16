import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FlowgladProvider } from "@flowglad/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TownHall - Real-time Multilingual Voice Chat",
  description: "Speak your language, hear theirs. Real-time voice chat with automatic translation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FlowgladProvider loadBilling={true}>
          {children}
        </FlowgladProvider>
      </body>
    </html>
  );
}
