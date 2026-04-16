"use client";

import React from "react";
import {
  useArticleRegister,
  getArticleRegisterPageTitle,
  getArticleRegisterSectionTitle,
} from "../model";
import { ArticleRegisterForm } from "./ArticleRegisterForm";

export const ArticleRegisterPageView: React.FC = () => {
  const vm = useArticleRegister();
  const pageTitle = getArticleRegisterPageTitle(vm.bbsSe);
  const sectionTitle = getArticleRegisterSectionTitle(vm.bbsSe);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{pageTitle}</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>공통</span> &gt; <span>게시판관리</span>{" "}
          &gt; <span>{pageTitle}</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">{sectionTitle}</h5>
        </div>
        <div className="p-0">
          <ArticleRegisterForm vm={vm} />
        </div>
      </div>
    </>
  );
};
