"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { ArticleRegisterPageView } from "@/features/adminWeb/article/register/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function ArticleRegisterContent() {
  return (
    <AdminLayout>
      <ArticleRegisterPageView />
    </AdminLayout>
  );
}

export default function ArticleRegisterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ArticleRegisterContent />
    </Suspense>
  );
}
