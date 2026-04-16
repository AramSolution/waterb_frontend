'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { SupportUpdateForm } from './SupportUpdateForm';

export const SupportUpdatePageView: React.FC = () => {
  const searchParams = useSearchParams();
  const fromStudy = searchParams.get('from') === 'study';

  const pageTitle = fromStudy
    ? '스터디 지원사업 상세'
    : '샘플업무 상세';
  const sectionLabel = fromStudy ? '스터디사업' : '샘플업무';
  const breadcrumbLast = fromStudy
    ? '스터디 지원사업 상세'
    : '샘플업무 상세';

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">{pageTitle}</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>지원사업</span> &gt;{' '}
          <span>{sectionLabel}</span> &gt; <span>{breadcrumbLast}</span>
        </nav>
      </div>

      <SupportUpdateForm />
    </>
  );
};
