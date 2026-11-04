'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Minus } from 'lucide-react';

export function LandingFAQ() {
  const faqs = [
    {
      q: 'Does Meta AI train on our private code, Slack threads, or RFCs?',
      a: 'No. Never. We operate under a strict zero-retention enterprise agreement. All inferences via Meta AI Muse-Spark 1.3 process queries statelessly in-memory and are immediately purged. Your code, documents, and chat threads are never used for model training or retained by model providers.',
    },
    {
      q: 'How long does it take to connect our repositories and channels?',
      a: 'Under 60 seconds per connector. Simply input your GitHub Personal Access Token or configure Slack Event Subscriptions. As soon as you save, GibCom validates the connection, seals your secrets with AES-256-GCM encryption, and begins autonomous indexing immediately.',
    },
    {
      q: 'How does the Contradiction Detection Engine actually work?',
      a: 'When new pull requests, ADRs, or Slack consensus statements are ingested, GibCom performs semantic and logical cross-referencing against active organizational memories in PostgreSQL pgvector. If a PR introduces an architectural pattern or parameter (e.g. 60s Redis TTL) that violates an approved RFC (e.g. 15s max TTL), it flags an alert with direct citations before production deployment.',
    },
    {
      q: 'What happens when a senior engineer or architect leaves the company?',
      a: 'The greatest benefit of GibCom is preventing tribal brain drain. Every technical decision, review feedback comment, and architectural debate they participated in remains indexed and structured in the 7D memory graph. New hires can simply ask questions and receive the departing architect’s documented rationale with exact source breadcrumbs.',
    },
    {
      q: 'Can we deploy GibCom on our own private AWS, GCP, or Azure VPC?',
      a: 'Yes. Our Enterprise tier includes self-hosted Docker and Kubernetes Helm charts. You can run GibCom entirely within your own cloud boundary with your own PostgreSQL instance and local or private LLM endpoints.',
    },
    {
      q: 'How is this different from GitHub Copilot or Cursor?',
      a: 'Copilot and Cursor are code-completion tools that operate within the localized context of an IDE window. GibCom is the institutional memory and architectural guardrail of your entire engineering organization. It knows why decisions were made 18 months ago, who the SME is, and whether a new service violates company-wide architectural principles.',
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="relative bg-[#0b0b0c] py-24 text-white overflow-hidden">
      <div className="relative mx-auto max-w-4xl px-6 sm:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            Frequently Answered Questions
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Everything you need to know.
          </h2>
          <p className="mt-3 text-sm text-neutral-400">
            Have questions about privacy, architecture, or integrations? We have answers.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/[0.08] bg-[#121413]/90 backdrop-blur-xl transition-colors hover:border-[#c6f432]/30 overflow-hidden"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-6 text-left transition-colors"
                >
                  <span className="text-base sm:text-lg font-semibold text-white tracking-tight pr-4">
                    {faq.q}
                  </span>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform ${
                    isOpen ? 'bg-[#c6f432] text-[#0b0b0c] rotate-180' : 'bg-white/[0.05] text-neutral-400'
                  }`}>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm text-neutral-300 leading-relaxed border-t border-white/[0.04]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

