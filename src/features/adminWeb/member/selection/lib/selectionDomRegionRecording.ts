/**
 * 선정 카드(DOM) 영역만 html2canvas → Canvas → captureStream → MediaRecorder 로 녹화.
 * 화면/탭 공유 없이 브라우저 내부에서만 처리합니다.
 */
import html2canvas from "html2canvas";
import {
  buildSelectionMediaRecorderOptions,
  computeSelectionRecordingVideoBitrate,
  type SelectionRecordingHandle,
} from "./selectionScreenRecording";

/** html2canvas·출력 캔버스 공통 배율 (CSS 크기 × scale = 녹화 픽셀) */
const DEFAULT_CAPTURE_SCALE = 2.5;

function pickRecorderMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return undefined;
}

export type DomRegionRecordingOptions = {
  /** 목표 초당 프레임 (실제는 html2canvas 속도에 따라 더 낮아질 수 있음) */
  fps?: number;
  /** 캡처 가로·세로 상한 (CSS 픽셀), 메모리·성능 보호 */
  maxSide?: number;
  /** 1보다 크면 텍스트·테두리가 선명해짐 (대신 CPU·메모리↑). 기본 2.5 */
  scale?: number;
  /**
   * 세로(CSS px) 상한. 행이 매우 많으면 scrollHeight가 커져 캔버스·html2canvas가 폭주하므로
   * 지정 시 상단부터 이 높이만큼만 캡처합니다.
   */
  maxCssHeight?: number;
};

/**
 * @param element 녹화할 루트 요소 (보통 선정 카드 전체)
 */
export async function startDomRegionRecording(
  element: HTMLElement | null | undefined,
  options?: DomRegionRecordingOptions,
): Promise<SelectionRecordingHandle | null> {
  if (!element || typeof window === "undefined") return null;

  const fps = Math.min(24, Math.max(4, options?.fps ?? 10));
  const maxSide = options?.maxSide ?? 2048;
  const scale = Math.min(3, Math.max(1, options?.scale ?? DEFAULT_CAPTURE_SCALE));

  const w = Math.min(Math.max(2, Math.ceil(element.scrollWidth)), maxSide);
  const rawH = Math.min(Math.max(2, Math.ceil(element.scrollHeight)), maxSide * 2);
  const h =
    options?.maxCssHeight != null
      ? Math.min(rawH, Math.max(2, options.maxCssHeight))
      : rawH;

  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const stream = canvas.captureStream(fps);
  const chunks: BlobPart[] = [];
  const mimeType = pickRecorderMimeType();
  const videoBits = computeSelectionRecordingVideoBitrate(outW, outH, fps);
  const recorder = new MediaRecorder(
    stream,
    buildSelectionMediaRecorderOptions(mimeType, videoBits),
  );

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const cleanupTracks = () => {
    stream.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        /* noop */
      }
    });
  };

  let running = true;

  const captureLoop = async () => {
    while (running && element.isConnected) {
      const t0 = performance.now();
      try {
        const snap = await html2canvas(element, {
          scale,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: w,
          height: h,
        });
        if (!running || !element.isConnected) break;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(snap, 0, 0, snap.width, snap.height, 0, 0, outW, outH);
      } catch {
        /* 프레임 스킵 */
      }
      const elapsed = performance.now() - t0;
      const wait = Math.max(0, 1000 / fps - elapsed);
      await new Promise((r) => setTimeout(r, wait));
    }
  };

  void captureLoop();

  recorder.start(250);

  let stopped = false;

  const stop = (): Promise<Blob> =>
    new Promise((resolve, reject) => {
      if (stopped) {
        running = false;
        cleanupTracks();
        resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
        return;
      }
      stopped = true;
      running = false;

      if (recorder.state === "inactive") {
        cleanupTracks();
        resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
        return;
      }

      recorder.addEventListener(
        "stop",
        () => {
          cleanupTracks();
          resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
        },
        { once: true },
      );
      recorder.addEventListener(
        "error",
        () => {
          cleanupTracks();
          reject(new Error("MediaRecorder 오류"));
        },
        { once: true },
      );

      try {
        recorder.stop();
      } catch {
        cleanupTracks();
        resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
      }
    });

  const dispose = () => {
    if (stopped) return;
    stopped = true;
    running = false;
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      /* noop */
    }
    cleanupTracks();
  };

  return { stop, dispose };
}
