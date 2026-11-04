
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
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
      const result = await request<GenerateResponse>('/api/actions', {
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

              <span className="pill pill-gold">
                {proposal.approvalStatus === 'pending'
                  ? 'Awaiting review'
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
            setCopied(false);
            setFormError('');
          }}
        >
          <div className="flex gap-2 mb-6">
            <span className="pill pill-gold">
              Draft · Review before use
            </span>
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
