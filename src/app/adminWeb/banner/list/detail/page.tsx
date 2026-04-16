"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { BannerDetailPageView } from "@/features/adminWeb/banner/detail/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function BannerDetailContent() {
  return (
    <AdminLayout>
      <BannerDetailPageView />
    </AdminLayout>
  );
}

export default function BannerDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BannerDetailContent />
    </Suspense>
  );
}
