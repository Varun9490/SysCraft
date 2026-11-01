'use client';

import Link from "next/link";
import { PATH_PARTS } from "@/data/pathData";

export function PathPreview() {
  return (
    <section className="py-16 md:py-20">
      <div className="reading-column">
        <h2 className="text-xl font-semibold tracking-tight text-content">The path</h2>
        <p className="mt-2 text-[14px] text-content-secondary">
          Parts, in order. The full tree lives on the path page.
        </p>
        <ul className="mt-6 space-y-2">
          {PATH_PARTS.map((part, index) => (
            <li key={part.id} className="text-[14px] text-content-secondary">
              <span className="text-content-tertiary">{index + 1}.</span> {part.title}
            </li>
          ))}
        </ul>
        <Link href="/learn" className="mt-6 inline-block text-sm font-medium text-content-secondary hover:text-content">
          Open the full path →
        </Link>
      </div>
    </section>
  );
}