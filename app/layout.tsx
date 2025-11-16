import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DubTitle - YouTube双字幕系统",
  description: "极简YouTube双字幕显示系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
