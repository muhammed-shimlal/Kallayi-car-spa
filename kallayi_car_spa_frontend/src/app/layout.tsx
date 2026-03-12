import type { Metadata } from "next";
import { Syncopate, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const syncopate = Syncopate({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-syncopate",
});

const jakarta = Plus_Jakarta_Sans({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const grotesk = Space_Grotesk({
  weight: ["500", "700"],
  subsets: ["latin"],
  variable: "--font-grotesk",
});

export const metadata: Metadata = {
  title: "Kallayi Car Spa",
  description: "Premium cinematic car spa experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syncopate.variable} ${jakarta.variable} ${grotesk.variable} antialiased bg-obsidian text-white`}
      >
        {children}
      </body>
    </html>
  );
}
