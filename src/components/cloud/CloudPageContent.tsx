'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from '@/components/ui/icons';
import { Reveal, StaggerChild, StaggerGroup } from '@/components/ui/motion';
import { PROVIDERS, SERVICE_MATRIX } from '@/data/cloudPlatforms';
import { NET_CONCEPTS } from '@/data/cloudNetworking';
import { NetDiagram } from './NetDiagram';

export function CloudPageContent() {
  const [conceptId, setConceptId] = useState(NET_CONCEPTS[0].id);
  const concept = NET_CONCEPTS.find((c) => c.id === conceptId) ?? NET_CONCEPTS[0];

  return (
    <div className="section-container py-12 md:py-16">
      {/* Hero */}
      <div className="grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <span className="eyebrow">
            <span className="h-1.5 w-1.5 rounded-full bg-brass" />
            Cloud & networking
          </span>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-content md:text-5xl">
            The same idea, <span className="text-brass">five different names</span>
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-content-secondary">
            Every system you design here maps onto AWS, Azure, GCP, and Cloudflare. Compare the services, then learn the
            networking underneath — anycast, VPCs, DNS, NAT, private links, TLS, and service meshes.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {['33+ AWS regions', 'Anycast everywhere', 'mTLS by default'].map((chip) => (
              <span key={chip} className="rounded-full border border-line bg-app/50 px-3 py-1 text-[12px] text-content-secondary">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <Reveal className="lg:col-span-6" x={24}>
          <div className="rounded-2xl border border-line bg-app/50 p-4 shadow-card">
            <p className="mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-content-tertiary">Anycast in motion</p>
            <div className="h-[240px]">
              <NetDiagram kind="anycast" />
            </div>
          </div>
        </Reveal>
      </div>

      {/* Providers */}
      <section className="mt-16">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">The platforms</h2>
        <StaggerGroup className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {PROVIDERS.map((provider) => (
            <StaggerChild key={provider.id}>
              <div className="h-full rounded-2xl border border-line bg-app/50 p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: provider.color }} />
                  <p className="text-[15px] font-semibold text-content">{provider.short}</p>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-content-secondary">{provider.tagline}</p>
                <dl className="mt-4 space-y-1.5 text-[12px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-content-tertiary">Reach</dt>
                    <dd className="text-right text-content-secondary">{provider.reach}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-content-tertiary">Edge</dt>
                    <dd className="text-right text-content-secondary">{provider.edge}</dd>
                  </div>
                </dl>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {provider.strengths.map((s) => (
                    <li key={s} className="rounded-full border border-line bg-app-raised/50 px-2.5 py-0.5 text-[11px] text-content-secondary">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerChild>
          ))}
        </StaggerGroup>
      </section>

      {/* Service matrix */}
      <section className="mt-16">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Service equivalents</h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
          Twenty categories, five providers. The fastest way to port a design is to know what each service is called.
        </p>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-app/40">
          <table className="w-full min-w-[880px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 z-10 bg-app px-4 py-3 font-semibold text-content">Category</th>
                {PROVIDERS.map((p) => (
                  <th key={p.id} className="px-4 py-3 font-semibold text-content-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.short}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SERVICE_MATRIX.map((row, i) => (
                <tr key={row.category} className={i % 2 ? 'bg-app-raised/20' : ''}>
                  <th scope="row" className="sticky left-0 z-10 bg-app px-4 py-3 text-left align-top font-medium text-content">
                    {row.category}
                    <span className="mt-0.5 block text-[11px] font-normal text-content-tertiary">{row.what}</span>
                  </th>
                  <td className="px-4 py-3 align-top text-content-secondary">{row.aws}</td>
                  <td className="px-4 py-3 align-top text-content-secondary">{row.azure}</td>
                  <td className="px-4 py-3 align-top text-content-secondary">{row.gcp}</td>
                  <td className="px-4 py-3 align-top text-content-secondary">{row.cloudflare}</td>
                  <td className="px-4 py-3 align-top text-content-secondary">{row.oci}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Networking explorer */}
      <section className="mt-16">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">Cloud networking</h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-content-secondary">
          Seven fundamentals that decide your latency, blast radius, and bill. Pick one to see how it routes.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-12">
          <div className="flex flex-wrap gap-2 lg:col-span-4 lg:flex-col">
            {NET_CONCEPTS.map((c) => {
              const active = c.id === conceptId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setConceptId(c.id)}
                  className={`rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors ${
                    active
                      ? 'border-brass/50 bg-brass/10 text-content'
                      : 'border-line bg-app/40 text-content-secondary hover:border-line-strong hover:text-content'
                  }`}
                >
                  {c.title}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-line bg-app/50 p-5 shadow-card">
              <div className="h-[240px] rounded-xl border border-line bg-app-raised/30 p-2">
                <NetDiagram kind={concept.kind} />
              </div>
              <h3 className="mt-5 text-[16px] font-semibold text-content">{concept.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-content-secondary">{concept.summary}</p>
              <ul className="mt-4 space-y-2">
                {concept.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[13px] leading-relaxed text-content-secondary">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                {concept.services.map((s) => (
                  <span key={`${s.provider}-${s.service}`} className="rounded-full border border-line bg-app-raised/50 px-3 py-1 text-[11.5px] text-content-secondary">
                    <span className="text-content-tertiary">{s.provider}</span> · {s.service}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-16 flex flex-col items-start gap-4 rounded-2xl border border-line bg-app/50 p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[16px] font-semibold text-content">Ready to design on top of this?</p>
          <p className="mt-1 text-[13px] text-content-secondary">Open a lab and wire these primitives together on the canvas.</p>
        </div>
        <Link
          href="/labs"
          className="group inline-flex items-center gap-2 rounded-full bg-brass px-5 py-2.5 text-sm font-semibold text-ink shadow-card transition-transform hover:scale-[1.03]"
        >
          Explore labs
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
