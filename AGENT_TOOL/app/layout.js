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
  title: "YouTube Shorts AutoPoster - Quản Lý Kênh & Đăng Clip Tự Động",
  description: "Hệ thống quản lý và tự động đăng video YouTube Shorts chuyên nghiệp.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Heartbeat />
        {children}
      </body>
    </html>
  );
}

