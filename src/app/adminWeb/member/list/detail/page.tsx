"use client";

import React from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { MemberDetailPageView } from "@/features/adminWeb/member/detail/ui/MemberDetailPageView";

export default function MemberDetailPage() {
  return (
    <AdminLayout>
      <MemberDetailPageView />
    </AdminLayout>
  );
}
