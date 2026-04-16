import type { MetadataRoute } from "next";

const BASE_URL = "https://ieum.gunsan.go.kr";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // 메인
    {
      url: `${BASE_URL}/userWeb`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    // 센터 소개
    {
      url: `${BASE_URL}/userWeb/intro`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // 일정
    {
      url: `${BASE_URL}/userWeb/schedule`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // 사업 안내
    {
      url: `${BASE_URL}/userWeb/bizInfoPr`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/userWeb/bizInfo`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/userWeb/bizInfoCt`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/userWeb/bizInfoVd`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/userWeb/bizInfoRc`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/userWeb/bizInfoDm`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/userWeb/bizInfoGc`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // 진로상담 캘린더
    {
      url: `${BASE_URL}/userWeb/careerConsulting/calendar`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // 학원 정보
    {
      url: `${BASE_URL}/userWeb/academy`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    // 커뮤니티
    {
      url: `${BASE_URL}/userWeb/community`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    // 공지사항
    {
      url: `${BASE_URL}/userWeb/notice`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    // Q&A
    {
      url: `${BASE_URL}/userWeb/qna`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    // 이용약관
    {
      url: `${BASE_URL}/userWeb/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
