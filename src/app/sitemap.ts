import type { MetadataRoute } from "next";

const BASE_URL = "https://ieum.gunsan.go.kr";

/** 사용자웹 제거 후: 공개 인덱싱 대상은 사이트 루트만 유지 (관리자 경로는 robots에서 제외) */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
}
