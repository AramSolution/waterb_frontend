"use client";

import React from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { MemberRegisterPageView } from "@/features/adminWeb/member/register/ui/MemberRegisterPageView";

export default function MemberRegisterPage() {
  return (
    <AdminLayout>
      <MemberRegisterPageView />
    </AdminLayout>
  );
}
