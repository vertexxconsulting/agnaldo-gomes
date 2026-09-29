'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
      }
    }
    fetchProfile();
  }, []);

  // Não exibe a barra no login e checkout
  if (pathname?.startsWith('/academy/login') || pathname?.startsWith('/academy/checkout')) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* O Header já é position: fixed no CSS dele, por isso só chamamos aqui */}
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
