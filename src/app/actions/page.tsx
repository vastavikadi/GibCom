
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageIntro,
  WorkspaceFooter,
} from '@/components/workspace';
import { request, shortDate, useWorkspaceData } from '@/lib/client';

const actionTypes = [
  {
    type: 'project_handover',
    label: 'A seamless handover',
    icon: Users,
    desc: 'Pass on the context. Keep the momentum.',
    detail: 'Project handover',
    placeholder:
      'Which project is changing hands, and what should the next owner understand?',
  },
  {
    type: 'meeting_brief',
    label: 'A considered conversation',
    icon: BriefcaseBusiness,
    desc: 'Walk in with the whole picture.',
    detail: 'Meeting brief',
    placeholder:
      'Who is the meeting with, and what would you like to discuss?',
  },
  {
    type: 'customer_report',
    label: 'The complete customer story',
    icon: BookOpen,
    desc: 'Every relationship has a history.',
    detail: 'Customer history',
    placeholder:
      'Which customer would you like to understand better?',
  },
  {
    type: 'onboarding_guide',
    label: 'A thoughtful first chapter',
    icon: ClipboardList,
    desc: 'Help someone feel at home, faster.',
    detail: 'Onboarding guide',
    placeholder:
      'Which role, team, or project is this onboarding guide for?',
  },
  {
    type: 'process_doc',
    label: 'Clarity, step by step',
    icon: FileText,
    desc: 'Make the way you work easier to follow.',
    detail: 'Process documentation',
    placeholder:
      'What process would you like to document, and who will use it?',
  },
  {
    type: 'workflow_improvement',
    label: 'A better way forward',
    icon: Sparkles,
    desc: 'Find a little more room to do great work.',
    detail: 'Workflow proposal',
    placeholder:
      'Which workflow could work better? Describe the friction you want to resolve.',
  },
] as const;

type ActionType = (typeof actionTypes)[number]['type'];

interface Proposal {
  id: string;
  title: string;
  description: string;
  actionType: string;
  approvalStatus: string;
  createdAt: string;
  proposedExecution?: {
    content?: string;
    title?: string;
    steps?: string[];
  };
}

interface Draft {
  title: string;
  content: string;
  steps?: string[];
}

interface GenerateResponse {
  generated?: Draft;
}

export default function ActionsPage() {
  const {
    data: proposals,
    error,
    loading,
    refresh,
  } = useWorkspaceData<Proposal[]>('/api/actions');

  const [selected, setSelected] = useState<ActionType | null>(null);
  const [context, setContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [formError, setFormError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeProposal, setActiveProposal] = useState<Proposal | null>(null);
  const [executionNotes, setExecutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  const action = actionTypes.find((item) => item.type === selected);

  const closeActionModal = () => {
    if (generating) return;

    setSelected(null);
    setContext('');
    setFormError('');
  };

  const generate = async () => {
    if (!selected || !context.trim() || generating) return;

    setGenerating(true);
    setFormError('');

    try {
      const result = await request<{ proposalId?: string; generated?: Draft }>('/api/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: selected,
          context: context.trim(),
        }),
      });

      if (!result.generated?.content) {
        throw new Error('The server returned an empty draft.');
      }

      setDraft(result.generated);
      if (result.proposalId) {
        setActiveProposal({
          id: result.proposalId,
          title: result.generated.title,
          description: context.trim(),
          actionType: selected,
          approvalStatus: 'pending',
          createdAt: new Date().toISOString(),
          proposedExecution: result.generated,
        });
      }
      setSelected(null);
      setContext('');

      await refresh();
    } catch (e) {
      setFormError(
        e instanceof Error
          ? e.message
          : 'Unable to prepare a draft.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!activeProposal) return;
    setActionLoading(true);
    setFormError('');
    try {
      await request(`/api/actions/${activeProposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      setNotice(`Proposal "${activeProposal.title}" approved.`);
      setActiveProposal({ ...activeProposal, approvalStatus: 'approved' });
      await refresh();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!activeProposal) return;
    setActionLoading(true);
    setFormError('');
    try {
      const res = await request<{ success: boolean; memoryId: string; message: string }>(
        `/api/actions/${activeProposal.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'execute', notes: executionNotes }),
        }
      );
      setNotice(
        `Action executed! Outcome preserved in organizational memory (Memory ID: ${res.memoryId ? res.memoryId.slice(0, 8) + '...' : 'created'}).`
      );
      setActiveProposal({ ...activeProposal, approvalStatus: 'executed' });
      setExecutionNotes('');
      await refresh();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to execute');
    } finally {
      setActionLoading(false);
    }
  };

  const download = () => {
    if (!draft) return;

    const blob = new Blob(
      [`# ${draft.title}\n\n${draft.content}`],
      { type: 'text/markdown;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${draft.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.md`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copyDraft = async () => {
    if (!draft) return;

    try {
      await navigator.clipboard.writeText(draft.content);
      setCopied(true);

      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFormError(
        'Clipboard access is unavailable. Download the draft instead.'
      );
    }
  };

  if (loading) return <LoadingState />;

  if (error) {
    return <ErrorState message={error} retry={refresh} />;
  }

  return (
    <div className="workspace-page">
      <PageIntro
        eyebrow="From understanding to possibility"
        title="Put your knowledge to work."
        description="Thoughtful drafts, informed by everything your company has learned."
      />

      {notice && (
        <div className="success-note mb-5" role="status">
          <CheckCircle2 size={15} />
          <span>{notice}</span>
          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss notice"
            className="ml-auto"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="actions-banner">
        <div className="soft-icon !bg-[#e8eedc] !border-[#d9e3c7]">
          <Sparkles size={18} />
        </div>

        <div>
          <h2>A head start with the right context.</h2>
          <p>
            Choose a starting point. Bring your perspective. Make it your own.
          </p>
        </div>

        <span className="pill pill-sage hidden md:flex">
          <ShieldCheck size={11} />
          Drafts for human review
        </span>
      </div>

      {/* Action Types */}
      <div className="action-type-grid">
        {actionTypes.map((item, index) => (
          <button
            type="button"
            className="action-type-card panel"
            key={item.type}
            onClick={() => {
              setSelected(item.type);
              setContext('');
              setFormError('');
            }}
          >
            <div className="flex justify-between items-start">
              <span className="action-type-icon">
                <item.icon size={22} />
              </span>

              <span className="action-number">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>

            <div className="eyebrow text-[#a1af8d] mt-7 !text-[8px]">
              {item.detail}
            </div>

            <h2>{item.label}</h2>
            <p>{item.desc}</p>

            <span className="text-link mt-6">
              Create a draft
              <ArrowUpRight />
            </span>
          </button>
        ))}
      </div>

      {/* Existing Proposals */}
      <section className="panel mt-7">
        <div className="panel-heading">
          <div>
            <h2>Your work in progress</h2>
            <p>Ideas taking shape, ready for your perspective.</p>
          </div>

          <span className="pill text-[#95a581]">
            {proposals?.length ?? 0} drafts
          </span>
        </div>

        {proposals?.length ? (
          proposals.map((proposal) => (
            <button
              type="button"
              className="draft-row"
              key={proposal.id}
              onClick={() => {
                setFormError('');
                setCopied(false);
                setActiveProposal(proposal);
                setExecutionNotes('');

                setDraft({
                  title:
                    proposal.proposedExecution?.title ||
                    proposal.title,
                  content:
                    proposal.proposedExecution?.content ||
                    proposal.description,
                  steps: proposal.proposedExecution?.steps,
                });
              }}
            >
              <FileText size={17} />

              <div className="flex-1 text-left min-w-0">
                <h3>{proposal.title}</h3>

                <p>
                  {actionTypes.find(
                    (item) => item.type === proposal.actionType
                  )?.detail || proposal.actionType.replace(/_/g, ' ')}
                  {' · '}
                  {shortDate(proposal.createdAt)}
                </p>
              </div>

              <span
                className={`pill ${proposal.approvalStatus === 'executed'
                    ? 'pill-sage font-medium'
                    : proposal.approvalStatus === 'approved'
                      ? 'pill-sage'
                      : proposal.approvalStatus === 'rejected'
                        ? 'pill-rose'
                        : 'pill-gold'
                  }`}
              >
                {proposal.approvalStatus === 'pending'
                  ? 'Awaiting review'
                  : proposal.approvalStatus === 'executed'
                    ? '✓ Executed & In Memory'
                    : proposal.approvalStatus}
              </span>

              <ArrowUpRight size={13} />
            </button>
          ))
        ) : (
          <EmptyState
            title="Your next great draft starts here"
            description="Choose a format above to turn organizational knowledge into a useful first draft."
          />
        )}
      </section>

      <WorkspaceFooter />

      {/* Generate Draft Modal */}
      {selected && action && (
        <Modal
          title={action.detail}
          onClose={closeActionModal}
        >
          <div className="soft-icon !w-12 !h-12 mb-5">
            <action.icon size={23} />
          </div>

          <h2 className="display-title text-3xl mb-4">
            {action.label}
          </h2>

          <p className="text-xs leading-7 text-muted-foreground mb-6">
            A little context helps the Brain create something useful.
            Tell it what you need and who it’s for.
          </p>

          <label
            htmlFor="action-context"
            className="field-label"
          >
            What would you like to prepare?
          </label>

          <textarea
            autoFocus
            id="action-context"
            rows={5}
            className="input-field leading-7"
            placeholder={action.placeholder}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            disabled={generating}
          />

          {formError && (
            <div className="error-note mt-4" role="alert">
              {formError}
            </div>
          )}

          <div className="flex justify-between items-center mt-7 gap-4">
            <span className="text-[10px] text-[#9aac87] flex items-center gap-2">
              <ShieldCheck size={13} />
              A draft, ready for your review.
            </span>

            <Button
              disabled={generating || !context.trim()}
              onClick={generate}
            >
              {generating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}

              {generating ? 'Preparing...' : 'Prepare draft'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Draft Preview Modal */}
      {draft && (
        <Modal
          title={draft.title}
          onClose={() => {
            setDraft(null);
            setActiveProposal(null);
            setExecutionNotes('');
            setCopied(false);
            setFormError('');
          }}
        >
          <div className="flex flex-wrap gap-2 mb-6 items-center">
            <span
              className={`pill ${activeProposal?.approvalStatus === 'executed'
                  ? 'pill-sage font-medium'
                  : activeProposal?.approvalStatus === 'approved'
                    ? 'pill-sage'
                    : activeProposal?.approvalStatus === 'rejected'
                      ? 'pill-rose'
                      : 'pill-gold'
                }`}
            >
              {activeProposal?.approvalStatus === 'executed'
                ? '✓ Executed & In Memory'
                : activeProposal?.approvalStatus === 'approved'
                  ? '✓ Approved'
                  : activeProposal?.approvalStatus === 'rejected'
                    ? 'Rejected'
                    : 'Draft · Awaiting Review'}
            </span>
            {activeProposal?.actionType && (
              <span className="pill capitalize text-[#90a279]">
                {activeProposal.actionType.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <div className="answer-prose">
            <ReactMarkdown>{draft.content}</ReactMarkdown>
          </div>

          {draft.steps && draft.steps.length > 0 && (
            <ol className="list-decimal ml-4 mt-4 text-xs text-muted-foreground leading-7">
              {draft.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          )}

          {/* Continuous Learning / Execution Box */}
          {activeProposal && activeProposal.approvalStatus === 'executed' ? (
            <div className="p-4 rounded-xl bg-[#f0f4ea] border border-[#d6e2c8] text-xs leading-6 text-[#4a5f36] my-6">
              <div className="flex items-center gap-2 font-medium mb-1">
                <CheckCircle2 size={16} className="text-[#6c8651]" />
                Preserved in Organizational Memory
              </div>
              <p>
                This action was executed and fed back into GibCom as structured knowledge. Future answers, insights, and handovers automatically ground in this outcome.
              </p>
            </div>
          ) : activeProposal ? (
            <div className="p-4 rounded-xl bg-[#f6f8f2] border border-[#e2ebd7] my-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-[#4f643c] flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  Continuous Learning & Execution Loop
                </div>
                {activeProposal.approvalStatus === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="!text-[11px] !py-1 !h-7"
                  >
                    {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Approve draft
                  </Button>
                )}
              </div>
              <label htmlFor="execution-notes" className="field-label !text-[10px]">
                Execution notes / outcome (optional)
              </label>
              <textarea
                id="execution-notes"
                rows={2}
                className="input-field leading-5 !text-xs !py-2 mb-3"
                placeholder="e.g. Conducted handover with David Kim; ownership transferred in PagerDuty."
                value={executionNotes}
                onChange={(e) => setExecutionNotes(e.target.value)}
                disabled={actionLoading}
              />
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={actionLoading}
                className="w-full !text-xs"
              >
                {actionLoading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Play size={13} />
                )}
                Execute & Commit to Organizational Memory
              </Button>
            </div>
          ) : null}

          <div className="flex gap-3 mt-7 pt-5 border-t">
            <Button
              onClick={download}
              variant="outline"
            >
              <Download size={14} />
              Download draft
            </Button>

            <Button
              variant="ghost"
              onClick={copyDraft}
            >
              {copied ? (
                <Check size={14} />
              ) : (
                <Copy size={14} />
              )}

              {copied ? 'Copied' : 'Copy text'}
            </Button>
          </div>

          {formError && (
            <p className="error-note mt-4" role="alert">
              {formError}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
