'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login?next=/admin');
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#b8860b] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-white/50 font-medium">Redirecionando para login administrativo...</p>
      </div>
    </div>
  );
}
