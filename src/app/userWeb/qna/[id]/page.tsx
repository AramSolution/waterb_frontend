"use client";

import React, { Suspense, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import QnaViewSection from "@/widgets/userWeb/QnaViewSection";
import type { TabType } from "@/widgets/userWeb/QnaViewSection";

const LIST_QUERY_KEYS = [
  "page",
  "pageSize",
  "searchCnd",
  "searchWrd",
  "type",
  "reqGbPosition",
] as const;

/**
 * 1:1 문의·자료실 상세 — `qnaView2.html` / `noticeView2` 레이아웃.
 */
function QnaViewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const tabParam = searchParams.get("tab");
  const tab: TabType = tabParam === "archive" ? "archive" : "qna";

  const listQuery = useMemo(() => {
    const q = new URLSearchParams();
    q.set("tab", tab);
    for (const k of LIST_QUERY_KEYS) {
      const v = searchParams.get(k);
      if (v != null && v !== "") q.set(k, v);
    }
    return q.toString();
  }, [tab, searchParams]);

  return (
    <QnaViewSection postId={id} tab={tab} listQuery={listQuery} />
  );
}

export default function QnaViewPage() {
  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <QnaViewPageContent />
      </Suspense>
    </LayoutWrapper>
  );
}
