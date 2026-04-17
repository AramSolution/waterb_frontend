import { API_CONFIG, FILES } from "@/shared/config/api";

/** GET /api/v1/files/download 전체 URL (apiClient BASE_URL과 동일 규칙) */
export function buildWaterbFileDownloadUrl(
  fileId: string | number,
  seq: string | number,
): string {
  const base = (API_CONFIG.BASE_URL ?? "").replace(/\/$/, "");
  const qs = new URLSearchParams({
    fileId: String(fileId),
    seq: String(seq),
  });
  return `${base}${FILES.DOWNLOAD}?${qs.toString()}`;
}

function sanitizeDownloadFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "download";
  return trimmed.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 200);
}

/**
 * Content-Disposition에서 파일명 추출 (filename* UTF-8 우선)
 */
function fileNameFromContentDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) return sanitizeDownloadFileName(fallback);
  const star = header.match(/filename\*\s*=\s*([^']*?)''([^;\s]+)/i);
  if (star?.[2]) {
    try {
      return sanitizeDownloadFileName(decodeURIComponent(star[2]));
    } catch {
      /* ignore */
    }
  }
  const quoted = header.match(/filename\s*=\s*"((?:\\.|[^"\\])*)"/i);
  if (quoted?.[1]) {
    return sanitizeDownloadFileName(quoted[1].replace(/\\(.)/g, "$1"));
  }
  const plain = header.match(/filename\s*=\s*([^;\s]+)/i);
  if (plain?.[1]) {
    return sanitizeDownloadFileName(plain[1].replace(/^"+|"+$/g, ""));
  }
  return sanitizeDownloadFileName(fallback);
}

/**
 * GET `/api/v1/files/download`로 첨부 저장 (비로그인 가능 — 백엔드 permitAll 전제).
 * 로그인 시에만 `Authorization`에 sessionStorage accessToken 전달.
 * fileId는 JSON 문자열로 온 값을 그대로 넘기면 됨 (BigInt 정밀도 이슈 없음)
 */
export async function downloadWaterbAttachment(
  fileId: string | number,
  seq: string | number,
  fallbackFileName?: string,
): Promise<void> {
  if (typeof window === "undefined") return;

  const token = sessionStorage.getItem("accessToken");
  const url = buildWaterbFileDownloadUrl(fileId, seq);

  const headers: Record<string, string> = {
    Accept: "application/octet-stream,*/*",
  };
  if (token) {
    headers.Authorization = token;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      text?.trim() || `다운로드에 실패했습니다. (${response.status})`,
    );
  }

  const blob = await response.blob();
  const headerName = response.headers.get("Content-Disposition");
  const fallback = fallbackFileName?.trim() || "download";
  const fileName = fileNameFromContentDisposition(headerName, fallback);

  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * 먼저 `/api/v1/files/download` 시도(비로그인 포함).
 * 비로그인이고 다운로드 실패 시에만 `viewUrl` 새 창(미리보기).
 * 로그인 상태에서 다운로드 실패 시 알림만 함.
 */
export async function downloadWaterbAttachmentOrOpenView(
  fileId: string | number,
  seq: string | number,
  viewUrl: string,
  fallbackFileName?: string,
): Promise<void> {
  if (typeof window === "undefined") return;
  const token = sessionStorage.getItem("accessToken");
  try {
    await downloadWaterbAttachment(fileId, seq, fallbackFileName);
    return;
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "파일을 다운로드하지 못했습니다.";
    if (!token) {
      window.open(viewUrl, "_blank", "noopener,noreferrer");
      return;
    }
    alert(msg);
  }
}
