'use client';

import { AlertTriangle, Clock, HelpCircle, Layers, Flame, RefreshCw } from 'lucide-react';

export function LandingProblem() {
  const problems = [
    {
      icon: Clock,
      eyebrow: 'THE 19% SEARCH TAX',
      title: 'Engineers spend a full day every week hunting for context.',
      description:
        'When code breaks or a new service is scoped, engineers comb through 40+ Slack channels, 15 Confluence pages from 2021, and 80 merged PRs just to find who made the decision and why.',
      stat: '9.4 hrs',
      statLabel: 'Lost per engineer / week',
    },
    {
      icon: HelpCircle,
      eyebrow: 'ZOMBIE DEBATES & BRAIN DRAIN',
      title: 'Decisions leave the building when senior architects resign.',
      description:
        'Without persistent organizational memory, the same architectural debates get relitigated every 6 months. Teams redo refactors that failed years ago because the post-mortem was lost in an unsearchable doc.',
      stat: '47%',
      statLabel: 'Of architectural choices re-argued',
    },
    {
      icon: AlertTriangle,
      eyebrow: 'SILENT CONTRADICTIONS',
      title: 'Microservices drift into incompatible architectural silos.',
      description:
        'Team Billing enforces a 15-second Redis TTL while Team Checkout deploys an RFC specifying a 60-second cache. Nobody notices the contradiction until a midnight production outage brings down user checkout.',
      stat: '$140K',
      statLabel: 'Avg cost per silent policy incident',
    },
  ];

  return (
    <section className="relative bg-[#0b0b0c] py-24 text-white overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            The Crisis of Organizational Amnesia
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-[1.15]">
            Code is written once.{' '}
            <span 
              className="italic font-serif font-normal text-[#c6f432]"
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
            >
              Why
            </span>{' '}
            it was written is forgotten forever.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-neutral-400 leading-relaxed">
            Standard documentation tools like Confluence and Notion are dead wikis—unmaintained graves where information goes to expire. Basic vector RAG matches words, but has no comprehension of decisions, people, time, or conflicts.
          </p>
        </div>

        {/* 3 Problem Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={p.eyebrow}
                className="group relative rounded-2xl border border-white/[0.08] bg-[#121413]/90 p-8 backdrop-blur-xl transition-all duration-300 hover:border-[#c6f432]/40 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#c6f432] group-hover:bg-[#c6f432]/10 transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-2xl font-black font-mono text-white/20 group-hover:text-[#c6f432]/40 transition-colors">
                    0{idx + 1}
                  </span>
                </div>

                <div className="text-[11px] font-mono font-bold tracking-wider text-[#c6f432] uppercase">
                  {p.eyebrow}
                </div>

                <h3 className="mt-2 text-xl font-bold text-white tracking-tight leading-snug">
                  {p.title}
                </h3>

                <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
                  {p.description}
                </p>

                <div className="mt-8 pt-5 border-t border-white/[0.08] flex items-baseline justify-between">
                  <div className="text-3xl font-black text-white tracking-tight font-mono">
                    {p.stat}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono text-right max-w-[120px]">
                    {p.statLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

