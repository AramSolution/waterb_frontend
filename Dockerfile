# ===========================================
# Stage 1: 빌드 스테이지
# ===========================================
FROM node:20-alpine AS builder

# 한글 locale / 시간대 설정
RUN apk add --no-cache tzdata
ENV TZ=Asia/Seoul
ENV LANG=ko_KR.UTF-8
ENV LANGUAGE=ko_KR:ko
ENV LC_ALL=ko_KR.UTF-8

WORKDIR /app

# 의존성 파일 먼저 복사 (레이어 캐시 활용)
COPY package.json package-lock.json ./
RUN npm ci

# 소스 코드 전체 복사
COPY . .

# NEXT_PUBLIC_* 빌드 타임 환경변수 (번들에 포함됨)
# [WATERB_MIGRATION_B] EDREAM_REWRITE_* 이름·값 — next.config.js rewrites·docker-compose·백엔드 context-path와 함께 일괄 변경
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_PAGE_SIZE
ARG EDREAM_REWRITE_DESTINATION
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_PAGE_SIZE=$NEXT_PUBLIC_PAGE_SIZE
ENV EDREAM_REWRITE_DESTINATION=$EDREAM_REWRITE_DESTINATION

# 텔레메트리 비활성화
ENV NEXT_TELEMETRY_DISABLED=1

# 프로덕션 빌드 실행 → .next/standalone 생성
RUN npm run build

# ===========================================
# Stage 2: 실행 스테이지 (경량 이미지)
# ===========================================
FROM node:20-alpine AS runner

# 한글 locale / 시간대 설정
RUN apk add --no-cache tzdata
ENV TZ=Asia/Seoul
ENV LANG=ko_KR.UTF-8
ENV LANGUAGE=ko_KR:ko
ENV LC_ALL=ko_KR.UTF-8

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 보안을 위한 비루트 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone 빌드 결과물만 복사 (최소 파일만 포함)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# standalone 모드: node server.js로 실행
CMD ["node", "server.js"]
