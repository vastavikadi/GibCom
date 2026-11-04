'use client';

import { Check, X, Sparkles } from 'lucide-react';

export function LandingComparison() {
  const features = [
    {
      capability: 'Understands "Why" decisions were made',
      wiki: false,
      rag: false,
      brain: true,
      note: 'Parses tradeoffs, rejected alternatives & consensus',
    },
    {
      capability: 'Autonomous real-time learning via webhooks',
      wiki: false,
      rag: false,
      brain: true,
      note: 'Ingests GitHub PRs & Slack threads as they happen',
    },
    {
      capability: 'Proactive Contradiction Detection Engine',
      wiki: false,
      rag: false,
      brain: true,
      note: 'Flags conflicting policies before PRs merge',
    },
    {
      capability: 'Temporal evolution (tracks deprecation vs v3)',
      wiki: false,
      rag: false,
      brain: true,
      note: 'Never returns stale legacy advice as modern truth',
    },
    {
      capability: 'Automatic Subject Matter Expert (SME) discovery',
      wiki: false,
      rag: false,
      brain: true,
      note: 'Maps git authors & active channel respondents',
    },
    {
      capability: 'AES-256-GCM secret encryption at rest',
      wiki: false,
      rag: false,
      brain: true,
      note: 'Enterprise zero-trust token security envelope',
    },
    {
      capability: 'Zero documentation maintenance overhead',
      wiki: false,
      rag: false,
      brain: true,
      note: 'Extracts memories autonomously from everyday chatter & code',
    },
  ];

  return (
    <section id="features" className="relative bg-[#0d0f0e] py-24 text-white overflow-hidden border-t border-white/[0.08]">
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            Architectural Differentiation
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Why traditional wikis and naive RAG fail.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Wikis decay the moment they are written. Basic vector RAG grabs matching text chunks without understanding time, consensus, or technical contradictions.
          </p>
        </div>

        {/* Matrix Table */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-white/[0.1] bg-[#121413]/90 backdrop-blur-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.1] bg-[#161a16]">
                  <th className="py-5 px-6 text-sm font-bold text-white w-2/5">
                    Cognitive Capability
                  </th>
                  <th className="py-5 px-6 text-xs font-mono uppercase tracking-wider text-neutral-400 text-center w-1/5">
                    Wikis (Notion/Confluence)
                  </th>
                  <th className="py-5 px-6 text-xs font-mono uppercase tracking-wider text-neutral-400 text-center w-1/5">
                    Basic Vector RAG
                  </th>
                  <th className="py-5 px-6 text-xs font-mono font-bold uppercase tracking-wider text-[#c6f432] text-center w-1/5 bg-[#c6f432]/10 border-x border-[#c6f432]/30">
                    GibCom
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-sm">
                {features.map((f, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-medium text-white">
                      <div>{f.capability}</div>
                      <div className="text-xs text-neutral-500 font-normal mt-0.5">{f.note}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <X className="h-5 w-5 text-neutral-600" />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex justify-center">
                        <X className="h-5 w-5 text-neutral-600" />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center bg-[#c6f432]/5 border-x border-[#c6f432]/20">
                      <div className="flex justify-center">
                        <div className="h-6 w-6 rounded-full bg-[#c6f432] flex items-center justify-center text-[#0b0b0c] shadow-[0_0_12px_rgba(198,244,50,0.4)]">
                          <Check className="h-4 w-4 stroke-[3]" />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

