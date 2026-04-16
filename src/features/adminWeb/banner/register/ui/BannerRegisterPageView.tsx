"use client";

import React from "react";
import Link from "next/link";
import { BannerRegisterForm } from "./BannerRegisterForm";

export const BannerRegisterPageView: React.FC = () => {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">배너 등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>공통</span> &gt;{" "}
          <Link
            href="/adminWeb/banner/list"
            className="text-blue-600 hover:underline"
          >
            배너관리
          </Link>{" "}
          &gt; <span>등록</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">배너 정보</h5>
        </div>
        <div className="p-0">
          <BannerRegisterForm />
        </div>
      </div>
    </>
  );
};
