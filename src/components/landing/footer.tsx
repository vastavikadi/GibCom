'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, Terminal, Github, Twitter, Disc as Discord } from 'lucide-react';
import { BrainMark } from '@/components/brand';

export function LandingFooter() {
  return (
    <footer className="relative bg-[#080909] text-white border-t border-white/[0.08] overflow-hidden">
      {/* High-Voltage Final CTA Section */}
      <div className="relative py-24 sm:py-32 overflow-hidden border-b border-white/[0.08]">
        {/* Ambient radial lime aura behind CTA */}
        <div 
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] rounded-full blur-[160px] opacity-25"
          style={{
            background: 'radial-gradient(circle, #c6f432 0%, rgba(198, 244, 50, 0.2) 45%, transparent 75%)',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c6f432]/30 bg-[#151914] px-4 py-1.5 text-xs text-[#c6f432] mb-6">
            <span className="h-2 w-2 rounded-full bg-[#c6f432] animate-ping" />
            <span className="font-semibold">Ready in 60 seconds with your existing tools</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Stop losing your company's <br />
            greatest asset:{' '}
            <span 
              className="italic font-serif font-normal text-[#c6f432]"
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif' }}
            >
              its memory.
            </span>
          </h2>

          <p className="mt-6 text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Connect Slack, GitHub, Jira, and Confluence. Eliminate context hunting, onboard engineers in days, and guard against conflicting architecture decisions.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="group inline-flex items-center gap-2 rounded-full bg-[#c6f432] px-8 py-4 text-sm font-bold uppercase tracking-wider text-[#0b0b0c] transition-all duration-300 hover:bg-[#d5fa4b] hover:scale-105 hover:shadow-[0_0_35px_rgba(198,244,50,0.5)]"
            >
              <span>Launch Your Brain Free</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-8 py-4 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/40 hover:bg-white/[0.08]"
            >
              <span>Sign In to Existing Workspace</span>
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-neutral-500 font-mono">
            <span>✓ No credit card required</span>
            <span>✓ 14-day full feature trial</span>
            <span>✓ AES-256-GCM encrypted</span>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto max-w-7xl px-6 sm:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Col 1: Brand Info */}
          <div className="col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141714] border border-[#c6f432]/30 text-[#c6f432]">
                <BrainMark size={22} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white tracking-tight text-lg">GibCom</span>
              </div>
            </div>

            <p className="mt-4 text-xs text-neutral-400 max-w-sm leading-relaxed">
              The self-evolving organizational intelligence platform. Synthesizing pull requests, Slack debates, Jira issues, and RFCs into unified 7D memory.
            </p>

            {/* Live Operational Status Indicator */}
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#121413] px-3.5 py-1.5 text-[11px] font-mono text-neutral-300">
              <span className="h-2 w-2 rounded-full bg-[#c6f432] shadow-[0_0_8px_#c6f432]" />
              <span>All Systems Operational</span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400">Muse-Spark 1.3 Online</span>
            </div>
          </div>

          {/* Col 2: Product */}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
              Product
            </div>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#7d-memory" className="hover:text-white transition-colors">7D Memory Graph</a></li>
              <li><a href="#playground" className="hover:text-white transition-colors">Interactive Playground</a></li>
              <li><a href="#connectors" className="hover:text-white transition-colors">Connectors & Webhooks</a></li>
              <li><a href="#roi" className="hover:text-white transition-colors">ROI Calculator</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Plans</a></li>
            </ul>
          </div>

          {/* Col 3: Integrations */}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
              Integrations
            </div>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              <li><a href="#connectors" className="hover:text-white transition-colors">GitHub Webhooks</a></li>
              <li><a href="#connectors" className="hover:text-white transition-colors">Slack Events API</a></li>
              <li><a href="#connectors" className="hover:text-white transition-colors">Jira Software Cloud</a></li>
              <li><a href="#connectors" className="hover:text-white transition-colors">Confluence Spaces</a></li>
              <li><a href="#connectors" className="hover:text-white transition-colors">Google Drive Docs</a></li>
              <li><a href="#connectors" className="hover:text-white transition-colors">PostgreSQL pgvector</a></li>
            </ul>
          </div>

          {/* Col 4: Trust & Legal */}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-4">
              Trust & Legal
            </div>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              <li><a href="#security" className="hover:text-white transition-colors">Security Architecture</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">AES-256-GCM Spec</a></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Zero-Retention Policy</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Privacy Notice</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">SOC-2 Readiness</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-mono">
          <div>
            © {new Date().getFullYear()} GibCom, Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Powered by Meta AI & pgvector</span>
            <span>•</span>
            <span>v2.4 Production</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

