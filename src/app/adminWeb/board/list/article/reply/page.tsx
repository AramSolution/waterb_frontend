"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { ArticleReplyPageView } from "@/features/adminWeb/article/reply/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function ArticleReplyContent() {
  return (
    <AdminLayout>
      <ArticleReplyPageView />
    </AdminLayout>
  );
}

export default function ArticleReplyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ArticleReplyContent />
    </Suspense>
  );
}
