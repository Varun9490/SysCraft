'use client';

import { useEffect } from 'react';

/**
 * The encyclopedia used to live at both /encyclopedia and /wiki. This page
 * fronts the canonical redirect. Docs open full-screen, so ?module=x
 * deep-links upgrade to the dedicated reader at /wiki/x.
 */
export function RedirectToWiki() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const module = params.get('module');
    if (module) {
      window.location.replace(`/wiki/${module}`);
    } else {
      const search = window.location.search;
      window.location.replace(search ? `/wiki${search}` : '/wiki');
    }
  }, []);
  return null;
}
