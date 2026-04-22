/** @type {import('next').NextConfig} */
const path = require("path");

// 상위 폴더에 package-lock이 있으면 Next가 워크스페이스 루트를 잘못 잡을 수 있음 → Turbopack 루트 고정
const turbopackRoot = path.join(__dirname);

/**
 * `api.ts`, `Dockerfile` ARG/ENV, `docker-compose.yml`, 백엔드 context-path, `nginx`와 `/water` 경로를 맞출 것.
 *
 * NEXT_PUBLIC_API_BASE_URL과 동일한 백엔드로 /water 프록시 (로컬 상대경로 axios용).
 * 우선순위: WATER_REWRITE_DESTINATION > NEXT_PUBLIC_API_BASE_URL 기반 > dev 기본 호스트
 * Docker(dev.uaram): nginx가 먼저 /water를 백엔드로 넘기면 Next rewrite는 타지 않음.
 */
function resolveBackendWaterBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  const fallbackHost = "https://dev.uaram.co.kr";
  if (!raw || String(raw).trim() === "" || raw === "undefined") {
    return `${fallbackHost.replace(/\/$/, "")}/water`;
  }
  let base = String(raw).trim().replace(/\/$/, "");
  if (!base.endsWith("/water")) {
    base = `${base}/water`;
  }
  return base;
}

const WATER_REWRITE_BASE = (
  process.env.WATER_REWRITE_DESTINATION || resolveBackendWaterBaseUrl()
).replace(/\/$/, "");

const nextConfig = {
  turbopack: {
    root: turbopackRoot,
  },
  allowedDevOrigins: [
    "dev.uaram.co.kr",
    "test3.uaram.co.kr",
    "ieum.gunsan.go.kr",
    "localhost",
    "127.0.0.1",
  ],
  reactStrictMode: false,
  output: "standalone",
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/.well-known/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/water/:path*",
        destination: `${WATER_REWRITE_BASE}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
