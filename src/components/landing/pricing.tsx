'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

export function LandingPricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="relative bg-[#0d0f0e] py-24 text-white overflow-hidden border-t border-white/[0.08]">
      {/* Background ambient lighting */}
      <div 
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full blur-[140px] opacity-15"
        style={{
          background: 'radial-gradient(circle, #c6f432 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            Transparent Pricing
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Simple, predictable pricing for teams of any scale.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Start free, scale seamlessly. Every plan includes AES-256-GCM encryption and zero-data-retention AI pipelines.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/[0.1] bg-[#121413] p-1.5 backdrop-blur-md">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                !annual ? 'bg-white text-[#0b0b0c]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 ${
                annual ? 'bg-[#c6f432] text-[#0b0b0c]' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-[#0b0b0c] px-1.5 py-0.5 text-[9px] font-bold text-[#c6f432]">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {/* Tier 1: Developer */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121413]/90 p-8 backdrop-blur-xl flex flex-col justify-between transition-all hover:border-white/[0.2]">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Developer Community
              </div>
              <h3 className="mt-1 text-2xl font-bold text-white tracking-tight">Free</h3>
              <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                For solo founders, open-source maintainers, and proof-of-concept testing.
              </p>

              <div className="mt-6 flex items-baseline">
                <span className="text-4xl font-extrabold text-white font-mono">$0</span>
                <span className="text-xs text-neutral-400 ml-2">forever free</span>
              </div>

              <div className="mt-8 space-y-3 pt-6 border-t border-white/[0.08] text-xs text-neutral-300">
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Up to 3 connectors (GitHub, Slack, Google Drive)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>5,000 memories indexed</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Meta AI Muse-Spark synthesis</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>AES-256-GCM secret encryption</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Community Discord support</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.08]">
              <Link
                href="/auth/register"
                className="w-full inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.04] py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/[0.08] transition-colors"
              >
                Start Free
              </Link>
            </div>
          </div>

          {/* Tier 2: Pro Team (Featured with neon lime glow) */}
          <div className="rounded-2xl border-2 border-[#c6f432] bg-[#141714] p-8 shadow-[0_0_40px_rgba(198,244,50,0.25)] backdrop-blur-xl flex flex-col justify-between relative transform lg:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#c6f432] px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#0b0b0c] shadow-[0_0_15px_rgba(198,244,50,0.5)]">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-[#c6f432] font-bold">
                Growing Engineering Teams
              </div>
              <h3 className="mt-1 text-2xl font-bold text-white tracking-tight">Pro Team</h3>
              <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
                Full continuous learning engine with real-time webhooks and contradiction guardrails.
              </p>

              <div className="mt-6 flex items-baseline">
                <span className="text-5xl font-black text-white font-mono">
                  ${annual ? '31' : '39'}
                </span>
                <span className="text-xs text-neutral-400 ml-2">/ seat / month</span>
              </div>

              <div className="mt-8 space-y-3 pt-6 border-t border-white/[0.08] text-xs text-neutral-200">
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Unlimited connectors (GitHub, Slack, Jira, Confluence, Drive)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Real-time webhook synchronization (sub-second)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Proactive Contradiction Detection Engine</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>7 Dimensions of Organizational Memory</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Subject Matter Expert (SME) routing</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Full audit log access & export</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.08]">
              <Link
                href="/auth/register"
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#c6f432] py-3.5 text-xs font-bold uppercase tracking-wider text-[#0b0b0c] hover:bg-[#d5fa4b] transition-all shadow-[0_0_20px_rgba(198,244,50,0.4)]"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#121413]/90 p-8 backdrop-blur-xl flex flex-col justify-between transition-all hover:border-white/[0.2]">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Large Enterprise & Regulated
              </div>
              <h3 className="mt-1 text-2xl font-bold text-white tracking-tight">Enterprise</h3>
              <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                For organizations with strict governance, VPC deployment, or custom compliance SLAs.
              </p>

              <div className="mt-6 flex items-baseline">
                <span className="text-4xl font-extrabold text-white font-mono">Custom</span>
                <span className="text-xs text-neutral-400 ml-2">tailored agreements</span>
              </div>

              <div className="mt-8 space-y-3 pt-6 border-t border-white/[0.08] text-xs text-neutral-300">
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Dedicated VPC or on-premise Docker deployment</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Custom LLM fine-tuning & local model serving</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>SAML 2.0 / Okta / Azure AD Single Sign-On (SSO)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Custom data residency & 99.99% uptime SLA</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#c6f432] flex-shrink-0" />
                  <span>Dedicated solutions architect & 24/7 Slack bridge</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/[0.08]">
              <a
                href="mailto:enterprise@gibcom.ai"
                className="w-full inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.04] py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/[0.08] transition-colors"
              >
                Contact Enterprise Sales
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

