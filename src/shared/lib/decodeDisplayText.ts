/**
 * DB/API에 문자열로 들어온 HTML 엔티티 일부를 플레인 텍스트로만 치환합니다.
 * React `{text}` 노드는 HTML을 해석하지 않으므로 `&middot;` 등이 그대로 보이는 경우에 사용합니다.
 * 전체 HTML 디코더가 아닌 화이트리스트만 처리합니다. `&amp;`는 마지막에 적용합니다.
 */
export function decodeDisplayText(raw: string | null | undefined): string {
  if (raw == null) return "";
  let s = String(raw);

  s = s.replace(/&#x0*([Bb]7);/gi, "\u00B7");
  s = s.replace(/&#0*183;/g, "\u00B7");
  s = s.replace(/&#0*160;/g, "\u00A0");
  s = s.replace(/&#0*8226;/g, "\u2022");
  s = s.replace(/&#0*8211;/g, "\u2013");
  s = s.replace(/&#0*8212;/g, "\u2014");

  const named: [RegExp, string][] = [
    [/&middot;/gi, "\u00B7"],
    [/&nbsp;/gi, "\u00A0"],
    [/&bull;/gi, "\u2022"],
    [/&ndash;/gi, "\u2013"],
    [/&mdash;/gi, "\u2014"],
    [/&quot;/gi, '"'],
    [/&apos;/gi, "'"],
    [/&lt;/gi, "<"],
    [/&gt;/gi, ">"],
    [/&amp;/gi, "&"],
  ];
  for (const [re, ch] of named) s = s.replace(re, ch);

  return s;
}
