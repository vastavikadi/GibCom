'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Cable,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  FolderOpen,
  GitBranch,
  HelpCircle,
  Key,
  Layers,
  Loader2,
  LockKeyhole,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  Share2,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';

import {
  SlackIcon,
  GitHubIcon,
  JiraIcon,
  ConfluenceIcon,
  GoogleDriveIcon,
} from '@/components/connector-icons';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  PageIntro,
  SourcePreview,
  WorkspaceFooter,
} from '@/components/workspace';
import { request, shortDate, useWorkspaceData } from '@/lib/client';

interface Source {
  id: string;
  title: string;
  sourceType: string;
  mimeType: string;
  fileSize: number;
  status: string;
  createdAt: string;
  accessPolicy: string;
  extractionMode?: string;
}

interface Memory {
  id: string;
  title: string;
  description: string;
  memoryType: string;
  verificationStatus: string;
  confidence: number;
  createdAt: string;
  evidence?: {
    sourceId: string;
    excerpt: string;
    source?: { title: string };
  }[];
}

interface Workspace {
  organization?: {
    name: string;
    description?: string;
  };
  role?: string;
  ai?: {
    configured: boolean;
    model: string | null;
    mode: string;
    embeddings: string;
  };
}

interface AuditLogItem {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string | null;
    name: string;
    email: string;
  };
}

interface ContradictionItem {
  id: string;
  topic: string;
  severity: 'high' | 'medium' | 'low';
  memoryA: {
    id: string;
    title: string;
    description: string;
    memoryType: string;
    confidence: number | null;
    verificationStatus: string | null;
    createdAt: string;
  };
  memoryB: {
    id: string;
    title: string;
    description: string;
    memoryType: string;
    confidence: number | null;
    verificationStatus: string | null;
    createdAt: string;
  };
  conflictExplanation: string;
  resolutionRecommendation: string;
}

export default function AdminPage() {
  const sources = useWorkspaceData<Source[]>('/api/sources');
  const memories = useWorkspaceData<Memory[]>('/api/memories');
  const workspace = useWorkspaceData<Workspace>('/api/dashboard');
  const connectorsConfig = useWorkspaceData<Record<string, any>>('/api/connectors');
  const auditLogs = useWorkspaceData<AuditLogItem[]>('/api/audit-logs');
  const contradictions = useWorkspaceData<ContradictionItem[]>('/api/contradictions');

  const [tab, setTab] = useState<'sources' | 'connectors' | 'memories' | 'audit' | 'settings'>('sources');
  const [query, setQuery] = useState('');
  const [memoryFilter, setMemoryFilter] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);
  const [resolvingContra, setResolvingContra] = useState<string | null>(null);
  const [policy, setPolicy] = useState('organization');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [resolutionReason, setResolutionReason] = useState('');
  const [syncingConnector, setSyncingConnector] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real Connector Setup State
  const [activeConnectorModal, setActiveConnectorModal] = useState<string | null>(null);
  const [testingConnector, setTestingConnector] = useState(false);
  const [savingConnector, setSavingConnector] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [slackForm, setSlackForm] = useState({
    botToken: '',
    channelId: '',
    channelName: 'general',
  });
  const [githubForm, setGithubForm] = useState({
    token: '',
    repo: 'facebook/react',
    mode: 'pulls',
  });
  const [jiraForm, setJiraForm] = useState({
    domain: '',
    email: '',
    apiToken: '',
    jql: 'ORDER BY updated DESC',
  });
  const [confluenceForm, setConfluenceForm] = useState({
    domain: '',
    email: '',
    apiToken: '',
    spaceKey: '',
  });
  const [googleDriveForm, setGoogleDriveForm] = useState({
    apiKeyOrToken: '',
    folderId: 'root',
  });

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (requested && ['sources', 'connectors', 'memories', 'audit', 'settings'].includes(requested)) {
      setTab(requested as any);
    }
  }, []);

  const resolveContradiction = async (
    targetMemoryId: string,
    action: 'superseded' | 'disputed',
    reason: string
  ) => {
    setResolvingContra(targetMemoryId);
    setError('');
    try {
      await request(`/api/memories/${targetMemoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationStatus: action,
          resolutionReason: reason,
        }),
      });
      setNotice(`Discrepancy resolved: Memory marked as ${action}.`);
      await memories.refresh();
      await contradictions.refresh();
      await auditLogs.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve contradiction');
    } finally {
      setResolvingContra(null);
    }
  };

  useEffect(() => {
    if (workspace.data?.organization) setName(workspace.data.organization.name);
  }, [workspace.data]);

  useEffect(() => {
    if (!sources.data?.some((s) => ['pending', 'processing'].includes(s.status))) return;
    const timer = setInterval(() => {
      void sources.refresh();
      void memories.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [sources.data, sources.refresh, memories.refresh]);

  const openConnectorModal = (type: string) => {
    setActiveConnectorModal(type);
    setTestResult(null);
    setError('');

    // Pre-populate if saved (keep secret fields blank so user can type new or leave blank to keep saved)
    const saved = connectorsConfig.data?.[type];
    if (type === 'slack') {
      setSlackForm({
        botToken: '',
        channelId: saved?.channelId || '',
        channelName: saved?.channelName || 'general',
      });
    } else if (type === 'github') {
      setGithubForm({
        token: '',
        repo: saved?.repo || 'facebook/react',
        mode: saved?.mode || 'pulls',
      });
    } else if (type === 'jira') {
      setJiraForm({
        domain: saved?.domain || '',
        email: saved?.email || '',
        apiToken: '',
        jql: saved?.jql || 'ORDER BY updated DESC',
      });
    } else if (type === 'confluence') {
      setConfluenceForm({
        domain: saved?.domain || '',
        email: saved?.email || '',
        apiToken: '',
        spaceKey: saved?.spaceKey || '',
      });
    } else if (type === 'google_drive') {
      setGoogleDriveForm({
        apiKeyOrToken: '',
        folderId: saved?.folderId || 'root',
      });
    }
  };

  const testConnection = async () => {
    if (!activeConnectorModal) return;
    setTestingConnector(true);
    setTestResult(null);

    let config: any = {};
    if (activeConnectorModal === 'slack') config = slackForm;
    if (activeConnectorModal === 'github') config = githubForm;
    if (activeConnectorModal === 'jira') config = jiraForm;
    if (activeConnectorModal === 'confluence') config = confluenceForm;
    if (activeConnectorModal === 'google_drive') config = googleDriveForm;

    try {
      const res = await request<{
        success: boolean;
        message?: string;
        error?: string;
      }>('/api/connectors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeConnectorModal, config }),
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || 'Connection verified successfully!',
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Connection failed',
        });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setTestingConnector(false);
    }
  };

  const saveConnectorConfig = async () => {
    if (!activeConnectorModal) return;
    setSavingConnector(true);

    let config: any = {};
    if (activeConnectorModal === 'slack') config = slackForm;
    if (activeConnectorModal === 'github') config = githubForm;
    if (activeConnectorModal === 'jira') config = jiraForm;
    if (activeConnectorModal === 'confluence') config = confluenceForm;
    if (activeConnectorModal === 'google_drive') config = googleDriveForm;

    try {
      await request('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeConnectorModal, config }),
      });

      setNotice(
        `${activeConnectorModal.toUpperCase()} credentials saved. Ready to sync live streams.`
      );
      await connectorsConfig.refresh();
      setActiveConnectorModal(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSavingConnector(false);
    }
  };

  const syncLiveConnector = async (type: string) => {
    setSyncingConnector(type);
    setError('');
    setNotice('');
    try {
      const res = await request<{
        data: { title: string; chunksCount: number; memoriesCreated: number; itemCount?: number };
        message: string;
      }>('/api/connectors/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      setNotice(res.message || `Live ${type.toUpperCase()} data synchronized and indexed.`);
      await sources.refresh();
      await memories.refresh();
      await connectorsConfig.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Live sync failed';
      if (msg.includes('missing') || msg.includes('required') || msg.includes('credentials')) {
        setError(`${msg} Click "Configure" to provide your API keys.`);
      } else {
        setError(msg);
      }
    } finally {
      setSyncingConnector(null);
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError('');
    setNotice('');
    const form = new FormData();
    form.append('file', file);
    form.append('accessPolicy', policy);
    try {
      const result = await request<{ duplicate?: boolean }>('/api/sources/upload', {
        method: 'POST',
        body: form,
      });
      setNotice(
        result.duplicate
          ? 'This document is already in your library.'
          : 'Document received. Its learning progress will appear below.'
      );
      await sources.refresh();
      await memories.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleReviewStatus = async (
    newStatus: 'verified' | 'disputed' | 'superseded',
    actionLabel: string
  ) => {
    if (!selected) return;
    setReviewing(true);
    setError('');
    try {
      await request(`/api/memories/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationStatus: newStatus,
          resolutionReason: resolutionReason.trim() || `Marked as ${newStatus} by manager review`,
        }),
      });
      setSelected(null);
      setResolutionReason('');
      setNotice(`Memory marked as ${actionLabel}. Organizational trust score updated.`);
      await memories.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Review action could not be saved.');
    } finally {
      setReviewing(false);
    }
  };

  const saveName = async () => {
    setSaving(true);
    setError('');
    try {
      await request('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setNotice('Workspace name updated.');
      await workspace.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const exportMemories = () => {
    const blob = new Blob([JSON.stringify(memories.data || [], null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organizational-memories.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sources.loading || memories.loading) return <LoadingState />;
  if (sources.error || memories.error)
    return (
      <ErrorState
        message={sources.error || memories.error}
        retry={() => {
          void sources.refresh();
          void memories.refresh();
        }}
      />
    );

  const filteredSources = (sources.data || []).filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase())
  );

  const filteredMemories = (memories.data || [])
    .filter((m) =>
      memoryFilter === 'all' ? true : m.verificationStatus === memoryFilter
    )
    .filter((m) => `${m.title} ${m.memoryType}`.toLowerCase().includes(query.toLowerCase()));

  const filteredAuditLogs = (auditLogs.data || [])
    .filter((log) => (auditFilter === 'all' ? true : log.action === auditFilter))
    .filter((log) =>
      `${log.action} ${log.resourceType || ''} ${log.user.name} ${log.user.email} ${JSON.stringify(log.details || {})}`
        .toLowerCase()
        .includes(query.toLowerCase())
    );

  const connectors = [
    {
      id: 'slack',
      name: 'Slack',
      typeLabel: 'Team Chat & Channels',
      description:
        'Continuous ingestion of architectural discussions, incident post-mortems, and customer escalations directly from live channels.',
      icon: SlackIcon,
      authHint: 'Bot User OAuth Token (xoxb-...)',
    },
    {
      id: 'github',
      name: 'GitHub',
      typeLabel: 'Code, PRs & ADRs',
      description:
        'Continuous ingestion of pull requests, architectural decision records, design discussions, and code review comments.',
      icon: GitHubIcon,
      authHint: 'Personal Access Token (ghp_...)',
    },
    {
      id: 'jira',
      name: 'Jira Software',
      typeLabel: 'Project & Sprint Tracking',
      description:
        'Continuous ingestion of sprint retrospectives, blocker logs, epic requirements, and customer onboarding issues via Atlassian REST API.',
      icon: JiraIcon,
      authHint: 'Atlassian Cloud API Token & Email',
    },
    {
      id: 'confluence',
      name: 'Confluence',
      typeLabel: 'Wiki & Institutional Docs',
      description:
        'Ingest team wiki spaces, technical specs, and standard operating procedures directly from Atlassian Confluence.',
      icon: ConfluenceIcon,
      authHint: 'Atlassian Cloud API Token',
    },
    {
      id: 'google_drive',
      name: 'Google Drive',
      typeLabel: 'Shared Documents & Sheets',
      description:
        'Ingest team folders, meeting notes, customer contracts, and quarterly business reviews from Google Workspace.',
      icon: GoogleDriveIcon,
      authHint: 'Google Service Account / OAuth',
    },
  ];

  return (
    <div className="workspace-page">
      <PageIntro
        eyebrow="A considered foundation"
        title="Care for your collective knowledge."
        description="Live data connectors, original sources, verified memories, and organizational governance."
      >
        <Button
          variant="outline"
          className="intro-action"
          onClick={() => {
            void sources.refresh();
            void memories.refresh();
            void connectorsConfig.refresh();
            void auditLogs.refresh();
            void contradictions.refresh();
          }}
        >
          <RefreshCw size={13} />
          Refresh workspace
        </Button>
      </PageIntro>

      <div className="admin-tabs">
        <div className="flex gap-1 overflow-auto">
          {[
            { key: 'sources', label: 'Source library', icon: FolderOpen, count: sources.data?.length },
            { key: 'connectors', label: 'Data connectors', icon: Cable, count: connectors.length },
            {
              key: 'memories',
              label: 'Memory review & discrepancies',
              icon: ShieldCheck,
              count: memories.data?.length,
            },
            { key: 'audit', label: 'Audit trail', icon: Clock3, count: auditLogs.data?.length },
            { key: 'settings', label: 'Workspace settings', icon: Settings2 },
          ].map((item) => (
            <button
              className="admin-tab"
              data-active={tab === item.key}
              key={item.key}
              onClick={() => {
                setTab(item.key as any);
                setQuery('');
                setNotice('');
                setError('');
              }}
            >
              <item.icon size={14} />
              {item.label}
              {item.count !== undefined && <span>{item.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="success-note mb-5" role="status">
          <CheckCircle2 size={15} />
          <span>{notice}</span>
          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
            className="ml-auto"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {error && !selected && (
        <div className="error-note mb-5" role="alert">
          {error}
        </div>
      )}

      {/* Tab 1: Source Library */}
      {tab === 'sources' ? (
        <>
          <div className="upload-layout">
            <section
              className={`upload-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file && !uploading) void upload(file);
              }}
            >
              <div className="upload-zone-icon">
                {uploading ? (
                  <Loader2 size={23} className="animate-spin" />
                ) : (
                  <UploadCloud size={25} />
                )}
              </div>
              <div>
                <h2>
                  {uploading
                    ? 'Making room for new knowledge…'
                    : 'Every document has a story to tell.'}
                </h2>
                <p>Drop a file here, or choose one from your computer.</p>
                <span>PDF, DOCX, TXT, Markdown, CSV</span>
              </div>
              <input
                ref={inputRef}
                type="file"
                id="source-file"
                accept=".pdf,.docx,.txt,.md,.csv"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                }}
              />
              <Button
                variant="outline"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="mt-4 md:mt-0"
              >
                <UploadCloud size={13} />
                Choose a file
              </Button>
            </section>

            <aside className="upload-privacy">
              <LockKeyhole size={17} />
              <h3>A place for the right knowledge.</h3>
              <p>Choose who can access the source and what the Brain learns from it.</p>
              <label className="sr-only" htmlFor="source-policy">
                Source visibility
              </label>
              <select
                id="source-policy"
                className="select-control w-full !text-[10px]"
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
              >
                <option value="organization">Everyone in the organization</option>
                <option value="private">Only you</option>
              </select>
            </aside>
          </div>

          <section className="panel overflow-hidden">
            <div className="panel-heading">
              <div>
                <h2>The source of your understanding</h2>
                <p>Your company’s original context, thoughtfully preserved.</p>
              </div>
              <div className="relative max-w-[180px]">
                <Search size={12} className="absolute left-3 top-2.5 text-[#a1ae91]" />
                <input
                  aria-label="Search sources"
                  className="input-field !pl-8 !py-2 !text-[10px]"
                  placeholder="Find a source…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredSources.length ? (
              <div className="source-table">
                <div className="source-table-head">
                  <span>DOCUMENT</span>
                  <span>VISIBILITY</span>
                  <span>LEARNING STATUS</span>
                  <span>ADDED</span>
                  <span />
                </div>
                {filteredSources.map((source) => (
                  <button
                    className="source-table-row"
                    key={source.id}
                    onClick={() => setSourceId(source.id)}
                  >
                    <div className="flex gap-12px items-center min-w-0">
                      <div className="source-file-icon">
                        <FileText size={18} />
                        <small>
                          {source.title.split('.').length > 1
                            ? source.title.split('.').pop()?.slice(0, 4).toUpperCase()
                            : source.sourceType.toUpperCase().slice(0, 4)}
                        </small>
                      </div>
                      <div className="min-w-0 text-left">
                        <h3>{source.title}</h3>
                        <p>
                          {source.fileSize
                            ? `${(source.fileSize / 1024).toFixed(1)} KB`
                            : 'Organizational knowledge'}{' '}
                          · {source.sourceType}
                        </p>
                      </div>
                    </div>
                    <span className="source-visibility">
                      <LockKeyhole size={10} />
                      {source.accessPolicy === 'private' ? 'Only you' : 'Workspace'}
                    </span>
                    <span
                      className={`source-status ${
                        source.status === 'completed'
                          ? 'complete'
                          : source.status === 'failed'
                          ? 'failed'
                          : ''
                      }`}
                    >
                      <i />
                      {source.status === 'completed'
                        ? 'Learned'
                        : source.status === 'failed'
                        ? 'Needs attention'
                        : source.status === 'pending'
                        ? 'Queued'
                        : 'Learning'}
                    </span>
                    <span className="source-added">{shortDate(source.createdAt)}</span>
                    <ArrowUpRight size={13} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title={query ? 'No matching sources' : 'A library waiting to grow'}
                description={
                  query
                    ? 'Try another document name.'
                    : 'Upload your first document to give the Brain a new piece of your company’s story.'
                }
              />
            )}
          </section>
        </>
      ) : tab === 'connectors' ? (
        /* Tab 2: Production Real Data Connectors Hub */
        <div className="space-y-6">
          <div className="actions-banner">
            <div className="soft-icon !bg-[#e8eedc] !border-[#d9e3c7]">
              <Cable size={18} />
            </div>
            <div>
              <h2>Production Activity Connectors</h2>
              <p>
                Connect real third-party work streams. The Brain reaches live Slack channels, GitHub
                repositories, and Jira Cloud projects via official APIs to ingest institutional context.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {connectors.map((c) => {
              const isConfigured = Boolean(connectorsConfig.data?.[c.id]);
              const config = connectorsConfig.data?.[c.id] || {};

              return (
                <div key={c.id} className="panel p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 rounded-xl bg-white border border-[#e1e9d7] shadow-sm flex items-center justify-center">
                        <c.icon size={26} />
                      </div>
                      <span
                        className={`pill !text-[10px] ${
                          isConfigured ? 'pill-sage font-medium' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {isConfigured ? '✓ Connected' : 'Not configured'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-medium text-[#2d3a1f]">{c.name}</h3>
                      <span className="text-[10px] text-muted-foreground">{c.typeLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-6 mt-2 mb-4">
                      {c.description}
                    </p>

                    {isConfigured && (
                      <div className="p-3 rounded-lg bg-[#f6f8f2] border border-[#e4ebd9] text-[11px] space-y-1 mb-4">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Target:</span>
                          <strong className="text-[#3b4b2a]">
                            {config.repo || config.channelName || config.domain || 'Active'}
                          </strong>
                        </div>
                        {config.lastSync && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Last live sync:</span>
                            <span>{shortDate(config.lastSync)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openConnectorModal(c.id)}
                      className="!text-xs"
                    >
                      <Key size={12} />
                      {isConfigured ? 'Update keys' : 'Configure credentials'}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => syncLiveConnector(c.id)}
                      disabled={syncingConnector !== null}
                      className="!text-xs"
                    >
                      {syncingConnector === c.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}
                      {syncingConnector === c.id ? 'Syncing live API…' : 'Sync Live Data'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : tab === 'memories' ? (
        /* Tab 3: Memory Review & Dispute Handling */
        <div className="space-y-6">
          {/* Contradiction & Discrepancies Alerts */}
          {contradictions.data && contradictions.data.length > 0 && (
            <div className="p-5 rounded-xl border border-[#e8d8ce] bg-[#fbf5f2]">
              <div className="flex items-center gap-2 mb-2 text-[#9b4e33]">
                <AlertTriangle size={18} />
                <h3 className="text-sm font-medium">
                  {contradictions.data.length} Knowledge Contradiction{contradictions.data.length > 1 ? 's' : ''} Detected
                </h3>
                <span className="pill pill-rose ml-auto !text-[10px]">Action Required</span>
              </div>
              <p className="text-xs text-[#845c4f] mb-4">
                The Brain’s continuous reasoning engine identified conflicting statements between active memories. Resolve discrepancies to maintain verified institutional truth.
              </p>

              <div className="space-y-3">
                {contradictions.data.map((c) => (
                  <div key={c.id} className="p-4 rounded-lg bg-white border border-[#eedfd6] text-xs space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-[#7d3f2b]">{c.topic}</span>
                      <span className="pill pill-rose uppercase !text-[9px]">{c.severity} severity</span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded bg-[#f9faf7] border border-[#e4ebd9] space-y-1">
                        <strong className="text-[#3b4b2a] block">{c.memoryA.title}</strong>
                        <p className="text-muted-foreground">{c.memoryA.description}</p>
                        <span className="text-[10px] text-muted-foreground block pt-1">
                          Status: {c.memoryA.verificationStatus} · {shortDate(c.memoryA.createdAt)}
                        </span>
                        <div className="pt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="!text-[10px] !py-1 !h-auto"
                            disabled={resolvingContra !== null}
                            onClick={() =>
                              resolveContradiction(
                                c.memoryA.id,
                                'superseded',
                                `Superseded due to conflict with "${c.memoryB.title}"`
                              )
                            }
                          >
                            Supersede Memory A
                          </Button>
                        </div>
                      </div>

                      <div className="p-3 rounded bg-[#f9faf7] border border-[#e4ebd9] space-y-1">
                        <strong className="text-[#3b4b2a] block">{c.memoryB.title}</strong>
                        <p className="text-muted-foreground">{c.memoryB.description}</p>
                        <span className="text-[10px] text-muted-foreground block pt-1">
                          Status: {c.memoryB.verificationStatus} · {shortDate(c.memoryB.createdAt)}
                        </span>
                        <div className="pt-2 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="!text-[10px] !py-1 !h-auto"
                            disabled={resolvingContra !== null}
                            onClick={() =>
                              resolveContradiction(
                                c.memoryB.id,
                                'superseded',
                                `Superseded due to conflict with "${c.memoryA.title}"`
                              )
                            }
                          >
                            Supersede Memory B
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-[#fdfaf8] border border-[#f3eae4] text-[11px] text-[#7d4838]">
                      <strong>Conflict rationale:</strong> {c.conflictExplanation}
                      <br />
                      <strong className="text-[#4b6037]">Recommendation:</strong> {c.resolutionRecommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <section className="panel overflow-hidden">
            <div className="panel-heading">
              <div>
                <h2>Trust, Verification & Human Governance</h2>
                <p>Review, verify, dispute, or supersede organizational memories.</p>
              </div>
              <Button variant="outline" size="sm" onClick={exportMemories}>
                <Download size={12} />
                <span className="hidden sm:inline">Export JSON</span>
              </Button>
            </div>

            <div className="px-6 pb-4 flex flex-wrap gap-2 items-center justify-between border-b">
              <div className="flex gap-1.5">
                {['all', 'unverified', 'verified', 'disputed', 'superseded'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setMemoryFilter(status)}
                    className={`text-[10px] px-3 py-1 rounded-full border transition-all capitalize ${
                      memoryFilter === status
                        ? 'bg-[#5a7145] text-white border-[#5a7145]'
                        : 'bg-white border-[#d2dec5] text-[#556943] hover:border-[#a4bc92]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="relative max-w-[220px]">
                <Search size={12} className="absolute left-3 top-2.5 text-[#a1ae91]" />
                <input
                  className="input-field !pl-8 !py-1.5 !text-xs"
                  placeholder="Filter memories…"
                  aria-label="Filter memories"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {filteredMemories.length ? (
              filteredMemories.map((memory) => (
                <button
                  className="memory-review-row"
                  key={memory.id}
                  onClick={() => {
                    setSelected(memory);
                    setResolutionReason('');
                    setError('');
                  }}
                >
                  <div className="soft-icon">
                    <Database size={15} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h3>{memory.title}</h3>
                    <p>{memory.description}</p>
                    <small>
                      {memory.memoryType} · {shortDate(memory.createdAt)} · Confidence:{' '}
                      {(memory.confidence * 100).toFixed(0)}%
                    </small>
                  </div>
                  <span
                    className={`pill ${
                      memory.verificationStatus === 'verified'
                        ? 'pill-sage'
                        : memory.verificationStatus === 'disputed'
                        ? 'pill-rose'
                        : memory.verificationStatus === 'superseded'
                        ? 'pill-slate text-gray-500'
                        : 'pill-gold'
                    }`}
                  >
                    {memory.verificationStatus}
                  </span>
                  <ChevronRight size={13} />
                </button>
              ))
            ) : (
              <EmptyState
                title="No memories match your filter"
                description="Memories appear here for human governance as sources are ingested or taught."
                href="/teach"
                label="Teach Brain"
              />
            )}
          </section>
        </div>
      ) : tab === 'audit' ? (
        /* Tab 4: Platform Security & Audit Trail */
        <section className="panel overflow-hidden">
          <div className="panel-heading">
            <div>
              <h2>Platform Security & Audit Trail</h2>
              <p>Tamper-evident log of knowledge ingestion, live connector syncs, reviews, and authorized workflows.</p>
            </div>
            <div className="relative max-w-[220px]">
              <Search size={12} className="absolute left-3 top-2.5 text-[#a1ae91]" />
              <input
                className="input-field !pl-8 !py-1.5 !text-xs"
                placeholder="Filter audit events…"
                aria-label="Filter audit events"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="px-6 pb-4 flex flex-wrap gap-2 items-center border-b">
            {['all', 'source_uploaded', 'live_connector_synced', 'connector_configured', 'memory_reviewed', 'action_executed'].map((act) => (
              <button
                key={act}
                onClick={() => setAuditFilter(act)}
                className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
                  auditFilter === act
                    ? 'bg-[#5a7145] text-white border-[#5a7145]'
                    : 'bg-white border-[#d2dec5] text-[#556943] hover:border-[#a4bc92]'
                }`}
              >
                {act.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {filteredAuditLogs.length ? (
            <div className="divide-y divide-[#edf3e4]">
              {filteredAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-[#fafbf7] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-[#f0f4ea] text-[#637b4e] shrink-0 mt-0.5">
                      <Clock3 size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#2d3a1f]">
                          {log.action.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="pill pill-sage !text-[9px]">
                          {log.resourceType || 'system'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {shortDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        By {log.user.name} ({log.user.email})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {log.details && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="!text-[10px] !py-1 !h-auto"
                        onClick={() => setSelectedAuditLog(log)}
                      >
                        Inspect Payload
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No audit entries match"
              description="System actions, connector syncs, and human governance decisions will appear in this audit log."
            />
          )}
        </section>
      ) : (
        /* Tab 4: Workspace Settings */
        <div className="settings-grid">
          <section className="panel p-6 md:p-8">
            <div className="soft-icon mb-5">
              <FolderOpen size={18} />
            </div>
            <h2 className="text-base font-medium">Your organizational home.</h2>
            <p className="text-xs text-muted-foreground leading-7 mt-2 mb-6">
              The shared space where your company’s knowledge comes together.
            </p>
            <label htmlFor="organization-name" className="field-label">
              Workspace name
            </label>
            <input
              id="organization-name"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!['owner', 'admin'].includes(workspace.data?.role || '')}
            />
            <div className="flex justify-between items-center gap-3 mt-5">
              <span className="pill capitalize text-[#90a37b]">
                {workspace.data?.role || 'Member'}
              </span>
              {['owner', 'admin'].includes(workspace.data?.role || '') && (
                <Button onClick={saveName} disabled={saving || !name.trim()}>
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  Save changes
                </Button>
              )}
            </div>
          </section>

          <section className="panel p-6 md:p-8">
            <div className="soft-icon mb-5">
              <ShieldCheck size={18} />
            </div>
            <h2 className="text-base font-medium">Intelligence, with transparency.</h2>
            <p className="text-xs text-muted-foreground leading-7 mt-2 mb-6">
              A clear view of the intelligence behind your workspace.
            </p>
            <div className="setting-value">
              <span>Reasoning mode</span>
              <strong>{workspace.data?.ai?.configured ? 'Meta model' : 'Evidence view'}</strong>
            </div>
            <div className="setting-value">
              <span>Model</span>
              <strong>{workspace.data?.ai?.model || 'Not configured'}</strong>
            </div>
            <div className="setting-value">
              <span>Semantic retrieval</span>
              <strong>
                {workspace.data?.ai?.embeddings === 'configured'
                  ? 'Configured (pgvector 1536-d)'
                  : 'Not configured'}
              </strong>
            </div>
            <p className="text-[10px] text-muted-foreground leading-6 mt-5">
              {workspace.data?.ai?.configured
                ? 'Model settings and credentials are managed securely on the server.'
                : 'You can explore original sources and connected memories. AI reasoning becomes available when your administrator configures a supported model.'}
            </p>
          </section>

          <section className="panel p-6 md:p-8 sm:col-span-2">
            <div className="flex items-start gap-4">
              <div className="soft-icon">
                <LockKeyhole size={18} />
              </div>
              <div>
                <h2 className="text-sm font-medium">Your knowledge deserves a considered home.</h2>
                <p className="text-xs text-muted-foreground leading-7 mt-2 max-w-2xl">
                  Original sources retain their access permissions. Contributions retain their
                  authorship. Important knowledge can be reviewed, corrected, disputed, and understood
                  in the context of its history.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      <WorkspaceFooter />

      {sourceId && <SourcePreview id={sourceId} onClose={() => setSourceId(null)} />}

      {/* Real Connector Setup Modal */}
      {activeConnectorModal && (
        <Modal
          title={`Configure ${activeConnectorModal.toUpperCase()} Live Connector`}
          onClose={() => setActiveConnectorModal(null)}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-white border border-[#e1e9d7] shadow-sm">
              {activeConnectorModal === 'slack' && <SlackIcon size={24} />}
              {activeConnectorModal === 'github' && <GitHubIcon size={24} />}
              {activeConnectorModal === 'jira' && <JiraIcon size={24} />}
              {activeConnectorModal === 'confluence' && <ConfluenceIcon size={24} />}
              {activeConnectorModal === 'google_drive' && <GoogleDriveIcon size={24} />}
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#2d3a1f]">
                {activeConnectorModal === 'slack' && 'Slack Web API Integration'}
                {activeConnectorModal === 'github' && 'GitHub REST API v3 Integration'}
                {activeConnectorModal === 'jira' && 'Atlassian Jira Cloud Integration'}
                {activeConnectorModal === 'confluence' && 'Atlassian Confluence Integration'}
                {activeConnectorModal === 'google_drive' && 'Google Drive Integration'}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Live official API credentials for real continuous organizational learning.
              </p>
            </div>
          </div>

          {/* Slack Config Form */}
          {activeConnectorModal === 'slack' && (
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="slack-bot-token">
                  Bot User OAuth Token <span className="text-rose-600">*</span>
                </label>
                <input
                  id="slack-bot-token"
                  type="password"
                  className="input-field"
                  placeholder={
                    connectorsConfig.data?.slack?.isConfigured
                      ? '•••••••••••• (configured - enter new token to replace)'
                      : 'xoxb-your-token-here'
                  }
                  value={slackForm.botToken}
                  onChange={(e) => setSlackForm({ ...slackForm, botToken: e.target.value })}
                />
                <span className="text-[10px] text-muted-foreground block mt-1">
                  Requires <code>channels:history</code>, <code>channels:read</code>, and{' '}
                  <code>users:read</code> scopes from your Slack App.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="slack-channel-name">
                    Default Channel Name
                  </label>
                  <input
                    id="slack-channel-name"
                    type="text"
                    className="input-field"
                    placeholder="general"
                    value={slackForm.channelName}
                    onChange={(e) => setSlackForm({ ...slackForm, channelName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="slack-channel-id">
                    Channel ID <span className="font-normal text-muted-foreground">(Optional)</span>
                  </label>
                  <input
                    id="slack-channel-id"
                    type="text"
                    className="input-field"
                    placeholder="e.g. C0123456789"
                    value={slackForm.channelId}
                    onChange={(e) => setSlackForm({ ...slackForm, channelId: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* GitHub Config Form */}
          {activeConnectorModal === 'github' && (
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="github-token">
                  GitHub Personal Access Token <span className="text-rose-600">*</span>
                </label>
                <input
                  id="github-token"
                  type="password"
                  className="input-field"
                  placeholder={
                    connectorsConfig.data?.github?.isConfigured
                      ? '•••••••••••• (configured - enter new token to replace)'
                      : 'ghp_your_personal_access_token'
                  }
                  value={githubForm.token}
                  onChange={(e) => setGithubForm({ ...githubForm, token: e.target.value })}
                />
                <span className="text-[10px] text-muted-foreground block mt-1">
                  Token generated from github.com/settings/tokens with <code>repo</code> access.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="github-repo">
                    Repository (owner/repo) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="github-repo"
                    type="text"
                    className="input-field"
                    placeholder="e.g. facebook/react or acme/backend"
                    value={githubForm.repo}
                    onChange={(e) => setGithubForm({ ...githubForm, repo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="github-mode">
                    Stream Type
                  </label>
                  <select
                    id="github-mode"
                    className="select-control w-full"
                    value={githubForm.mode}
                    onChange={(e) => setGithubForm({ ...githubForm, mode: e.target.value })}
                  >
                    <option value="pulls">Pull Requests & Discussions</option>
                    <option value="commits">Recent Commit History</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Jira Config Form */}
          {activeConnectorModal === 'jira' && (
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="jira-domain">
                  Atlassian Jira Domain <span className="text-rose-600">*</span>
                </label>
                <input
                  id="jira-domain"
                  type="text"
                  className="input-field"
                  placeholder="acmecorp.atlassian.net"
                  value={jiraForm.domain}
                  onChange={(e) => setJiraForm({ ...jiraForm, domain: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="jira-email">
                    Account Email <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="jira-email"
                    type="email"
                    className="input-field"
                    placeholder="name@company.com"
                    value={jiraForm.email}
                    onChange={(e) => setJiraForm({ ...jiraForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="jira-token">
                    Atlassian API Token <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="jira-token"
                    type="password"
                    className="input-field"
                    placeholder={
                      connectorsConfig.data?.jira?.isConfigured
                        ? '•••••••••••• (configured - enter new token to replace)'
                        : 'Atlassian API token'
                    }
                    value={jiraForm.apiToken}
                    onChange={(e) => setJiraForm({ ...jiraForm, apiToken: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="jira-jql">
                  JQL Filter Query <span className="font-normal text-muted-foreground">(Optional)</span>
                </label>
                <input
                  id="jira-jql"
                  type="text"
                  className="input-field"
                  placeholder="ORDER BY updated DESC"
                  value={jiraForm.jql}
                  onChange={(e) => setJiraForm({ ...jiraForm, jql: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Confluence Config Form */}
          {activeConnectorModal === 'confluence' && (
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="confluence-domain">
                  Atlassian Confluence Domain <span className="text-rose-600">*</span>
                </label>
                <input
                  id="confluence-domain"
                  type="text"
                  className="input-field"
                  placeholder="acmecorp.atlassian.net"
                  value={confluenceForm.domain}
                  onChange={(e) => setConfluenceForm({ ...confluenceForm, domain: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="confluence-email">
                    Account Email <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="confluence-email"
                    type="email"
                    className="input-field"
                    placeholder="name@company.com"
                    value={confluenceForm.email}
                    onChange={(e) => setConfluenceForm({ ...confluenceForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="confluence-token">
                    Atlassian API Token <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="confluence-token"
                    type="password"
                    className="input-field"
                    placeholder={
                      connectorsConfig.data?.confluence?.isConfigured
                        ? '•••••••••••• (configured - enter new token to replace)'
                        : 'Atlassian API Token'
                    }
                    value={confluenceForm.apiToken}
                    onChange={(e) => setConfluenceForm({ ...confluenceForm, apiToken: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="confluence-space-key">
                  Space Key <span className="font-normal text-muted-foreground">(Optional - leave blank for all spaces)</span>
                </label>
                <input
                  id="confluence-space-key"
                  type="text"
                  className="input-field"
                  placeholder="e.g. ENG, PROD, or DOCS"
                  value={confluenceForm.spaceKey}
                  onChange={(e) => setConfluenceForm({ ...confluenceForm, spaceKey: e.target.value })}
                />
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Generate an API token at <code>id.atlassian.com/manage-profile/security/api-tokens</code>.
              </span>
            </div>
          )}

          {/* Google Drive Config Form */}
          {activeConnectorModal === 'google_drive' && (
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="gdrive-token">
                  Google OAuth Bearer Token or API Key <span className="text-rose-600">*</span>
                </label>
                <input
                  id="gdrive-token"
                  type="password"
                  className="input-field"
                  placeholder={
                    connectorsConfig.data?.google_drive?.isConfigured
                      ? '•••••••••••• (configured - enter new key to replace)'
                      : 'OAuth Bearer Token (ya29...) or Google Cloud API Key'
                  }
                  value={googleDriveForm.apiKeyOrToken}
                  onChange={(e) =>
                    setGoogleDriveForm({ ...googleDriveForm, apiKeyOrToken: e.target.value })
                  }
                />
                <span className="text-[10px] text-muted-foreground block mt-1">
                  Supports Google OAuth 2.0 Bearer tokens (with <code>drive.readonly</code> scope) or Google API Keys with Google Drive API enabled.
                </span>
              </div>
              <div>
                <label className="field-label" htmlFor="gdrive-folder-id">
                  Folder ID <span className="font-normal text-muted-foreground">(Optional - default: "root")</span>
                </label>
                <input
                  id="gdrive-folder-id"
                  type="text"
                  className="input-field"
                  placeholder="root or folder ID from Google Drive URL"
                  value={googleDriveForm.folderId}
                  onChange={(e) =>
                    setGoogleDriveForm({ ...googleDriveForm, folderId: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* Test Connection Output */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs leading-5 my-4 flex items-start gap-2 ${
                testResult.success
                  ? 'bg-[#f0f5ea] border border-[#cfddc2] text-[#4b6037]'
                  : 'bg-[#fdf2f2] border border-[#f5c6cb] text-[#932a32]'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon size={15} className="shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testingConnector}
              className="!text-xs"
            >
              {testingConnector ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {testingConnector ? 'Testing live API…' : 'Test Connection'}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveConnectorModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveConnectorConfig}
                disabled={savingConnector}
              >
                {savingConnector ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                Save & Connect
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Memory Review & Dispute Modal */}
      {selected && (
        <Modal title={selected.title} onClose={() => setSelected(null)}>
          <div className="flex flex-wrap gap-2 mb-5 items-center">
            <span className="pill pill-sage capitalize">{selected.memoryType}</span>
            <span
              className={`pill ${
                selected.verificationStatus === 'verified'
                  ? 'pill-sage'
                  : selected.verificationStatus === 'disputed'
                  ? 'pill-rose'
                  : selected.verificationStatus === 'superseded'
                  ? 'pill-slate text-gray-500'
                  : 'pill-gold'
              }`}
            >
              {selected.verificationStatus}
            </span>
            <span className="text-[10px] text-muted-foreground">
              Confidence: {(selected.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <p className="text-xs leading-8 text-[#849674] whitespace-pre-wrap">
            {selected.description}
          </p>

          {/* Evidence Citations */}
          {selected.evidence && selected.evidence.length > 0 && (
            <div className="mt-5">
              <span className="text-[10px] text-muted-foreground font-medium block mb-2">
                SUPPORTING EVIDENCE
              </span>
              {selected.evidence.map((e, i) => (
                <button
                  key={i}
                  className="citation-card w-full mt-2"
                  onClick={() => {
                    setSelected(null);
                    setSourceId(e.sourceId);
                  }}
                >
                  <div>
                    <FileText size={12} />
                    {e.source?.title || 'Supporting source'}
                    <ArrowUpRight size={12} className="ml-auto" />
                  </div>
                  <p>{e.excerpt}</p>
                </button>
              ))}
            </div>
          )}

          {error && <div className="error-note mt-5">{error}</div>}

          {/* Manager / Admin Governance Actions */}
          {['owner', 'admin', 'manager'].includes(workspace.data?.role || '') && (
            <div className="mt-6 pt-5 border-t">
              <label htmlFor="resolution-reason" className="field-label !text-[10px]">
                Review notes / dispute rationale (optional)
              </label>
              <input
                id="resolution-reason"
                className="input-field !text-xs !py-1.5 mb-4"
                placeholder="e.g. Verified against Q3 roadmap, or Disputed due to conflicting customer contract."
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                disabled={reviewing}
              />

              <div className="flex flex-wrap gap-2 justify-end">
                {selected.verificationStatus !== 'disputed' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReviewStatus('disputed', 'disputed')}
                    disabled={reviewing}
                    className="!text-xs text-rose-700 hover:text-rose-800"
                  >
                    <AlertOctagon size={13} />
                    Dispute memory
                  </Button>
                )}

                {selected.verificationStatus !== 'superseded' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReviewStatus('superseded', 'superseded')}
                    disabled={reviewing}
                    className="!text-xs"
                  >
                    <Clock3 size={13} />
                    Mark superseded
                  </Button>
                )}

                {selected.verificationStatus !== 'verified' && (
                  <Button
                    size="sm"
                    onClick={() => handleReviewStatus('verified', 'verified')}
                    disabled={reviewing}
                    className="!text-xs"
                  >
                    {reviewing ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={13} />
                    )}
                    Verify this memory
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Audit Log Details Modal */}
      {selectedAuditLog && (
        <Modal
          title={`Audit Event: ${selectedAuditLog.action.replace(/_/g, ' ').toUpperCase()}`}
          onClose={() => setSelectedAuditLog(null)}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#f6f8f2] rounded-lg border border-[#e4ebd9]">
              <div>
                <span className="text-[10px] text-muted-foreground block">ACTOR</span>
                <strong>{selectedAuditLog.user.name}</strong>
                <span className="text-muted-foreground block text-[10px]">{selectedAuditLog.user.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">TIMESTAMP</span>
                <span>{new Date(selectedAuditLog.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">RESOURCE TYPE</span>
                <span>{selectedAuditLog.resourceType || 'None'}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">RESOURCE ID</span>
                <span className="font-mono text-[10px]">{selectedAuditLog.resourceId || 'N/A'}</span>
              </div>
            </div>

            <div>
              <span className="field-label">Event Details Payload</span>
              <pre className="p-3 rounded-lg bg-[#222c24] text-[#cfdcbe] font-mono text-[11px] overflow-auto max-h-64 whitespace-pre-wrap">
                {JSON.stringify(selectedAuditLog.details, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
