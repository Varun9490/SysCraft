'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CustomResourceStudio } from './CustomResourceStudio';

/**
 * Standalone route for the Custom Resource Studio (/resources/new).
 *
 * Reuses the exact editor that lives in the workspace panel: describe a
 * primitive in plain English, compile it with the offline synthesizer, save
 * it to the local library, and place it on the canvas. Closing the studio
 * lands on the canvas so a freshly placed resource is immediately visible.
 */
export function CustomResourceRoute() {
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') router.push('/canvas');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <div className="section-container py-10">
      <p className="mx-auto max-w-2xl text-center text-[12.5px] leading-relaxed text-zinc-500">
        The Studio opens in a moment — describe an infrastructure primitive in plain English, compile it locally with
        the offline synthesizer, and place it on your canvas. Nothing is uploaded; custom primitives are stored in
        this browser's IndexedDB and join the palette alongside the 28 seed resources.
      </p>
      <CustomResourceStudio open onClose={() => router.push('/canvas')} />
    </div>
  );
}
