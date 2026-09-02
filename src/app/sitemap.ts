import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";

/** 관리자 경로는 robots에서 제외 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!BASE_URL) {
    return [];
  }
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ];
}
