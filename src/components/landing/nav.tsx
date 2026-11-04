'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowRight, Menu, X, Sparkles, Shield, Cpu, Layers } from 'lucide-react';
import { BrainMark } from '@/components/brand';

interface LandingNavProps {
  onOpenDemo?: () => void;
}

export function LandingNav({ onOpenDemo }: LandingNavProps) {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.07] bg-[#0b0b0c]/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#141714] border border-[#c6f432]/30 text-[#c6f432] transition-all duration-300 group-hover:border-[#c6f432] group-hover:shadow-[0_0_20px_rgba(198,244,50,0.35)]">
            <BrainMark size={24} className="transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute -inset-0.5 rounded-xl bg-[#c6f432]/10 blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-semibold text-white tracking-tight text-lg">GibCom</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden items-center gap-8 md:flex text-sm font-medium text-neutral-300">
          <a
            href="#features"
            className="transition-colors hover:text-white hover:text-shadow-sm flex items-center gap-1.5"
          >
            Features
          </a>
          <a
            href="#7d-memory"
            className="transition-colors hover:text-white flex items-center gap-1.5"
          >
            <span>7D Memory</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#c6f432]" />
          </a>
          <a
            href="#connectors"
            className="transition-colors hover:text-white"
          >
            Connectors
          </a>
          <a
            href="#playground"
            className="transition-colors hover:text-white"
          >
            Playground
          </a>
          <a
            href="#security"
            className="transition-colors hover:text-white"
          >
            Security
          </a>
          <a
            href="#roi"
            className="transition-colors hover:text-white"
          >
            ROI
          </a>
          <a
            href="#pricing"
            className="transition-colors hover:text-white"
          >
            Pricing
          </a>
        </nav>

        {/* CTA Buttons */}
        <div className="hidden items-center gap-4 sm:flex">
          {session ? (
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full bg-[#c6f432] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#0b0b0c] transition-all hover:bg-[#d5fa4b] hover:shadow-[0_0_25px_rgba(198,244,50,0.45)]"
            >
              <span>Go to Brain</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-xs font-semibold text-neutral-300 transition-colors hover:text-white px-3 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#c6f432] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#0b0b0c] transition-all hover:bg-[#d4f845] hover:shadow-[0_0_30px_rgba(198,244,50,0.5)]"
              >
                <span>Start Free</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-lg p-2 text-neutral-400 hover:text-white md:hidden"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-white/[0.08] bg-[#0b0b0c] px-6 py-6 md:hidden animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-4 text-base font-medium text-neutral-300">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Features
            </a>
            <a
              href="#7d-memory"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white flex items-center justify-between"
            >
              <span>7D Memory</span>
              <span className="text-xs text-[#c6f432]">New</span>
            </a>
            <a
              href="#connectors"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Connectors
            </a>
            <a
              href="#playground"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Playground
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Security
            </a>
            <a
              href="#roi"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              ROI Calculator
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-white"
            >
              Pricing
            </a>
            <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-3">
              {session ? (
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 rounded-full bg-[#c6f432] py-3 text-sm font-bold text-[#0b0b0c]"
                >
                  Go to Brain Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="flex items-center justify-center rounded-full border border-white/20 py-2.5 text-sm font-medium text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="flex items-center justify-center gap-2 rounded-full bg-[#c6f432] py-3 text-sm font-bold text-[#0b0b0c]"
                  >
                    <span>Start Free Trial</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

