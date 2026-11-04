'use client';

import { useState } from 'react';
import { 
  GitCommit, 
  Layers, 
  AlertOctagon, 
  Users, 
  History, 
  ShieldAlert, 
  Scale, 
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export function LandingDimensions() {
  const dimensions = [
    {
      id: 'decisions',
      number: '01',
      title: 'Decisions & ADRs',
      subtitle: 'The Tradeoffs & Consensus',
      icon: GitCommit,
      summary: 'Captures why choices were made, alternatives rejected, and who agreed.',
      details: [
        'Parses PR discussions, Slack RFC threads, and Confluence decisions',
        'Records both the winning approach and the specific reasons alternatives failed',
        'Prevents junior or new engineers from relitigating settled architectural choices',
      ],
      tag: 'ADR & RFC Synthesis',
    },
    {
      id: 'blueprints',
      number: '02',
      title: 'Architectural Blueprints',
      subtitle: 'System Topology & Boundaries',
      icon: Layers,
      summary: 'Maintains an up-to-date mental model of microservices, schemas, and contracts.',
      details: [
        'Discovers service-to-service communication paths and event publishers',
        'Indexes API schemas, message queues, and database constraints',
        'Answers questions like "Which services consume the order-created Kafka topic?"',
      ],
      tag: 'Dependency Graphs',
    },
    {
      id: 'failure',
      number: '03',
      title: 'Failure Intelligence',
      subtitle: 'Incidents & Post-Mortems',
      icon: AlertOctagon,
      summary: 'Ensures your engineering organization never makes the exact same mistake twice.',
      details: [
        'Indexes incident post-mortems, root cause analyses (RCAs), and outages',
        'Automatically links new PR diffs against past incident triggers',
        'Warns code authors: "This pattern triggered a P1 Redis outage in Q2"',
      ],
      tag: 'Regression Shield',
    },
    {
      id: 'people',
      number: '04',
      title: 'People & SME Routing',
      subtitle: 'Who Knows What & Who Built What',
      icon: Users,
      summary: 'Routes questions to the real subject matter experts based on actual code contributions.',
      details: [
        'Analyzes git commit volume, PR review approvals, and Slack answer density',
        'Identifies bus factors and critical dependency on single engineers',
        'Instantly suggests: "Sarah built this auth module; consult her before modifying"',
      ],
      tag: 'Expert Discovery',
    },
    {
      id: 'temporal',
      number: '05',
      title: 'Temporal Evolution',
      subtitle: 'How Systems Mutate Over Time',
      icon: History,
      summary: 'Tracks the historical lifecycle of ideas, deprecations, and migrations.',
      details: [
        'Preserves chronological timelines of architecture revisions from v1 to v3',
        'Distinguishes between legacy practices and modern approved standards',
        'Never returns deprecated advice as current engineering truth',
      ],
      tag: 'Chronological Tracking',
    },
    {
      id: 'contradictions',
      number: '06',
      title: 'Contradiction Detection',
      subtitle: 'Automated Conflict Resolution',
      icon: ShieldAlert,
      summary: 'Proactively identifies conflicting policies, RFCs, and code implementations.',
      details: [
        'Detects semantic contradictions across different repos and documentation pages',
        'Flags policy mismatches before PRs merge into production',
        'Provides one-click admin contradiction resolution workflows',
      ],
      tag: 'Automated Guardrails',
    },
    {
      id: 'constraints',
      number: '07',
      title: 'Hard Business Constraints',
      subtitle: 'SLAs, Compliance & Thresholds',
      icon: Scale,
      summary: 'Enforces hard business boundaries across all software development.',
      details: [
        'Indexes SOC-2, GDPR, HIPAA, and data residency compliance boundaries',
        'Enforces API latency SLAs and cloud cost budget ceilings',
        'Ensures architecture decisions honor legal and infrastructure limits',
      ],
      tag: 'Compliance & Governance',
    },
  ];

  const [activeId, setActiveId] = useState<string>(dimensions[0].id);
  const active = dimensions.find((d) => d.id === activeId) || dimensions[0];
  const ActiveIcon = active.icon;

  return (
    <section id="7d-memory" className="relative bg-[#0b0b0c] py-24 text-white overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            The 7 Dimensions of Memory
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            Not just documents.{' '}
            <span 
              className="italic font-serif font-normal text-[#c6f432]"
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
            >
              Structured
            </span>{' '}
            organizational cognition.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-neutral-400 leading-relaxed">
            Standard RAG treats all text as flat dumb strings. GibCom categorizes, verifies, and interconnects knowledge across seven distinct cognitive dimensions.
          </p>
        </div>

        {/* 7 Dimensions Interactive Grid / Selector */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Dimension List Tabs */}
          <div className="lg:col-span-5 flex flex-col gap-2">
            {dimensions.map((dim) => {
              const Icon = dim.icon;
              const isSelected = dim.id === activeId;
              return (
                <button
                  key={dim.id}
                  onClick={() => setActiveId(dim.id)}
                  className={`flex items-center justify-between rounded-xl p-4 text-left transition-all ${
                    isSelected
                      ? 'bg-[#151914] border border-[#c6f432]/50 shadow-[0_0_25px_rgba(198,244,50,0.15)] text-white'
                      : 'border border-white/[0.05] bg-[#121413]/50 text-neutral-400 hover:bg-[#141615] hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-[#c6f432]">{dim.number}</span>
                    <div className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white flex-shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-sm font-semibold tracking-tight text-white truncate">
                        {dim.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {dim.subtitle}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                    isSelected
                      ? 'bg-[#c6f432] text-[#0b0b0c] font-bold'
                      : 'bg-white/[0.05] text-neutral-400'
                  }`}>
                    {dim.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Dimension Spotlight Showcase Card */}
          <div className="lg:col-span-7 rounded-2xl border-2 border-[#c6f432]/40 bg-[#141714]/95 p-8 sm:p-10 shadow-[0_0_50px_rgba(198,244,50,0.15)] backdrop-blur-2xl">
            <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[#c6f432]/10 border border-[#c6f432]/30 flex items-center justify-center text-[#c6f432]">
                  <ActiveIcon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-[#c6f432] uppercase tracking-wider">
                    Dimension {active.number}
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {active.title}
                  </h3>
                </div>
              </div>

              <span className="rounded-full bg-white/[0.06] border border-white/[0.1] px-3 py-1 text-xs font-mono text-neutral-300">
                Live in pgvector
              </span>
            </div>

            <p className="mt-6 text-base sm:text-lg text-white font-medium leading-relaxed">
              {active.summary}
            </p>

            {/* Bullet Details */}
            <div className="mt-8 space-y-4">
              {active.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/[0.05] p-3.5">
                  <CheckCircle2 className="h-5 w-5 text-[#c6f432] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {detail}
                  </p>
                </div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-10 pt-6 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">
                Continuous webhook ingestion enabled
              </span>
              <a
                href="#playground"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#c6f432] hover:text-white transition-colors"
              >
                <span>Test in Playground</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

