'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Lightbulb,
  Link2,
  Loader2,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
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

interface Assignee {
  memberId: string;
  memberName: string;
  role?: string;
  note?: string;
  assignedAt: string;
  assignedBy?: string;
}

interface Insight {
  title: string;
  description: string;
  category: string;
  severity: string;
  evidence: string;
  recommendation: string;
  confidence: number;
  relatedEntities: string[];
  assignees?: Assignee[];
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  expertise?: string[];
}

const categories = [
  { key: 'all', label: 'All perspectives' },
  { key: 'dependency', label: 'Connections & dependencies' },
  { key: 'knowledge_gap', label: 'Knowledge gaps' },
  { key: 'risk', label: 'Worth a closer look' },
];

export default function InsightsPage() {
  const [filter, setFilter] = useState('all');
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);

  // Team members state
  const [members, setMembers] = useState<Member[]>([]);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetInsight, setTargetInsight] = useState<Insight | null>(null);

  // New member invite form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteDepartment, setInviteDepartment] = useState('Engineering');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Assign member form
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [assignError, setAssignError] = useState('');

  // Adjustable Right Inspector Panel state
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(440);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  // Fetch insights
  const { data: insightsData, error, loading, refresh } =
    useWorkspaceData<Insight[]>('/api/insights');

  // Load team members
  const loadMembers = useCallback(async () => {
    try {
      const res = await request<Member[]>('/api/members');
      setMembers(res || []);
    } catch {
      // Ignore if unauthenticated
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  // Handle right panel resizing
  const startRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  useEffect(() => {
    if (!isResizingRight) return;

    const onMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const newWidth = Math.min(750, Math.max(340, windowWidth - e.clientX));
      setRightPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizingRight(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizingRight]);

  // Handle member invite by owner
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    setInviting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const res = await request<{ data: Member; message: string }>('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
          department: inviteDepartment,
        }),
      });

      setInviteSuccess(res.message || 'Member successfully added.');
      setInviteName('');
      setInviteEmail('');
      await loadMembers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to add member.');
    } finally {
      setInviting(false);
    }
  };

  // Handle insight assignment
  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInsight || !selectedMemberId) return;

    setAssigning(true);
    setAssignError('');
    setAssignSuccess('');

    try {
      const res = await request<{ message: string; data: { assignees: Assignee[] } }>(
        '/api/insights/assign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            insightTitle: targetInsight.title,
            memberId: selectedMemberId,
            note: assignmentNote.trim(),
          }),
        }
      );

      setAssignSuccess(res.message);
      await refresh();

      if (activeInsight && activeInsight.title === targetInsight.title) {
        setActiveInsight({
          ...activeInsight,
          assignees: res.data.assignees,
        });
      }

      setTimeout(() => {
        setAssignModalOpen(false);
        setAssignSuccess('');
        setSelectedMemberId('');
        setAssignmentNote('');
      }, 1200);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Assignment failed.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} retry={refresh} />;

  const insights = insightsData || [];
  const filtered = insights.filter((i) => filter === 'all' || i.category === filter);

  return (
    <div className="flex flex-1 h-full min-h-0 overflow-hidden">
      {/* Main Insights Content Area */}
      <div className="flex-1 overflow-auto workspace-page">
        <PageIntro
          eyebrow="A different way to see the familiar"
          title="The bigger picture, coming into focus."
          description="Find patterns, manage knowledge risks, and collaborate with your team to protect institutional context."
        >
          {/* Top Actions: Add / Manage Team Members for Insights */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTeamModalOpen(true);
                void loadMembers();
              }}
              className="intro-action flex items-center gap-2"
            >
              <Users size={14} />
              <span>Insight Collaborators ({members.length})</span>
            </Button>
            <Button asChild variant="outline" className="intro-action">
              <Link href="/actions" className="flex items-center gap-1.5">
                <Zap size={13} />
                <span>Actions</span>
              </Link>
            </Button>
          </div>
        </PageIntro>

        {/* Hero banner */}
        <div className="insight-overview">
          <div className="insight-overview-copy">
            <div className="eyebrow text-[#a0b78b] flex items-center gap-2">
              <Sparkles size={13} />
              An informed perspective
            </div>
            <h2>
              Look a little closer.
              <br />
              <em>See a little further.</em>
            </h2>
            <p>
              Meaningful signals from your organizational memory.
              <br />
              Grounded in context. Ready for your team to take action.
            </p>
          </div>
          <div className="insight-count">
            <span>{insights.length}</span>
            <p>perspectives to explore</p>
            <span className="insight-count-line" />
            <small>
              {insights.filter((i) => i.severity === 'high').length} worth prioritizing
            </small>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex justify-between items-center my-6 flex-wrap gap-3">
          <div className="flex gap-1 flex-wrap">
            {categories.map((category) => (
              <button
                className="filter-tab"
                data-active={filter === category.key}
                onClick={() => setFilter(category.key)}
                key={category.key}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-[#869677] flex items-center gap-2">
            <ShieldCheck size={14} />
            <span>Click any card to open the adjustable inspector panel</span>
          </div>
        </div>

        {/* Insight Cards Grid */}
        <div className="insight-grid">
          {filtered.map((insight) => {
            const Icon =
              insight.category === 'dependency'
                ? Link2
                : insight.category === 'knowledge_gap'
                ? Search
                : Lightbulb;

            const isSelected = activeInsight?.title === insight.title;

            return (
              <article
                className={`panel insight-card transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-[#7b985e] shadow-md' : 'hover:border-[#b4c79c]'
                }`}
                key={insight.title}
                onClick={() => setActiveInsight(insight)}
              >
                <div className="flex justify-between items-start">
                  <div
                    className={`soft-icon ${
                      insight.severity === 'high'
                        ? '!bg-[#f6eee8] !text-[#b59b7f] !border-[#eddfd0]'
                        : ''
                    }`}
                  >
                    <Icon size={19} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`pill ${
                        insight.severity === 'high'
                          ? 'pill-rose'
                          : insight.severity === 'medium'
                          ? 'pill-gold'
                          : 'pill-sage'
                      }`}
                    >
                      {insight.severity === 'high'
                        ? 'Priority perspective'
                        : insight.severity === 'medium'
                        ? 'Worth exploring'
                        : 'For your consideration'}
                    </span>
                  </div>
                </div>

                <span className="eyebrow text-[#9cab8b] mt-6 block !text-[8px]">
                  {insight.category.replace(/_/g, ' ')}
                </span>
                <h2>{insight.title}</h2>
                <p className="insight-description">{insight.description}</p>

                {/* Assigned Collaborators Badges */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {insight.assignees && insight.assignees.length > 0 ? (
                    insight.assignees.map((assignee) => (
                      <span key={assignee.memberId} className="assignee-chip" title={assignee.note}>
                        <span className="assignee-avatar">
                          {assignee.memberName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <span>{assignee.memberName}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-[#93a47d] italic">Unassigned</span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetInsight(insight);
                      setAssignModalOpen(true);
                      void loadMembers();
                    }}
                    className="text-[10px] text-[#6d8a54] hover:text-[#3e5628] flex items-center gap-1 ml-auto font-medium py-1 px-2 rounded hover:bg-[#eff4e6]"
                  >
                    <UserPlus size={12} />
                    <span>Assign team member</span>
                  </button>
                </div>

                {/* Evidence meter */}
                <div className="insight-confidence">
                  <span>Evidence confidence</span>
                  <div>
                    <i
                      style={{
                        width: `${Math.max(0, Math.min(100, insight.confidence * 100))}%`,
                      }}
                    />
                  </div>
                  <strong>{Math.round(insight.confidence * 100)}%</strong>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#edf2e4] pt-3">
                  <span className="text-[11px] text-[#718758] flex items-center gap-1 font-medium">
                    Inspect context & details
                    <ArrowUpRight size={13} />
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {insight.relatedEntities.length} entities
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        {!filtered.length && (
          <div className="panel">
            <EmptyState
              title={
                filter === 'all'
                  ? 'Your next insight is taking shape'
                  : 'Nothing here needs your attention'
              }
              description={
                filter === 'all'
                  ? 'As your team adds knowledge, patterns and useful questions will begin to surface.'
                  : 'Explore another perspective or add more context to your organizational memory.'
              }
              href="/teach"
              label="Add a little context"
            />
          </div>
        )}

        <div className="mt-7 flex items-center justify-center gap-2 text-[10px] text-[#a1af90]">
          <ShieldCheck size={13} />
          Signals to consider, supported by evidence. Your judgment completes the picture.
        </div>

        <WorkspaceFooter />
      </div>

      {/* Adjustable Right Inspector Panel */}
      {activeInsight && (
        <aside
          className={`adjustable-right-panel ${isResizingRight ? 'is-resizing' : ''}`}
          style={{ width: isPanelExpanded ? '60%' : rightPanelWidth }}
        >
          {/* Drag Resizer Handle */}
          <div
            className={`right-panel-resizer ${isResizingRight ? 'is-dragging' : ''}`}
            onMouseDown={startRightResize}
            title="Drag to resize panel"
          >
            <div className="panel-drag-affordance" />
          </div>

          {/* Panel Header */}
          <div className="p-6 border-b border-[#e5ebde] flex items-center justify-between bg-[#fbfdf9]">
            <div className="flex items-center gap-2">
              <span className="pill pill-sage capitalize !text-[9px]">
                {activeInsight.category.replace(/_/g, ' ')}
              </span>
              <span
                className={`pill ${
                  activeInsight.severity === 'high' ? 'pill-rose' : 'pill-gold'
                } !text-[9px]`}
              >
                {activeInsight.severity} priority
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsPanelExpanded((v) => !v)}
                className="p-1.5 rounded hover:bg-[#eaf0e0] text-[#7d906e]"
                title={isPanelExpanded ? 'Compact panel' : 'Expand panel'}
              >
                {isPanelExpanded ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
              </button>
              <button
                onClick={() => setActiveInsight(null)}
                className="p-1.5 rounded hover:bg-[#eaf0e0] text-[#7d906e]"
                title="Close inspector"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            <div>
              <span className="eyebrow text-[#8c9e78]">ORGANIZATIONAL PERSPECTIVE</span>
              <h2 className="text-xl font-serif text-[#3e5330] mt-1 leading-snug">
                {activeInsight.title}
              </h2>
              <p className="text-xs text-[#6e7d62] leading-7 mt-3 whitespace-pre-wrap">
                {activeInsight.description}
              </p>
            </div>

            {/* Assigned Collaborators Section */}
            <div className="p-4 rounded-xl border border-[#e1e9d8] bg-[#f8fbf5]">
              <div className="flex items-center justify-between mb-3">
                <span className="eyebrow text-[#7b9165] flex items-center gap-1.5">
                  <Users size={12} />
                  Assigned Team Members
                </span>
                <button
                  onClick={() => {
                    setTargetInsight(activeInsight);
                    setAssignModalOpen(true);
                    void loadMembers();
                  }}
                  className="text-[10px] text-[#69854f] hover:underline font-medium flex items-center gap-1"
                >
                  <UserPlus size={11} />
                  Add member
                </button>
              </div>

              {activeInsight.assignees && activeInsight.assignees.length > 0 ? (
                <div className="space-y-2">
                  {activeInsight.assignees.map((assignee) => (
                    <div
                      key={assignee.memberId}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#e5ecdf] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="assignee-avatar">
                          {assignee.memberName
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        <div>
                          <p className="font-medium text-[#465936]">{assignee.memberName}</p>
                          {assignee.note && (
                            <p className="text-[10px] text-muted-foreground">{assignee.note}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] text-[#93a286]">
                        {shortDate(assignee.assignedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No one is currently assigned to this insight. Involve a colleague to lead the
                  investigation or mitigation.
                </p>
              )}
            </div>

            {/* Supporting Evidence */}
            <div>
              <span className="eyebrow text-[#8c9e78]">Supporting Context</span>
              <div className="mt-2 p-3.5 rounded-lg bg-[#fcfdfa] border border-[#e6ecdf] text-xs text-[#6e7d63] leading-relaxed">
                {activeInsight.evidence}
              </div>
            </div>

            {/* Recommended Next Step */}
            <div>
              <span className="eyebrow text-[#8c9e78]">A Considered Next Step</span>
              <p className="mt-2 text-xs text-[#526642] leading-7 bg-[#f4f8ee] p-3.5 rounded-lg border border-[#e0ebd5]">
                {activeInsight.recommendation}
              </p>
            </div>

            {/* Related Entities */}
            {activeInsight.relatedEntities.length > 0 && (
              <div>
                <span className="eyebrow text-[#8c9e78]">Connected Entities</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {activeInsight.relatedEntities.map((entity) => (
                    <Link
                      key={entity}
                      href={`/explore?q=${encodeURIComponent(entity)}`}
                      className="pill hover:border-[#86a666] text-[#556947] transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8fa976]" />
                      {entity}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Action Launchers */}
            <div className="pt-4 border-t border-[#edf2e5] space-y-2">
              <Button asChild className="w-full justify-center">
                <Link
                  href={`/ask?q=${encodeURIComponent(`Investigate risk: ${activeInsight.title}`)}`}
                  className="flex items-center gap-2"
                >
                  <Search size={14} />
                  <span>Investigate with Ask Brain</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-center">
                <Link href="/actions" className="flex items-center gap-2">
                  <Zap size={14} />
                  <span>Draft Action Proposal</span>
                </Link>
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal 1: Manage Team Members & Collaborators */}
      {teamModalOpen && (
        <Modal
          title="Organization Members & Insight Collaborators"
          onClose={() => setTeamModalOpen(false)}
        >
          <div className="p-1 space-y-6">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every member of your organization can access the shared Brain according to their role.
              Owners and Administrators can invite colleagues and assign them to review or lead
              organizational insights.
            </p>

            {/* Invite Form for Owner/Admin */}
            <form
              onSubmit={handleInviteMember}
              className="p-4 rounded-xl border border-[#dce6d2] bg-[#f9fcf5] space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-[#495f36]">
                <UserPlus size={14} />
                <span>Add Member to Organization</span>
              </div>

              {inviteSuccess && (
                <div className="success-note !py-2 !text-xs">
                  <CheckCircle2 size={14} />
                  {inviteSuccess}
                </div>
              )}
              {inviteError && <div className="error-note !py-2 !text-xs">{inviteError}</div>}

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label !text-[10px]" htmlFor="invite-name">
                    Full Name
                  </label>
                  <input
                    id="invite-name"
                    required
                    className="input-field !py-2 !text-xs"
                    placeholder="e.g. David Kim"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label !text-[10px]" htmlFor="invite-email">
                    Work Email
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    className="input-field !py-2 !text-xs"
                    placeholder="david@acmecorp.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label !text-[10px]" htmlFor="invite-role">
                    Role
                  </label>
                  <select
                    id="invite-role"
                    className="select-control w-full !text-xs"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="field-label !text-[10px]" htmlFor="invite-dept">
                    Department
                  </label>
                  <input
                    id="invite-dept"
                    className="input-field !py-2 !text-xs"
                    placeholder="e.g. Engineering, Sales"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" disabled={inviting}>
                  {inviting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <UserPlus size={13} />
                  )}
                  Add to Organization
                </Button>
              </div>
            </form>

            {/* Current Members List */}
            <div>
              <span className="eyebrow text-[#8da075] mb-3 block">
                Active Organization Members ({members.length})
              </span>
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {members.map((m) => (
                  <div key={m.id} className="member-row">
                    <span className="assignee-avatar !w-7 !h-7 !text-xs">
                      {m.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#465a36] truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <span className="pill pill-sage capitalize !text-[9px]">{m.role}</span>
                    <span className="text-[10px] text-[#869776]">{m.department}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal 2: Assign Specific Member to Insight */}
      {assignModalOpen && targetInsight && (
        <Modal
          title={`Assign Colleague to Insight`}
          onClose={() => {
            setAssignModalOpen(false);
            setAssignError('');
            setAssignSuccess('');
          }}
        >
          <form onSubmit={handleAssignMember} className="space-y-4">
            <div>
              <span className="eyebrow text-[#8a9e76]">INSIGHT TARGET</span>
              <h3 className="font-serif text-base text-[#405432] mt-1">{targetInsight.title}</h3>
            </div>

            {assignSuccess && (
              <div className="success-note !py-2 !text-xs">
                <CheckCircle2 size={14} />
                {assignSuccess}
              </div>
            )}
            {assignError && <div className="error-note !py-2 !text-xs">{assignError}</div>}

            <div>
              <label className="field-label" htmlFor="select-colleague">
                Choose Colleague from Organization
              </label>
              <select
                id="select-colleague"
                required
                className="select-control w-full"
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
              >
                <option value="">Select a member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role}) — {m.department || 'General'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="assign-note">
                Action Note or Instruction <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <textarea
                id="assign-note"
                rows={3}
                className="input-field !text-xs leading-relaxed"
                placeholder="e.g. Lead knowledge transfer sprint, draft runbook, and update documentation."
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAssignModalOpen(false)}
                disabled={assigning}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={assigning || !selectedMemberId}>
                {assigning ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <UserCheck size={13} />
                )}
                Confirm Assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
