"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { BannerListPageView } from "@/features/adminWeb/banner/list/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function BannerListContent() {
  return (
    <AdminLayout>
      <BannerListPageView />
    </AdminLayout>
  );
}

export default function BannerListPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BannerListContent />
    </Suspense>
  );
}
