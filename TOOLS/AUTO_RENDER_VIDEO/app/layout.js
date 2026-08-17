import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import Heartbeat from "@/components/Heartbeat.js";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Video Studio & Auto Render Video - ATPOSTER",
  description: "Hệ thống tự động biên soạn kịch bản AI, lồng tiếng TTS và render video Remotion chuyên nghiệp.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=Itim&family=Paytone+One&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <Heartbeat />
        {children}
      </body>
    </html>
  );
}

