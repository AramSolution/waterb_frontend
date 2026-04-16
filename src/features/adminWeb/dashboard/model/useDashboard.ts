"use client";

import { useState, useEffect } from "react";

export function useDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 데이터 로딩 시뮬레이션
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return {
    loading,
  };
}
