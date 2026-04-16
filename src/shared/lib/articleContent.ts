/**
 * Quill 표 모듈이 편집기용으로 남긴 클래스 — 사용자 화면 CSS에서 display:none 처리될 수 있음.
 * 저장 시 getValue()를 쓰지 않은 본문에 남은 경우를 대비해 표시 전 제거.
 */
function stripQuillTableArtifactsForView(html: string): string {
  if (!html.includes("ql-table-temporary")) return html;
  let s = html.replace(/\bql-table-temporary\b/g, "");
  s = s.replace(/class="([^"]*)"/g, (_, classes: string) => {
    const t = classes.replace(/\s+/g, " ").trim();
    return t ? `class="${t}"` : "";
  });
  s = s.replace(/class='([^']*)'/g, (_, classes: string) => {
    const t = classes.replace(/\s+/g, " ").trim();
    return t ? `class='${t}'` : "";
  });
  return s;
}

/**
 * HTML 엔티티 디코딩 (서버/클라이언트 모두에서 동작)
 */
function decodeHtmlEntities(str: string): string {
  const entityMap: Record<string, string> = {
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&#x2F;": "/",
  };
  
  return str.replace(/&[#\w]+;/g, (entity) => {
    return entityMap[entity] || entity;
  });
}

/**
 * 게시글 본문(nttCn) 표시용 HTML 변환.
 * - Quill 등으로 저장된 HTML은 그대로 사용
 * - 기존 일반 텍스트(줄바꿈 \n)는 <br>로 변환하여 표시
 * - 백엔드에서 HTML이 이스케이프되어 올 수 있으므로 디코딩 처리
 */
export function getArticleContentHtml(content: string | null | undefined): string {
  if (content == null || content === "") return "";
  
  let processed = String(content);
  
  // HTML 엔티티가 있는지 확인하고 디코딩
  if (processed.includes("&lt;") || processed.includes("&gt;") || processed.includes("&amp;")) {
    processed = decodeHtmlEntities(processed);
  }
  
  const trimmed = processed.trim();
  if (!trimmed) return "";
  
  // HTML 태그가 있는지 확인 (Quill은 <p>, <br>, <strong>, <ul>, <ol>, <li>, <a> 등을 사용)
  // 실제 HTML 태그 패턴 확인: <태그명> 또는 </태그명> 형태
  const htmlTagPattern = /<\/?[a-z][a-z0-9]*\b[^>]*>/i;
  const hasHtmlTags = htmlTagPattern.test(trimmed);
  
  // Quill이 저장한 빈 내용은 <p><br></p> 또는 <p></p> 형태일 수 있음
  const isEmptyQuillContent = 
    trimmed === "<p><br></p>" || 
    trimmed === "<p></p>" ||
    trimmed === "<p><br/></p>";
  
  if (hasHtmlTags && !isEmptyQuillContent) {
    // HTML이 있으면 그대로 사용 (Quill 표 편집기 잔여 클래스 제거)
    return stripQuillTableArtifactsForView(trimmed);
  }
  
  // 일반 텍스트면 줄바꿈을 <br>로 변환
  return trimmed.replace(/\n/g, "<br>");
}
