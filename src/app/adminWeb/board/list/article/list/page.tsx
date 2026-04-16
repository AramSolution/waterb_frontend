"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { ArticleListPageView } from "@/features/adminWeb/article/list/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function ArticleListContent() {
  return (
    <AdminLayout>
      <ArticleListPageView />
    </AdminLayout>
  );
}

export default function ArticleListPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ArticleListContent />
    </Suspense>
  );
}
