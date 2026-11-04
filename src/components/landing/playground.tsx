'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, MessageSquare, ShieldAlert, CheckCircle2, ArrowRight, CornerDownLeft, GitPullRequest, Search, FileCode } from 'lucide-react';

interface SamplePrompt {
  id: string;
  label: string;
  query: string;
  dimension: string;
  confidence: number;
  summary: string;
  prose: string;
  sources: { title: string; connector: string; ref: string }[];
  contradiction?: {
    severity: 'high' | 'medium';
    message: string;
  };
}

export function LandingPlayground() {
  const samples: SamplePrompt[] = [
    {
      id: 'session-encryption',
      label: 'Session Encryption',
      query: 'Why did we switch our token storage to AES-256-GCM encryption?',
      dimension: 'Decision Record',
      confidence: 98,
      summary: 'Migrated from plaintext config tokens to AES-256-GCM with 96-bit IVs and 128-bit authentication tags.',
      prose:
        'On Oct 28, security review of PR #419 identified that connector personal access tokens (GitHub PATs, Slack Bot User tokens) were vulnerable if raw database dumps were leaked. Architecture RFC-32 adopted authenticated AES-256-GCM encryption at rest with runtime decryption only when dispatching outbound HTTP requests to connector endpoints.',
      sources: [
        { title: 'Security RFC #32: Zero-Trust Token Encryption', connector: 'Confluence', ref: 'RFC-32' },
        { title: 'PR #421: Implement AES-256-GCM cipher envelope', connector: 'GitHub', ref: 'PR #421' },
        { title: '#eng-security: Incident mitigation consensus', connector: 'Slack', ref: 'thread-849' },
      ],
    },
    {
      id: 'sme-routing',
      label: 'SME & Ownership',
      query: 'Who owns the webhook idempotency key logic across repositories?',
      dimension: 'People & SME Routing',
      confidence: 94,
      summary: 'Elena Rostova (Staff Platform Eng) authored the HMAC-SHA256 verification and replay buffer.',
      prose:
        'Elena Rostova (@erostova) is the primary SME for webhook ingestion across GitHub and Slack connectors. She authored the replay buffer in PR #388 and resolved the ByteString charCode 8226 bug in PR #430. Secondary reviewer: Marcus Chen (@mchen) for Stripe webhook dispatchers.',
      sources: [
        { title: 'PR #388: Ingestion replay buffer & HMAC verification', connector: 'GitHub', ref: 'PR #388' },
        { title: 'CODEOWNERS: /src/lib/connectors/**', connector: 'GitHub', ref: 'CODEOWNERS' },
        { title: '#eng-platform: Webhook replay incident review', connector: 'Slack', ref: 'thread-912' },
      ],
    },
    {
      id: 'contradiction-alert',
      label: 'Contradiction Alert',
      query: 'Are there any conflicting guidelines on API rate limits and cache TTLs?',
      dimension: 'Contradiction Intelligence',
      confidence: 96,
      summary: 'Conflicting cache policies detected between Checkout Service (60s) and Core Gateway RFC-14 (15s).',
      prose:
        'GibCom flagged an unresolved contradiction between two recent changes: Gateway RFC-14 specifies a strict maximum Redis TTL of 15 seconds to prevent stale pricing, whereas Checkout PR #294 configured a 60-second in-memory cache to reduce database load. This discrepancy risks customer checkout checkout failures under peak traffic.',
      contradiction: {
        severity: 'high',
        message: 'High-severity policy clash: 15s Gateway TTL vs 60s Checkout Cache TTL.',
      },
      sources: [
        { title: 'RFC-14: Gateway Dynamic Pricing Cache Constraints', connector: 'Confluence', ref: 'RFC-14' },
        { title: 'PR #294: Optimize checkout cart payload latency', connector: 'GitHub', ref: 'PR #294' },
      ],
    },
  ];

  const [selectedSample, setSelectedSample] = useState<SamplePrompt>(samples[0]);
  const [inputVal, setInputVal] = useState<string>(samples[0].query);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  const handleSelectSample = (sample: SamplePrompt) => {
    setSelectedSample(sample);
    setInputVal(sample.query);
    setIsSynthesizing(true);
    setTimeout(() => {
      setIsSynthesizing(false);
    }, 350);
  };

  return (
    <section id="playground" className="relative bg-[#0d0f0e] py-24 text-white overflow-hidden border-t border-white/[0.08]">
      {/* Background ambient lighting */}
      <div 
        className="pointer-events-none absolute right-1/4 top-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[140px] opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(198, 244, 50, 0.45) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            Interactive Live Sandbox
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Ask any question. See the memory synthesize.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Click a real-world scenario below to experience how GibCom pulls verifiable evidence across Slack, GitHub, Jira, and RFCs in milliseconds.
          </p>

          {/* Sample Pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSelectSample(s)}
                className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
                  selectedSample.id === s.id
                    ? 'bg-[#c6f432] text-[#0b0b0c] shadow-[0_0_20px_rgba(198,244,50,0.35)]'
                    : 'bg-white/[0.05] text-neutral-300 hover:bg-white/[0.1] hover:text-white border border-white/[0.08]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Playground Console Box */}
        <div className="max-w-4xl mx-auto rounded-2xl border border-white/[0.12] bg-[#121413]/95 shadow-2xl backdrop-blur-2xl overflow-hidden">
          {/* Console Header Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-[#161a16]">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs font-mono text-neutral-400 pl-2">
                brain://query/v2.4/meta-muse-spark
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="h-2 w-2 rounded-full bg-[#c6f432] shadow-[0_0_8px_#c6f432]" />
              <span className="text-[#c6f432]">1536d pgvector active</span>
            </div>
          </div>

          {/* Query Input Simulation */}
          <div className="p-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.1] bg-[#0b0b0c] px-4 py-3.5 focus-within:border-[#c6f432]/60 focus-within:shadow-[0_0_20px_rgba(198,244,50,0.15)] transition-all">
              <Search className="h-5 w-5 text-[#c6f432] flex-shrink-0" />
              <input
                type="text"
                readOnly
                value={inputVal}
                className="w-full bg-transparent text-sm text-white focus:outline-none font-mono"
              />
              <span className="rounded bg-white/[0.08] px-2 py-1 text-[10px] font-mono text-neutral-400 flex-shrink-0 flex items-center gap-1">
                <span>Enter</span>
                <CornerDownLeft className="h-3 w-3" />
              </span>
            </div>
          </div>

          {/* Response Payload */}
          <div className="p-6 sm:p-8 space-y-6">
            {isSynthesizing ? (
              <div className="flex items-center justify-center py-12 gap-3 text-sm text-neutral-400 font-mono">
                <Sparkles className="h-5 w-5 text-[#c6f432] animate-spin" />
                <span>Searching pgvector & synthesizing via Meta AI Muse-Spark...</span>
              </div>
            ) : (
              <>
                {/* Meta Badge + Confidence + Dimension Pill */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full bg-[#c6f432]/15 border border-[#c6f432]/30 px-3 py-1 text-xs font-bold text-[#c6f432]">
                      {selectedSample.dimension}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      Meta AI Muse-Spark 1.3
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
                    <CheckCircle2 className="h-4 w-4 text-[#c6f432]" />
                    <span>{selectedSample.confidence}% Confidence Rating</span>
                  </div>
                </div>

                {/* Contradiction Alert Banner (if applicable) */}
                {selectedSample.contradiction && (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold font-mono text-red-400 uppercase tracking-wider">
                        Contradiction Engine Alert
                      </div>
                      <p className="text-xs text-neutral-200 mt-1">
                        {selectedSample.contradiction.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Main Summary */}
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                    {selectedSample.summary}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-neutral-300 leading-relaxed">
                    {selectedSample.prose}
                  </p>
                </div>

                {/* Citation Evidence Pills */}
                <div className="pt-4 border-t border-white/[0.06]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-[#c6f432]" />
                    <span>Verified Source Evidence ({selectedSample.sources.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selectedSample.sources.map((src, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 hover:border-[#c6f432]/40 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 mb-1">
                          <span className="text-[#c6f432]">{src.connector}</span>
                          <span>{src.ref}</span>
                        </div>
                        <div className="text-xs font-medium text-white line-clamp-2">
                          {src.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Playground Footer Bar */}
          <div className="bg-[#141714] border-t border-white/[0.08] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-neutral-400">
              Ready to query your own company repositories, Slack & Jira?
            </span>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#c6f432] px-4 py-1.5 text-xs font-bold text-[#0b0b0c] hover:bg-[#d5fa4b] transition-colors"
            >
              <span>Connect Your Team Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

