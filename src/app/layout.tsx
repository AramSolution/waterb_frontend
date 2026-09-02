import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";

export const metadata: Metadata = {
  title: "김제시 상하수도 관리",
  description: "김제시 상하수도 관리",
  keywords: ["김제시", "상하수도", "오수", "관리"],
  icons: {
    icon: "/images/logo_small.png",
    shortcut: "/images/logo_small.png",
    apple: "/images/logo_small.png",
  },
  openGraph: {
    title: "김제시 상하수도 관리",
    description: "김제시 상하수도 관리",
    ...(siteUrl ? { url: siteUrl } : {}),
    siteName: "김제시 상하수도 관리",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
