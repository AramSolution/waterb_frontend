"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { BannerRegisterPageView } from "@/features/adminWeb/banner/register/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

function BannerRegisterContent() {
  return (
    <AdminLayout>
      <BannerRegisterPageView />
    </AdminLayout>
  );
}

export default function BannerRegisterPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BannerRegisterContent />
    </Suspense>
  );
}
