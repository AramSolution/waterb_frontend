import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "홈페이지",
  description: "군산시 꿈이음센터",
  keywords: ["홈페이지", "꿈이음센터", "진로", "청소년"],
  openGraph: {
    title: "홈페이지",
    description: "군산시 꿈이음센터",
    url: "https://ieum.gunsan.go.kr",
    siteName: "홈페이지",
    locale: "ko_KR",
    type: "website",
  },
  verification: {
    other: {
      "naver-site-verification": "40d14255e03c49360216746df45a4f4d0ca4ffce",
    },
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
