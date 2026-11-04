'use client';

import { ShieldCheck, Lock, EyeOff, Server, FileText, CheckCircle2 } from 'lucide-react';

export function LandingSecurity() {
  const pillars = [
    {
      icon: Lock,
      title: 'AES-256-GCM Encryption at Rest',
      description:
        'All third-party connector tokens (GitHub PATs, Slack Bot tokens, Jira API credentials) are sealed using authenticated AES-256-GCM with unique 96-bit IVs and 128-bit auth tags.',
      badge: 'FIPS 140-2 Compliant',
    },
    {
      icon: EyeOff,
      title: 'Zero Training Retention',
      description:
        'Your proprietary code, architecture RFCs, and Slack conversations are never used to train foundational AI models. Inference calls to Meta AI Muse-Spark operate under strict zero-retention SLAs.',
      badge: 'Zero-Retention Pipeline',
    },
    {
      icon: ShieldCheck,
      title: 'Granular RBAC & Org Isolation',
      description:
        'Enterprise multi-tenant isolation ensures data never bleeds across organizational boundaries. Strict role enforcement (Admin, Member, Viewer) controls connector configurations and audit logs.',
      badge: 'Multi-Tenant Isolation',
    },
    {
      icon: Server,
      title: 'Immutable Audit Trail',
      description:
        'Every memory access, connector synchronization event, and policy change is permanently logged with actor IDs, IP fingerprints, and timestamps for compliance certification.',
      badge: 'SOC-2 Ready Posture',
    },
  ];

  return (
    <section id="security" className="relative bg-[#0b0b0c] py-24 text-white overflow-hidden">
      {/* Subtle ambient security glow */}
      <div 
        className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2 w-[700px] h-[350px] rounded-full blur-[140px] opacity-15"
        style={{
          background: 'radial-gradient(circle, #c6f432 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            Enterprise Zero-Trust Posture
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Built from the ground up for strict enterprise security.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            Security isn't a checkbox or an afterthought. Every layer of GibCom is cryptographically sealed and isolated.
          </p>
        </div>

        {/* 4 Security Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="group rounded-2xl border border-white/[0.08] bg-[#121413]/90 p-8 backdrop-blur-xl transition-all duration-300 hover:border-[#c6f432]/40 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#c6f432] group-hover:bg-[#c6f432]/10 transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#c6f432]/10 text-[#c6f432] border border-[#c6f432]/25">
                    {p.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
                  {p.description}
                </p>

                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-xs text-neutral-300 font-mono">
                  <CheckCircle2 className="h-4 w-4 text-[#c6f432]" />
                  <span>Enforced at API gateway & database tier</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

