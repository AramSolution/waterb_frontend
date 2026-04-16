#!/usr/bin/env node
/**
 * Docker 볼륨 HMR 트리거 스크립트
 * Windows Docker Desktop 환경에서 inotify 이벤트가 전달되지 않을 때
 * fs.stat() 폴링으로 변경을 감지하고, 파일을 다시 써서 inotify 이벤트를 직접 생성합니다.
 */

const fs = require('fs');
const path = require('path');

const WATCH_DIRS = ['/app/src', '/app/public'];
const POLL_INTERVAL_MS = 1000;
const FILE_EXTENSIONS = /\.(ts|tsx|js|jsx|css|scss|sass|json|mdx|md)$/;

const mtimes = new Map();

function triggerFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 1단계: 파일 끝에 공백 주석 추가 → 실제 내용 변화로 Turbopack 재컴파일 강제
    fs.writeFileSync(filePath, content + '\n// hmr\n', 'utf8');

    // 2단계: 100ms 후 원본으로 복원 → 소스 코드 유지
    setTimeout(() => {
      try {
        fs.writeFileSync(filePath, content, 'utf8');
      } catch (_) {}
      // 3단계: 복원 후 mtime 갱신 → 무한 폴링 루프 방지
      // (갱신하지 않으면 다음 폴링에서 복원된 mtime을 "새 변경"으로 감지해 무한 재트리거 발생)
      try {
        const { mtimeMs } = fs.statSync(filePath);
        mtimes.set(filePath, mtimeMs);
      } catch (_) {}
    }, 100);

    console.log(`[HMR Trigger] 변경 감지 → ${filePath}`);
  } catch (e) {
    try {
      const now = new Date();
      fs.utimesSync(filePath, now, now);
    } catch (_) {}
  }
}

function scanDir(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && FILE_EXTENSIONS.test(entry.name)) {
        try {
          const { mtimeMs } = fs.statSync(fullPath);
          if (mtimes.has(fullPath) && mtimes.get(fullPath) !== mtimeMs) {
            triggerFile(fullPath);
          }
          mtimes.set(fullPath, mtimeMs);
        } catch (_) {}
      }
    }
  } catch (_) {}
}

// 초기 스캔 (기준 mtime 수집)
WATCH_DIRS.forEach(dir => {
  if (fs.existsSync(dir)) scanDir(dir);
});

console.log(`[HMR Trigger] 폴링 시작 (${POLL_INTERVAL_MS}ms 간격)...`);
console.log(`[HMR Trigger] 감시 디렉토리: ${WATCH_DIRS.join(', ')}`);

setInterval(() => {
  WATCH_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) scanDir(dir);
  });
}, POLL_INTERVAL_MS);
