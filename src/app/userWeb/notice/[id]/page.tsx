"use client";

import React, { Suspense, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { LayoutWrapper } from "@/widgets/userWeb/layout";
import NoticeViewSection from "@/widgets/userWeb/NoticeViewSection";

/**
 * 공지사항 상세 — noticeView2.html 레이아웃. 헤더는 포털(PortalHeader).
 */
function NoticeViewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const typeParam = searchParams.get("type");
  const reqGbPositionParam = searchParams.get("reqGbPosition");
  const reqGbPosition =
    reqGbPositionParam != null ? parseInt(reqGbPositionParam, 10) : null;
  const validReqGbPosition =
    reqGbPosition != null && reqGbPosition >= 1 && reqGbPosition <= 5
      ? reqGbPosition
      : null;

  const listQuery = useMemo(() => {
    const q = new URLSearchParams();
    if (typeParam) q.set("type", typeParam);
    else if (validReqGbPosition != null)
      q.set("reqGbPosition", String(validReqGbPosition));
    return q.toString();
  }, [typeParam, validReqGbPosition]);

  return (
    <LayoutWrapper headerType="portal">
      <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
        <NoticeViewSection postId={id} listQuery={listQuery} />
      </Suspense>
    </LayoutWrapper>
  );
}

export default function NoticeViewPage() {
  return (
    <Suspense fallback={<p className="loading">잠시만 기다려 주세요.</p>}>
      <NoticeViewPageContent />
    </Suspense>
  );
}
