/**
 * 선정 업무 녹화 공통 유틸 (MediaRecorder 옵션, 파일명, 다운로드).
 * 서버 전송 없음.
 */

/** 기본 목표 비트레이트 — `computeSelectionRecordingVideoBitrate`로 동적 지정 권장 */
export const SELECTION_RECORDING_VIDEO_BITS_PER_SECOND = 8_000_000;

/**
 * 캔버스 픽셀 수·fps에 맞춰 VP9/WebM에 쓸 비트레이트 추정 (과소면 블록, 과대면 파일만 커짐).
 */
export function computeSelectionRecordingVideoBitrate(
  canvasWidth: number,
  canvasHeight: number,
  fps: number,
): number {
  const pixels = canvasWidth * canvasHeight;
  const raw = Math.round((pixels * fps) / 6000);
  return Math.min(25_000_000, Math.max(6_000_000, raw));
}

export function buildSelectionMediaRecorderOptions(
  mimeType: string | undefined,
  videoBitsPerSecond: number = SELECTION_RECORDING_VIDEO_BITS_PER_SECOND,
): MediaRecorderOptions {
  const o: MediaRecorderOptions = {
    videoBitsPerSecond,
  };
  if (mimeType) o.mimeType = mimeType;
  return o;
}

export type SelectionRecordingHandle = {
  /** 녹화 종료 후 Blob 반환 (트랙 정지 포함) */
  stop: () => Promise<Blob>;
  /** 언마운트·오류 시 트랙만 정리 (파일 생성 없음) */
  dispose: () => void;
};

export function formatSelectionRecordingFilename(prefix: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${prefix}_${stamp}.webm`;
}

export function downloadRecordingBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
