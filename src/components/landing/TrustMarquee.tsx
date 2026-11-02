'use client';

import { Marquee } from "@/components/ui/motion";
import { COMPANY_BRANDS } from "@/data/companyBrands";

const COMPANIES = COMPANY_BRANDS.filter(
  (brand, index, all) => all.findIndex((b) => b.company === brand.company) === index,
);

export function TrustMarquee() {
  return (
    <section className="relative border-y border-line/70 bg-app/40 py-9">
      <p className="mb-6 text-center text-[11px] uppercase tracking-[0.24em] text-content-tertiary">
        Systems you will re-create from the ground up
      </p>
      <Marquee>
        <div className="flex items-center gap-12 pr-12">
          {COMPANIES.map((brand) => (
            <span
              key={brand.company}
              className="flex shrink-0 items-center gap-2.5 text-[15px] font-medium text-content-secondary"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: brand.color }} />
              {brand.company}
            </span>
          ))}
        </div>
      </Marquee>
    </section>
  );
}
