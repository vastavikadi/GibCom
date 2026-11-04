'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calculator, DollarSign, TrendingUp, Users } from 'lucide-react';

export function LandingROI() {
  const [teamSize, setTeamSize] = useState<number>(45);
  const [avgSalary, setAvgSalary] = useState<number>(165000);

  // Constants based on developer productivity research:
  // Avg engineer spends ~4.5 hours/week searching for context, asking in Slack, or re-debating settled decisions
  const hoursSavedPerWeekPerEng = 4.5;
  const workWeeksPerYear = 48;
  const hourlyRate = avgSalary / 2000;

  const totalHoursSavedAnnual = Math.round(teamSize * hoursSavedPerWeekPerEng * workWeeksPerYear);
  const totalValueUnlocked = Math.round(totalHoursSavedAnnual * hourlyRate);
  const meetingsAvoidedAnnual = Math.round(teamSize * 2.5 * workWeeksPerYear);

  return (
    <section id="roi" className="relative bg-[#0d0f0e] py-24 text-white overflow-hidden border-t border-white/[0.08]">
      <div className="relative mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c6f432]">
            Engineering Velocity ROI
          </p>
          <h2 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Calculate your engineering time unlocked.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-neutral-400">
            See the exact productivity and cost savings your engineering organization recovers by eliminating context fragmentation.
          </p>
        </div>

        {/* Interactive Calculator Card */}
        <div className="max-w-5xl mx-auto rounded-2xl border border-white/[0.1] bg-[#121413]/90 backdrop-blur-2xl p-8 sm:p-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Controls: Sliders */}
            <div className="lg:col-span-6 space-y-8">
              {/* Slider 1: Team Size */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#c6f432]" />
                    <span>Engineering Team Size</span>
                  </label>
                  <span className="text-lg font-bold font-mono text-[#c6f432]">
                    {teamSize} engineers
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={teamSize}
                  onChange={(e) => setTeamSize(Number(e.target.value))}
                  className="w-full h-2 bg-[#232a22] rounded-lg appearance-none cursor-pointer accent-[#c6f432]"
                />
                <div className="flex justify-between text-[11px] font-mono text-neutral-500 mt-1">
                  <span>5 engineers</span>
                  <span>250 engineers</span>
                  <span>500+ engineers</span>
                </div>
              </div>

              {/* Slider 2: Average Salary */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-white flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[#c6f432]" />
                    <span>Average Annual Salary</span>
                  </label>
                  <span className="text-lg font-bold font-mono text-[#c6f432]">
                    ${(avgSalary / 1000).toFixed(0)}k / year
                  </span>
                </div>
                <input
                  type="range"
                  min="80000"
                  max="280000"
                  step="5000"
                  value={avgSalary}
                  onChange={(e) => setAvgSalary(Number(e.target.value))}
                  className="w-full h-2 bg-[#232a22] rounded-lg appearance-none cursor-pointer accent-[#c6f432]"
                />
                <div className="flex justify-between text-[11px] font-mono text-neutral-500 mt-1">
                  <span>$80k</span>
                  <span>$180k</span>
                  <span>$280k</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-neutral-400 leading-relaxed">
                <span className="text-white font-medium">Model Assumptions:</span> Based on an average saving of 4.5 hours per engineer per week across 48 annual work weeks, eliminating repetitive Slack threads, searching dead wikis, and relitigating past RFC decisions.
              </div>
            </div>

            {/* Right Display: Unlocked Value */}
            <div className="lg:col-span-6 rounded-2xl border-2 border-[#c6f432]/40 bg-[#141714] p-8 sm:p-10 text-center shadow-[0_0_40px_rgba(198,244,50,0.15)] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#c6f432]">
                  Annual Engineering Value Unlocked
                </span>
                <div className="mt-2 text-5xl sm:text-6xl font-black text-white tracking-tight font-mono">
                  ${(totalValueUnlocked / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}k
                </div>
                <p className="mt-2 text-xs text-neutral-400">
                  Direct productivity returned to your product roadmap
                </p>
              </div>

              {/* Metrics Breakdown */}
              <div className="mt-8 grid grid-cols-2 gap-4 pt-6 border-t border-white/[0.08]">
                <div className="text-left">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                    {totalHoursSavedAnnual.toLocaleString()} hrs
                  </div>
                  <div className="text-[11px] font-mono text-[#c6f432] uppercase tracking-wider mt-0.5">
                    Hours saved annually
                  </div>
                </div>

                <div className="text-left">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                    {meetingsAvoidedAnnual.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-mono text-[#c6f432] uppercase tracking-wider mt-0.5">
                    Sync meetings avoided
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 pt-6 border-t border-white/[0.08]">
                <Link
                  href="/auth/register"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#c6f432] py-3.5 px-6 text-sm font-bold uppercase tracking-wider text-[#0b0b0c] hover:bg-[#d5fa4b] transition-all shadow-[0_0_25px_rgba(198,244,50,0.4)]"
                >
                  <span>Unlock This Velocity Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="mt-2 text-[11px] text-neutral-500 font-mono">
                  Average customer payback period: &lt; 14 days
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

