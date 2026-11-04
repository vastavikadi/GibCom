'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  GitBranch,
  GraduationCap,
  HelpCircle,
  Layers3,
  Loader2,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

import { BrainMark } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { PageIntro, WorkspaceFooter } from '@/components/workspace';
import { request } from '@/lib/client';

interface Proposal {
  title: string;
  description: string;
  memoryType: string;
  confidence: number;
  relatedEntities: string[];
  attributes: Record<string, unknown>;
  validFrom: string | null;
  validUntil: string | null;
  excerpt: string;
}

interface ClarifyingQuestion {
  id: string;
  question: string;
  placeholder?: string;
  options?: string[];
}

const types = [
  {
    value: 'decision',
    label: 'A decision',
    icon: GitBranch,
    hint: 'What did your team decide? Explain the alternatives you considered and why you chose this direction.',
  },
  {
    value: 'process',
    label: 'A process',
    icon: Layers3,
    hint: 'Walk through how this process works. Include the owner, steps, dependencies, and exceptions.',
  },
  {
    value: 'people',
    label: 'Expertise',
    icon: Users,
    hint: 'Who understands this area? Describe their responsibilities and the work behind their expertise.',
  },
  {
    value: 'project',
    label: 'Project context',
    icon: BookOpen,
    hint: 'Share a project milestone, ownership change, blocker, or important technical dependency.',
  },
  {
    value: 'relationship',
    label: 'A relationship',
    icon: MessageSquare,
    hint: 'Add context to a customer or partner relationship. Include commitments, dates, and the people involved.',
  },
  {
    value: 'experience',
    label: 'A lesson learned',
    icon: Sparkles,
    hint: 'What happened, what did you learn, and what would you do differently next time?',
  },
];

export default function TeachBrainPage() {
  const [type, setType] = useState('decision');
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<'capture' | 'review' | 'saved'>('capture');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [clarifyingQuestions, setClarifyingQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarifications, setClarifications] = useState<Record<string, string>>({});
  const [highImpact, setHighImpact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [access, setAccess] = useState('organization');
  const [mode, setMode] = useState('');

  const preview = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await request<{
        proposal: Proposal;
        mode: string;
        clarifyingQuestions?: ClarifyingQuestion[];
        highImpact?: boolean;
      }>('/api/brain/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'preview',
          input,
          memoryType: type,
        }),
      });

      setProposal(result.proposal);
      setMode(result.mode);
      setClarifyingQuestions(result.clarifyingQuestions || []);
      setHighImpact(Boolean(result.highImpact));
      setClarifications({});
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to prepare your memory.');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    setError('');
    try {
      await request('/api/brain/teach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'confirm',
          input,
          proposal,
          clarifications,
          accessPolicy: access,
        }),
      });
      setStage('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your memory could not be saved.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-page">
      <PageIntro
        eyebrow="What you know is worth keeping"
        title="A little wisdom. A lasting impact."
        description="Turn individual experience into your company’s collective intelligence."
      />

      <div className="teach-layout">
        <div>
          <div className="stepper">
            {[
              { label: 'Share your knowledge', key: 'capture' },
              { label: 'Clarify & review', key: 'review' },
              { label: 'Add to the Brain', key: 'saved' },
            ].map((step, i) => (
              <div key={step.key} data-active={stage === step.key}>
                <span>
                  {stage === 'saved' || (stage === 'review' && i === 0) ? (
                    <Check size={12} />
                  ) : (
                    String(i + 1).padStart(2, '0')
                  )}
                </span>
                <p>{step.label}</p>
                {i < 2 && <ChevronRight size={12} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="error-note mb-4" role="alert">
              {error}
            </div>
          )}

          {stage === 'saved' ? (
            <section className="panel teach-success">
              <div className="success-seal">
                <BrainMark size={40} />
                <span>
                  <Check size={13} />
                </span>
              </div>
              <span className="eyebrow text-[#94a680]">A new piece of the bigger picture</span>
              <h2 className="display-title">Your knowledge lives on.</h2>
              <p>
                “{proposal?.title}” is now part of your organization’s memory, with your
                attribution, clarified details, and its original context.
              </p>
              <div className="flex gap-2 justify-center my-2">
                <span className="pill pill-gold">
                  <ShieldCheck size={11} />
                  {highImpact ? 'Awaiting Manager Review' : 'Awaiting verification'}
                </span>
                <span className="pill pill-sage capitalize">{proposal?.memoryType}</span>
              </div>
              <div className="flex flex-wrap gap-3 mt-8 justify-center">
                <Button
                  onClick={() => {
                    setInput('');
                    setProposal(null);
                    setClarifications({});
                    setStage('capture');
                  }}
                >
                  Share another insight
                  <ArrowRight size={13} />
                </Button>
                <Button asChild variant="outline">
                  <Link href="/explore">
                    Explore your Brain
                    <ArrowUpRight size={13} />
                  </Link>
                </Button>
              </div>
            </section>
          ) : stage === 'review' && proposal ? (
            <section className="panel p-6 md:p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="eyebrow text-[#93a17f]">The memory you’re creating</span>
                  <h2 className="text-lg font-medium mt-2">A moment for the details.</h2>
                </div>
                <div className="flex gap-2">
                  {highImpact && (
                    <span className="pill pill-rose flex items-center gap-1.5">
                      <AlertTriangle size={11} />
                      High impact
                    </span>
                  )}
                  <span className="pill pill-gold">Unverified</span>
                </div>
              </div>

              {highImpact && (
                <div className="p-4 rounded-xl bg-[#fbf6ea] border border-[#ecd9b5] text-xs leading-6 text-[#7d5e23] mb-6 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-[#b28532] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#684b16]">High Impact Knowledge</div>
                    <p>
                      This memory touches architecture, security, or enterprise commitments. It
                      will be routed for manager verification before being treated as authoritative.
                    </p>
                  </div>
                </div>
              )}

              {/* Clarifying Questions / Ambiguity Resolution */}
              {clarifyingQuestions.length > 0 && (
                <div className="p-5 rounded-xl bg-[#f6f8f2] border border-[#e1ebd6] mb-7">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle size={15} className="text-[#6d8453]" />
                    <h3 className="text-xs font-medium text-[#465a34]">
                      Clarifying details for the Brain
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-5 mb-4">
                    The Brain noticed areas where extra clarity will connect this knowledge to the
                    right people, projects, and decisions.
                  </p>

                  <div className="space-y-4">
                    {clarifyingQuestions.map((q) => (
                      <div key={q.id} className="text-left">
                        <label className="text-[11px] font-medium text-[#3b4c2c] block mb-2">
                          {q.question}
                        </label>
                        {q.options && q.options.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {q.options.map((opt) => (
                              <button
                                type="button"
                                key={opt}
                                onClick={() =>
                                  setClarifications((prev) => ({
                                    ...prev,
                                    [q.id]: opt,
                                  }))
                                }
                                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                                  clarifications[q.id] === opt
                                    ? 'bg-[#5b7346] text-white border-[#5b7346]'
                                    : 'bg-white border-[#d2dec5] text-[#556943] hover:border-[#a4bc92]'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          className="input-field !text-xs !py-2"
                          placeholder={q.placeholder || 'Type custom clarification...'}
                          value={clarifications[q.id] || ''}
                          onChange={(e) =>
                            setClarifications((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="field-label" htmlFor="memory-title">
                Memory title
              </label>
              <input
                id="memory-title"
                className="input-field mb-5"
                value={proposal.title}
                onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
              />

              <label className="field-label" htmlFor="memory-description">
                The knowledge to preserve
              </label>
              <textarea
                id="memory-description"
                className="input-field leading-7 min-h-40 mb-6"
                rows={5}
                value={proposal.description}
                onChange={(e) => setProposal({ ...proposal, description: e.target.value })}
              />

              <div className="grid sm:grid-cols-2 gap-5 mt-4">
                <div>
                  <label htmlFor="knowledge-visibility" className="field-label">
                    Who can learn from this?
                  </label>
                  <select
                    id="knowledge-visibility"
                    className="select-control w-full"
                    value={access}
                    onChange={(e) => setAccess(e.target.value)}
                  >
                    <option value="organization">Everyone in your organization</option>
                    <option value="private">Only you</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="valid-from" className="field-label">
                    When did this become true?{' '}
                    <span className="font-normal text-muted-foreground">Optional</span>
                  </label>
                  <input
                    type="date"
                    id="valid-from"
                    className="input-field !py-2.5"
                    value={proposal.validFrom?.slice(0, 10) || ''}
                    onChange={(e) =>
                      setProposal({
                        ...proposal,
                        validFrom: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                      })
                    }
                  />
                </div>
              </div>

              {proposal.relatedEntities.length > 0 && (
                <div className="mt-5">
                  <span className="text-[10px] text-muted-foreground block mb-2">
                    Related entities linked to graph:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {proposal.relatedEntities.map((name) => (
                      <span className="pill pill-sage" key={name}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-3 mt-8 pt-6 border-t">
                <Button variant="ghost" onClick={() => setStage('capture')} disabled={loading}>
                  <ArrowLeft size={13} />
                  Keep editing
                </Button>
                <Button
                  onClick={save}
                  disabled={loading || !proposal.title.trim() || !proposal.description.trim()}
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Confirm & save memory
                </Button>
              </div>
            </section>
          ) : (
            <section className="panel p-6 md:p-8">
              <div className="flex items-start justify-between mb-7">
                <div>
                  <span className="eyebrow text-[#92a07f]">01 / Capture the context</span>
                  <h2 className="text-lg mt-2 font-medium tracking-tight">
                    What should your company remember?
                  </h2>
                </div>
                <GraduationCap size={22} className="text-[#a0af8a] shrink-0" />
              </div>

              <div className="teach-types">
                {types.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setType(item.value)}
                    data-active={type === item.value}
                  >
                    <item.icon size={16} />
                    {item.label}
                    {type === item.value && <Check size={12} className="ml-auto" />}
                  </button>
                ))}
              </div>

              <label className="field-label mt-7" htmlFor="teach-input">
                Tell the story in your own words
              </label>
              <textarea
                id="teach-input"
                className="input-field teach-input"
                rows={7}
                placeholder={types.find((t) => t.value === type)?.hint}
                value={input}
                maxLength={12000}
                onChange={(e) => setInput(e.target.value)}
              />

              <div className="flex justify-between mt-3 gap-3 text-[9px] text-[#9ca88d]">
                <span>Names, dates, and a little “why” make all the difference.</span>
                <span>{input.length.toLocaleString()} / 12,000</span>
              </div>

              <div className="flex items-center justify-between gap-4 mt-7 pt-6 border-t">
                <span className="text-[10px] text-[#8f9d7e] flex gap-2 items-center">
                  <ShieldCheck size={13} />
                  Your contribution, with your attribution.
                </span>
                <Button onClick={preview} disabled={input.trim().length < 3 || loading}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                  Review memory
                  <ArrowRight size={13} />
                </Button>
              </div>
            </section>
          )}
        </div>

        <aside className="teach-aside">
          <div className="wisdom-card grain">
            <span className="eyebrow text-[#a8bd8b]">The value of a shared perspective</span>
            <div className="wisdom-quote">“</div>
            <h2>
              Someone’s next
              <br />
              breakthrough could
              <br />
              begin with <em>what</em>
              <br />
              <em>you know.</em>
            </h2>
            <div className="w-9 h-px bg-[#8ca67060] my-6" />
            <p>
              The reasoning behind a decision.
              <br />
              The exception to a process.
              <br />
              The lesson that changed your approach.
            </p>
            <p className="mt-4">
              Small pieces of context.
              <br />
              An extraordinary collective advantage.
            </p>
          </div>

          <div className="p-5">
            <h3 className="flex items-center gap-2 text-[11px] text-[#8b9e75]">
              <LockKeyhole size={13} />
              Thoughtfully preserved
            </h3>
            <p className="text-[10px] leading-6 text-[#a2ae95] mt-2">
              Your contribution is attributed to you and saved as unverified knowledge. Your team
              can review it before treating it as established policy.
            </p>
          </div>
        </aside>
      </div>

      <WorkspaceFooter />
    </div>
  );
}
