"use client";

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import Quill from "quill";
import QuillTableBetter from "quill-table-better";
import "quill/dist/quill.snow.css";
import "quill-table-better/dist/quill-table-better.css";

Quill.register({ "modules/table-better": QuillTableBetter }, true);

/** 이미지 업로드: 서버 업로드 시 (file) => Promise<이미지 URL> 전달. 없으면 Base64 데이터 URL 사용 */
export interface RichTextEditorClientProps {
  name: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  error?: string;
  minHeight?: string;
  readOnly?: boolean;
  /** 이미지 업로드 시 호출. URL 반환 시 해당 URL로 삽입, 미제공 시 Base64로 삽입 */
  onImageUpload?: (file: File) => Promise<string>;
}

export interface RichTextEditorHandle {
  getValue: () => string;
}

/** Quill 인스턴스 옵션 — 표 모듈(quill-table-better) 포함 */
function createQuillModules(): Record<string, unknown> {
  return {
    table: false,
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      ["image"],
      ["table-better"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      ["clean"],
    ],
    "table-better": {
      language: "en_US",
      menus: ["column", "row", "merge", "table", "cell", "wrap", "copy", "delete"],
      toolbarTable: true,
    },
    keyboard: {
      bindings: QuillTableBetter.keyboardBindings,
    },
  };
}

const IMAGE_ACCEPT = "image/png,image/jpeg,image/jpg,image/gif,image/webp";
const IMAGE_MAX_SIZE_MB = 5;
const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024;

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Quill 빈 내용 패턴 */
const EMPTY_PATTERNS = ["<p><br></p>", "<p></p>", "<p><br/></p>"];

function normalize(html: string): string {
  const t = (html || "").trim();
  return EMPTY_PATTERNS.includes(t) ? "" : t;
}

/**
 * 백엔드에서 HTML 엔티티로 이스케이프되어 내려오는 경우 디코딩.
 * 예) &lt;h1&gt;제목&lt;/h1&gt; → <h1>제목</h1>
 * 이미 정상 HTML인 경우 치환 대상이 없으므로 그대로 반환.
 */
function decodeHtmlEntities(html: string): string {
  if (!html.includes("&")) return html;
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, "\u00a0")
    .replace(/&amp;/g, "&"); // &amp;는 마지막에 처리
}

/**
 * Quill 2.x 기준으로 HTML을 에디터에 설정.
 * 표(table-better) 호환을 위해 빈 상태 후 updateContents로 적용.
 */
function setEditorContent(quill: Quill, html: string): void {
  // HTML 엔티티 디코딩 후 처리
  const content = decodeHtmlEntities((html || "").trim());

  if (!content) {
    quill.setContents([], "silent");  
    return;
  }

  try {
    // Quill 2.x: { html: string } — 표는 setContents보다 updateContents가 안전(quill-table-better 권장)
    const delta = quill.clipboard.convert({ html: content } as Parameters<typeof quill.clipboard.convert>[0]);
    quill.setContents([], "silent");
    quill.updateContents(delta, "silent");
  } catch {
    // fallback: innerHTML 직접 설정
    try {
      quill.root.innerHTML = content;
    } catch {
      /* 무시 */
    }
  }
}

export const RichTextEditorClient = forwardRef<
  RichTextEditorHandle,
  RichTextEditorClientProps
>(
  (
    {
      value,
      onChange,
      placeholder = "내용을 입력하세요",
      error,
      minHeight = "300px",
      readOnly = false,
      onImageUpload,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<Quill | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    /**
     * 마지막으로 에디터에 설정된 값(외부 or 내부).
     * 외부 value 변경이 내부에서 발생한 변경인지 판별하는 데 사용.
     */
    const lastKnownValueRef = useRef<string>("");
    const onChangeRef = useRef(onChange);
    const onImageUploadRef = useRef(onImageUpload);
    useEffect(() => {
      onChangeRef.current = onChange;
    });
    useEffect(() => {
      onImageUploadRef.current = onImageUpload;
    });

    /** 부모에서 에디터의 최신 HTML을 직접 가져올 수 있도록 노출 */
    useImperativeHandle(ref, () => ({
      getValue: () => {
        const quill = quillRef.current;
        if (!quill) return value || "";
        const tableBetter = quill.getModule("table-better") as
          | { deleteTableTemporary?: (source?: string) => void }
          | undefined;
        try {
          tableBetter?.deleteTableTemporary?.(Quill.sources.SILENT);
        } catch {
          /* noop */
        }
        const html =
          typeof (quill as { getSemanticHTML?: () => string }).getSemanticHTML ===
          "function"
            ? (quill as { getSemanticHTML: () => string }).getSemanticHTML()
            : quill.root.innerHTML;
        return normalize(html);
      },
    }));

    /** 이미지 파일 선택 시 에디터에 삽입 (Base64 또는 onImageUpload URL) */
    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !quillRef.current) return;
      const quill = quillRef.current;
      const range = quill.getSelection(true);
      if (!range) return;
      if (file.size > IMAGE_MAX_SIZE_BYTES) {
        alert(`이미지는 ${IMAGE_MAX_SIZE_MB}MB 이하만 가능합니다.`);
        return;
      }
      (async () => {
        try {
          const url = onImageUploadRef.current
            ? await onImageUploadRef.current(file)
            : await readFileAsDataURL(file);
          quill.insertEmbed(range.index, "image", url, "user");
          quill.setSelection(range.index + 1);
        } catch (err) {
          console.error("Image insert failed", err);
          alert("이미지 삽입에 실패했습니다.");
        }
      })();
    };

    /** Quill 마운트 (한 번만) */
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const quill = new Quill(container, {
        theme: "snow",
        placeholder,
        readOnly,
        modules: createQuillModules(),
      });

      quillRef.current = quill;

      // 이미지 버튼 클릭 시 파일 선택 창 열기
      const toolbar = quill.getModule("toolbar") as any;
      if (toolbar && typeof toolbar.addHandler === "function") {
        toolbar.addHandler("image", () => {
          fileInputRef.current?.click();
        });
      }

      // 초기값 설정 (HTML 엔티티 디코딩 포함)
      const initial = decodeHtmlEntities((value || "").trim());
      setEditorContent(quill, initial);
      lastKnownValueRef.current = normalize(initial);

      /**
       * text-change 이벤트에서 source 필터링:
       * - 'silent': 프로그래밍으로 setContents/deleteText 호출 시 → 무시
       * - 'api' | 'user': 실제 입력 → onChange 호출
       */
      quill.on("text-change", (_delta, _old, source) => {
        if (source === "silent") return;
        const html = normalize(quill.root.innerHTML);
        lastKnownValueRef.current = html; // 내부에서 변경한 값을 기록
        onChangeRef.current(html);
      });

      return () => {
        quill.off("text-change");
        quillRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** 외부 value 변경 시 에디터 업데이트 */
    useEffect(() => {
      const quill = quillRef.current;
      if (!quill) return;

      // 백엔드에서 HTML 엔티티 이스케이프로 내려올 수 있으므로 디코딩 후 비교
      const decoded = decodeHtmlEntities((value || "").trim());
      const normalized = normalize(decoded);

      // 내부에서 편집한 결과가 state로 반영되어 다시 온 경우 → 루프 방지
      if (normalized === lastKnownValueRef.current) return;

      // 현재 에디터 내용과도 같으면 → 불필요한 업데이트 방지
      const currentHtml = normalize(quill.root.innerHTML);
      if (normalized === currentHtml) {
        lastKnownValueRef.current = normalized;
        return;
      }

      // 외부에서 실제로 다른 값이 들어왔을 때만 에디터 업데이트
      lastKnownValueRef.current = normalized;
      setEditorContent(quill, decoded);
    }, [value]);

    /** readOnly 변경 반영 */
    useEffect(() => {
      const quill = quillRef.current;
      if (quill) quill.enable(!readOnly);
    }, [readOnly]);

    const hasError = !!error;

    return (
      <div className="w-full rich-text-editor-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={handleImageFileChange}
          style={{ display: "none" }}
          aria-hidden
        />
        <div
          ref={containerRef}
          className={hasError ? "rich-text-editor-error" : ""}
          style={{ minHeight }}
        />
        <style jsx global>{`
          .rich-text-editor-wrap .quill {
            border-radius: 0;
          }
          .rich-text-editor-wrap .ql-container {
            min-height: 280px;
            border-color: #e0e0e0;
          }
          .rich-text-editor-wrap .ql-toolbar {
            border-color: #e0e0e0;
            border-radius: 0;
          }
          .rich-text-editor-error .ql-container {
            border-color: #dc3545;
          }
          .rich-text-editor-error .ql-toolbar {
            border-color: #dc3545;
          }
        `}</style>
        {error && (
          <div className="text-red-600 text-sm mt-1 px-2">{error}</div>
        )}
      </div>
    );
  }
);

RichTextEditorClient.displayName = "RichTextEditorClient";
