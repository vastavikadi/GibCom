'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  GitPullRequest, 
  MessageSquare, 
  FileText, 
  Activity, 
  ShieldCheck, 
  ChevronRight,
  Database,
  Brain,
  ShieldAlert,
  Search,
  Compass,
  Check
} from 'lucide-react';

interface HeroProps {
  onOpenDemo?: () => void;
}

export function LandingHero({ onOpenDemo }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-24 md:pt-16 md:pb-32 bg-[#0b0b0c] text-white">
      {/* High-tech ambient background grid & neural matrix */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(198, 244, 50, 0.15) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse at 50% 40%, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, black 40%, transparent 85%)',
        }}
      />

      {/* Top luminous lime spotlight beaming down from above */}
      <div 
        className="pointer-events-none absolute -top-48 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full blur-[150px] opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(198, 244, 50, 0.5) 0%, rgba(198, 244, 50, 0.12) 45%, transparent 75%)',
        }}
      />

      {/* Ambient vertical aura beam directly behind hero headline and cards */}
      <div 
        className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[850px] opacity-20"
        style={{
          background: 'linear-gradient(180deg, rgba(198, 244, 50, 0.3) 0%, rgba(198, 244, 50, 0.08) 50%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse at center, black 45%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 45%, transparent 85%)',
        }}
      />

      {/* Floating subtle neural ambient orbs */}
      <div 
        className="pointer-events-none absolute top-1/4 left-10 w-72 h-72 rounded-full blur-[100px] opacity-10 animate-pulse"
        style={{ background: '#c6f432' }}
      />
      <div 
        className="pointer-events-none absolute top-1/3 right-10 w-80 h-80 rounded-full blur-[120px] opacity-10 animate-pulse"
        style={{ background: '#c6f432', animationDuration: '4s' }}
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        {/* Top Feature Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#c6f432]/35 bg-[#151a14]/90 px-4 py-1.5 text-xs text-[#c6f432] shadow-[0_0_25px_rgba(198,244,50,0.2)] backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c6f432] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#c6f432]" />
            </span>
            <span className="font-semibold text-white/95">The AI-Native Organizational Memory Engine</span>
            <span className="text-[#c6f432]/50">•</span>
            <span className="text-[#c6f432] font-mono font-bold">Meta Muse-Spark 1.3</span>
          </div>
        </div>

        {/* Master Headline - Fully in-context with Company Brain */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold tracking-tight text-white leading-[1.06]">
            The AI brain that{' '}
            <span 
              className="italic font-serif font-normal text-[#c6f432] pr-1 drop-shadow-[0_0_35px_rgba(198,244,50,0.35)]"
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
            >
              never forgets
            </span>{' '}
            why your company built what it built.
          </h1>

          <p className="mt-7 text-base sm:text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Company Brain continuously synthesizes Slack debates, GitHub PRs, Jira tickets, and architectural RFCs into self-evolving organizational intelligence. Stop losing context to turnover, end duplicate debates, and make institutional memory permanent.
          </p>

          {/* Action Buttons */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="group inline-flex items-center gap-2 rounded-full bg-[#c6f432] px-8 py-4 text-sm font-bold uppercase tracking-wider text-[#0b0b0c] transition-all duration-300 hover:bg-[#d5fa4b] hover:scale-105 hover:shadow-[0_0_40px_rgba(198,244,50,0.55)]"
            >
              <span>Start Free with Your Team</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <a
              href="#playground"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-8 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-white/[0.08]"
            >
              <Compass className="h-4 w-4 text-[#c6f432]" />
              <span>Explore Interactive Playground</span>
            </a>
          </div>
        </div>

        {/* 4 Clean Key Metrics - Positioned Above the Cards (No Overlapping) */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-xl border border-white/[0.08] bg-[#121413]/70 p-4 text-center backdrop-blur-md hover:border-[#c6f432]/40 transition-colors">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">100%</div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#c6f432] mt-1">
                Decision Retention
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Zero lost context on turnover</p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#121413]/70 p-4 text-center backdrop-blur-md hover:border-[#c6f432]/40 transition-colors">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">87%</div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#c6f432] mt-1">
                Less Context Hunting
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Instant answers with citations</p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#121413]/70 p-4 text-center backdrop-blur-md hover:border-[#c6f432]/40 transition-colors">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">7D</div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#c6f432] mt-1">
                Memory Dimensions
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Decisions, SMEs & Architecture</p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#121413]/70 p-4 text-center backdrop-blur-md hover:border-[#c6f432]/40 transition-colors">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">0</div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#c6f432] mt-1">
                Silent Clashes
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Pre-merge policy guardrails</p>
            </div>
          </div>
        </div>

        {/* Triple Card Showcase Container - Spacious, Uncluttered, Centerpiece */}
        <div className="relative mt-8">
          {/* Intense Radial Lime Aura directly centered behind the 3 showcase cards */}
          <div 
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[400px] rounded-full blur-[120px] opacity-40 z-0"
            style={{
              background: 'radial-gradient(circle, rgba(198, 244, 50, 0.45) 0%, rgba(198, 244, 50, 0.12) 50%, transparent 80%)',
            }}
          />

          {/* Triple Cards Grid */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 max-w-5xl mx-auto items-stretch">
            {/* Left Card: Live Memory Ingestion Stream */}
            <div className="md:col-span-4 rounded-2xl bg-[#121413]/90 border border-white/[0.09] p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:border-[#c6f432]/50 hover:shadow-[0_0_30px_rgba(198,244,50,0.15)]">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#c6f432] shadow-[0_0_8px_#c6f432]" />
                    <span className="text-xs font-mono font-bold tracking-wider text-neutral-200 uppercase">
                      live · memory stream
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">AES-256-GCM</span>
                </div>

                <div className="space-y-3">
                  {/* Item 1: Decision */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-[#c6f432] tracking-wider">
                        Decision Record
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c6f432] text-[#0b0b0c]">
                        Synthesized
                      </span>
                    </div>
                    <p className="text-xs text-neutral-200 font-medium truncate">
                      Migrate session tokens to AES-256-GCM
                    </p>
                    <div className="text-[10px] text-neutral-400 font-mono mt-1">
                      GitHub PR #421 • RFC-32
                    </div>
                  </div>

                  {/* Item 2: SME Routing */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-[#36c5f0] tracking-wider">
                        SME & Code Owner
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#c6f432] text-[#c6f432]">
                        Indexed
                      </span>
                    </div>
                    <p className="text-xs text-neutral-200 font-medium truncate">
                      Webhook Handler Owner: @erostova
                    </p>
                    <div className="text-[10px] text-neutral-400 font-mono mt-1">
                      Slack #eng-platform • 28 commits
                    </div>
                  </div>

                  {/* Item 3: Contradiction Alert */}
                  <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 hover:bg-red-950/30 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase text-red-400 tracking-wider flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        <span>Contradiction Flag</span>
                      </span>
                      <span className="text-[9px] font-medium tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                        Resolved
                      </span>
                    </div>
                    <p className="text-xs text-neutral-200 font-medium truncate">
                      15s Gateway TTL vs 60s Checkout TTL
                    </p>
                    <div className="text-[10px] text-neutral-400 font-mono mt-1">
                      RFC-14 policy enforced
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-[#c6f432]" />
                  <span>Sub-second autonomous sync</span>
                </span>
                <span className="text-white font-mono">1536d pgvector</span>
              </div>
            </div>

            {/* Center Card: Brain Intelligence Score & Graph (Featured Prominence) */}
            <div className="md:col-span-4 rounded-2xl bg-[#141714]/95 border-2 border-[#c6f432]/70 p-5 shadow-[0_0_45px_rgba(198,244,50,0.25)] backdrop-blur-xl flex flex-col justify-between transition-transform duration-300 hover:scale-[1.01]">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#c6f432] shadow-[0_0_10px_#c6f432]" />
                    <span className="text-xs font-mono font-bold tracking-wider text-neutral-200 uppercase">
                      intelligence health
                    </span>
                  </div>
                  <span className="rounded-full bg-[#c6f432]/20 border border-[#c6f432]/50 px-2.5 py-0.5 text-[10px] font-bold text-[#c6f432]">
                    Optimal Recall
                  </span>
                </div>

                {/* Score & Subtext */}
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <div className="text-6xl font-black text-white tracking-tight leading-none font-mono">
                      96
                    </div>
                    <div className="text-xs font-medium text-[#c6f432] mt-1.5 flex items-center gap-1">
                      <span>↑ +18% institutional recall</span>
                    </div>
                  </div>

                  <Link 
                    href="/explore"
                    className="rounded-full bg-[#c6f432] hover:bg-[#d5fa4b] px-3.5 py-1.5 text-[11px] font-bold text-[#0b0b0c] transition-all shadow-[0_0_15px_rgba(198,244,50,0.35)] flex items-center gap-1"
                  >
                    <span>View 7D Graph</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Glowing Lime SVG Sparkline Chart */}
                <div className="relative mt-4 h-24 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 240 70">
                    <defs>
                      <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c6f432" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#c6f432" stopOpacity="0.0" />
                      </linearGradient>
                      <filter id="lineNeon" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#c6f432" floodOpacity="0.85" />
                      </filter>
                    </defs>

                    {/* Gradient Area under curve */}
                    <path
                      d="M 0 52 Q 40 45, 80 32 T 150 24 T 200 16 T 240 8 L 240 70 L 0 70 Z"
                      fill="url(#scoreGlow)"
                    />

                    {/* Active neon curve line */}
                    <path
                      d="M 0 52 Q 40 45, 80 32 T 150 24 T 200 16 T 240 8"
                      fill="none"
                      stroke="#c6f432"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      filter="url(#lineNeon)"
                    />

                    {/* Highlight Pulsing Peak Node */}
                    <circle cx="240" cy="8" r="5" fill="#ffffff" stroke="#c6f432" strokeWidth="2.5" />
                  </svg>
                </div>

                {/* Connector Source Axis */}
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono mt-1 pt-1 border-t border-white/[0.08]">
                  <span>Slack</span>
                  <span>GitHub</span>
                  <span>Jira</span>
                  <span className="text-[#c6f432] font-semibold">Confluence</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-neutral-300 flex items-center justify-between border-t border-white/[0.06] mt-2">
                <span>389 memories validated</span>
                <span className="text-[#c6f432] font-mono">0 lost decisions</span>
              </div>
            </div>

            {/* Right Card: Decision & Conflict Timeline Matrix */}
            <div className="md:col-span-4 rounded-2xl bg-[#121413]/90 border border-white/[0.09] p-5 shadow-2xl backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:border-[#c6f432]/50 hover:shadow-[0_0_30px_rgba(198,244,50,0.15)]">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#c6f432] shadow-[0_0_8px_#c6f432]" />
                    <span className="text-xs font-mono font-bold tracking-wider text-neutral-200 uppercase">
                      temporal evolution
                    </span>
                  </div>
                  <span className="text-[10px] text-[#c6f432] font-mono">Continuous</span>
                </div>

                {/* Column timeline dates */}
                <div className="grid grid-cols-4 text-center text-[10px] font-mono text-neutral-400 mb-2">
                  <span>Q1 2024</span>
                  <span>Q2 2024</span>
                  <span className="text-[#c6f432] font-bold">Q3 2024</span>
                  <span>Current</span>
                </div>

                {/* Multi-track Decision Evolution Gantt */}
                <div className="space-y-3 relative py-1">
                  {/* Vertical Scan Needle */}
                  <div className="absolute top-0 bottom-0 left-[68%] w-[1.5px] bg-[#c6f432] shadow-[0_0_10px_#c6f432] z-10">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-[#c6f432]" />
                  </div>

                  {/* Track 1: Vector Search Evolution */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-mono text-neutral-300 truncate">
                      ADR-04: Hybrid Retrieval Engine
                    </div>
                    <div className="grid grid-cols-12 gap-1 h-3.5 items-center">
                      <div className="col-span-6 bg-[#232a22] rounded-md h-3 border border-white/[0.06]" />
                      <div className="col-span-6 bg-[#c6f432] rounded-md h-3 shadow-[0_0_12px_rgba(198,244,50,0.5)]" />
                    </div>
                  </div>

                  {/* Track 2: Security Token Standards */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-mono text-neutral-300 truncate">
                      RFC-32: AES-256-GCM Envelope
                    </div>
                    <div className="grid grid-cols-12 gap-1 h-3.5 items-center">
                      <div className="col-span-3" />
                      <div className="col-span-6 bg-[#c6f432] rounded-md h-3 shadow-[0_0_12px_rgba(198,244,50,0.5)]" />
                      <div className="col-span-3 bg-[#232a22] rounded-md h-3 border border-white/[0.06]" />
                    </div>
                  </div>

                  {/* Track 3: Database & Cache Boundaries */}
                  <div className="space-y-1">
                    <div className="text-[9px] font-mono text-neutral-300 truncate">
                      POLICY: 15s Redis Gateway Constraint
                    </div>
                    <div className="grid grid-cols-12 gap-1 h-3.5 items-center">
                      <div className="col-span-5 bg-[#232a22] rounded-md h-3 border border-white/[0.06]" />
                      <div className="col-span-7 bg-[#c6f432] rounded-md h-3 shadow-[0_0_12px_rgba(198,244,50,0.5)]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
                <span className="truncate">Active policy guardrails</span>
                <span className="text-[#c6f432] font-mono">Enforced</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
