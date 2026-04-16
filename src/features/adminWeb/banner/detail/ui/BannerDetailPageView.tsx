"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BannerDetailForm } from "./BannerDetailForm";

export const BannerDetailPageView: React.FC = () => {
  const searchParams = useSearchParams();
  const bannerId = searchParams?.get("bannerId") ?? "";

  const listQuery = new URLSearchParams();
  const sc = searchParams?.get("searchCondition");
  const sk = searchParams?.get("searchKeyword");
  const pg = searchParams?.get("page");
  if (sc) listQuery.set("searchCondition", sc);
  if (sk) listQuery.set("searchKeyword", sk);
  if (pg) listQuery.set("page", pg);
  const listHref = `/adminWeb/banner/list${listQuery.toString() ? `?${listQuery.toString()}` : ""}`;

  if (!bannerId.trim()) {
    return (
      <>
        <div className="page-header">
          <h1 className="page-title">배너 상세</h1>
          <nav className="breadcrumb">
            <span>홈</span> &gt; <span>공통</span> &gt;{" "}
            <Link href={listHref} className="text-blue-600 hover:underline">
              배너관리
            </Link>{" "}
            &gt; <span>상세</span>
          </nav>
        </div>
        <div className="bg-white rounded-lg shadow border p-6 text-gray-600">
          배너를 선택해주세요. 목록에서 상세를 눌러 이동할 수 있습니다.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">배너 상세</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>공통</span> &gt;{" "}
          <Link href={listHref} className="text-blue-600 hover:underline">
            배너관리
          </Link>{" "}
          &gt; <span>상세</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">배너 정보</h5>
        </div>
        <div className="p-0">
          <BannerDetailForm bannerId={bannerId} listHref={listHref} />
        </div>
      </div>
    </>
  );
};
