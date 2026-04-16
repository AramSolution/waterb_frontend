"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { ArticleDetailPageView } from "@/features/adminWeb/article/detail/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function ArticleDetailContent() {
  return (
    <AdminLayout>
      <ArticleDetailPageView />
    </AdminLayout>
  );
}

export default function ArticleDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ArticleDetailContent />
    </Suspense>
  );
}
