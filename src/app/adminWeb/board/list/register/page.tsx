"use client";

import { AdminLayout } from "@/widgets/adminWeb/layout";
import { BoardRegisterPageView } from "@/features/adminWeb/board/register/ui";

export default function BoardRegisterPage() {
  return (
    <AdminLayout>
      <BoardRegisterPageView />
    </AdminLayout>
  );
}

