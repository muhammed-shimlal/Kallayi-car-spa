import type { Metadata } from "next";
import { Syncopate, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { Toaster } from "sonner";
import QueryProvider from "@/components/providers/QueryProvider";
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
        <Toaster 
          position="top-right" 
          theme="dark" 
          richColors 
          closeButton
          toastOptions={{
            style: {
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
              padding: '14px 18px',
              fontSize: '14px',
              fontWeight: 600,
            },
          }} 
        />
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
