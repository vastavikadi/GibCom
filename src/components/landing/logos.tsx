'use client';

import { GitHubIcon, SlackIcon, JiraIcon, ConfluenceIcon, GoogleDriveIcon } from '@/components/connector-icons';
import { Database, Cpu, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

export function LandingLogos() {
  const connectors = [
    {
      name: 'GitHub',
      description: 'PRs, Commits, Discussions & HMAC-SHA256 Webhooks',
      icon: GitHubIcon,
      status: 'Live Webhooks',
      color: '#ffffff',
    },
    {
      name: 'Slack',
      description: 'Public & private channels, message threads, decision consensus',
      icon: SlackIcon,
      status: 'Event API v2',
      color: '#36c5f0',
    },
    {
      name: 'Jira Software',
      description: 'Issues, epics, blockers, and sprint change logs',
      icon: JiraIcon,
      status: 'REST Cloud',
      color: '#2684ff',
    },
    {
      name: 'Confluence',
      description: 'Spaces, technical RFCs, meeting notes & architecture briefs',
      icon: ConfluenceIcon,
      status: 'REST v2',
      color: '#0052cc',
    },
    {
      name: 'Google Drive',
      description: 'Google Docs, architecture design briefs, and specs',
      icon: GoogleDriveIcon,
      status: 'Drive API v3',
      color: '#34a853',
    },
  ];

  return (
    <section id="connectors" className="relative border-y border-white/[0.08] bg-[#0d0f0e] py-16 text-white overflow-hidden">
      {/* Background radial glow */}
      <div 
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full blur-[120px] opacity-15"
        style={{
          background: 'radial-gradient(circle, #c6f432 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            Sub-Second Autonomous Synchronization
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Connects natively to where your team already builds.
          </h2>
          <p className="mt-3 text-sm text-neutral-400">
            Encrypted with AES-256-GCM at rest. Zero training retention. Plug in your webhook or API token and let GibCom self-synthesize your engineering truth.
          </p>
        </div>

        {/* Connectors Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {connectors.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.name}
                className="group relative rounded-xl border border-white/[0.08] bg-[#141615]/80 p-5 backdrop-blur-md transition-all duration-300 hover:border-[#c6f432]/50 hover:bg-[#181c17] hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:border-[#c6f432]/30 transition-colors">
                    <Icon size={22} />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c6f432]/10 text-[#c6f432] border border-[#c6f432]/20">
                    {c.status}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-white tracking-tight group-hover:text-[#c6f432] transition-colors">
                  {c.name}
                </h3>
                <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed line-clamp-2">
                  {c.description}
                </p>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                  <span>AES-256-GCM</span>
                  <span className="text-[#c6f432]">● Active Sync</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dual Core Engine Badges: Meta AI + pgvector */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-neutral-300">
          <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#121413] px-4 py-2">
            <Cpu className="h-4 w-4 text-[#c6f432]" />
            <span>LLM: Meta AI Muse-Spark 1.3 Engine</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#121413] px-4 py-2">
            <Database className="h-4 w-4 text-[#c6f432]" />
            <span>Embeddings: PostgreSQL 14+ with pgvector(1536)</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#121413] px-4 py-2">
            <ShieldCheck className="h-4 w-4 text-[#c6f432]" />
            <span>Zero Data Training Retention Policy</span>
          </div>
        </div>
      </div>
    </section>
  );
}

