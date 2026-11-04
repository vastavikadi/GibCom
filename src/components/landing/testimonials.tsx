'use client';

import { Star, Quote } from 'lucide-react';

export function LandingTestimonials() {
  const testimonials = [
    {
      quote:
        'GibCom eliminated our most painful engineering bottleneck: tribal knowledge walking out the door when senior engineers leave. Our onboarding time dropped from 8 weeks to under 10 days.',
      author: 'Elena Vance',
      role: 'VP of Engineering',
      company: 'ScaleCloud Infrastructure',
      metric: '3x Faster PR Reviews',
    },
    {
      quote:
        'The Contradiction Detection engine flagged a cache TTL conflict between our Checkout and Pricing microservices before the PR merged. That single alert prevented a multi-million-dollar Black Friday outage.',
      author: 'Marcus Lindqvist',
      role: 'Principal Systems Architect',
      company: 'FintechCore Global',
      metric: '0 Production Policy Clashes',
    },
    {
      quote:
        'Our engineers used to spend half their Monday standup re-debating why we rejected MongoDB for PostgreSQL in 2023. Now GibCom answers it in 2 seconds with the exact ADR and meeting consensus.',
      author: 'Priya Patel',
      role: 'Head of Product Platform',
      company: 'HyperGrowth Systems',
      metric: '87% Less Slack Noise',
    },
  ];

  return (
    <section className="relative bg-[#0b0b0c] py-24 text-white overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            Engineering Teams Love GibCom
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Trusted by teams that ship with speed and clarity.
          </h2>
        </div>

        {/* 3 Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="relative rounded-2xl border border-white/[0.08] bg-[#121413]/90 p-8 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:border-[#c6f432]/40 hover:-translate-y-1"
            >
              <div>
                {/* 5 Stars in Lime */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#c6f432] text-[#c6f432]" />
                  ))}
                </div>

                <p className="text-sm sm:text-base text-neutral-300 leading-relaxed italic">
                  "{t.quote}"
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">{t.author}</div>
                    <div className="text-xs text-neutral-400">{t.role}</div>
                    <div className="text-xs text-[#c6f432] font-mono mt-0.5">{t.company}</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#c6f432]/10 text-[#c6f432] border border-[#c6f432]/25">
                    {t.metric}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

