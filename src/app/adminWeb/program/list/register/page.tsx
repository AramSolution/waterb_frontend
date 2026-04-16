"use client";

import { AdminLayout } from "@/widgets/adminWeb/layout";
import { ProgramRegisterPageView } from "@/features/adminWeb/program/register/ui";

export default function ProgramRegisterPage() {
  return (
    <AdminLayout>
      <ProgramRegisterPageView />
    </AdminLayout>
  );
}
