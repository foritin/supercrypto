'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function InvestRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到资产列表页
    router.replace('/assets');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-white/60">Redirecting to assets...</p>
      </div>
    </div>
  );
}
