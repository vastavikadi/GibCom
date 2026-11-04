'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  FolderClosed,
  FolderOpen,
  GraduationCap,
  LayoutGrid,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { BrainMark } from './brand';
import { Modal } from './workspace';
import { request } from '@/lib/client';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/ask', label: 'Ask Brain', icon: MessageSquare },
  { href: '/explore', label: 'Explore Brain', icon: Compass },
  { href: '/insights', label: 'Brain Insights', icon: Lightbulb, badge: 'Signals' },
  { href: '/actions', label: 'Brain Actions', icon: Zap },
  { href: '/teach', label: 'Teach Brain', icon: GraduationCap, badge: '+' },
];

const manageItems = [
  { href: '/admin?tab=sources', label: 'Source library', icon: FolderOpen },
  { href: '/admin?tab=memories', label: 'Memory review', icon: ShieldCheck },
  { href: '/admin', label: 'Administration', icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Mobile drawer state
  const [open, setOpen] = useState(false);

  // Command palette search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Workspace details
  const [workspace, setWorkspace] = useState<{
    name: string;
    slug?: string;
    role?: string;
    membersCount?: number;
    totalMemories?: number;
  }>({ name: 'Acme Corp', role: 'member' });
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);

  // Entities for quick search
  const [entities, setEntities] = useState<{ id: string; name: string; entityType: string }[]>([]);

  // Adjustable Sidebar (Left Panel) State
  const [sidebarWidth, setSidebarWidth] = useState<number>(252);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load saved preferences from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedWidth = localStorage.getItem('cb_sidebar_width');
    const savedCompact = localStorage.getItem('cb_sidebar_compact');
    if (savedWidth) {
      const w = parseInt(savedWidth, 10);
      if (!isNaN(w) && w >= 68 && w <= 420) {
        setSidebarWidth(w);
        if (w <= 80 || savedCompact === 'true') {
          setIsCompact(true);
        }
      }
    }
  }, []);

  // Fetch workspace data
  useEffect(() => {
    if (status === 'authenticated') {
      request<{
        organization?: { name: string; slug?: string };
        role?: string;
        totalMemories?: number;
      }>('/api/dashboard')
        .then((data) => {
          if (data.organization) {
            setWorkspace({
              name: data.organization.name,
              slug: data.organization.slug || 'acme-corp',
              role: data.role || 'member',
              totalMemories: data.totalMemories || 0,
            });
          }
        })
        .catch(() => {});
    }
  }, [status]);

  // Load entities when search palette opens
  useEffect(() => {
    if (searchOpen && status === 'authenticated') {
      request<typeof entities>('/api/entities')
        .then(setEntities)
        .catch(() => setEntities([]));
    }
  }, [searchOpen, status]);

  // Global keybindings
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleCompact();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setWorkspaceDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCompact]);

  // Close menus on path change
  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
    setWorkspaceDropdownOpen(false);
  }, [pathname]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setWorkspaceDropdownOpen(false);
      }
    };
    if (workspaceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [workspaceDropdownOpen]);

  // Left Panel Resizing Logic
  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      const clientX = e.clientX;
      const minWidth = 68;
      const maxWidth = 420;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, clientX));

      if (newWidth < 120) {
        setIsCompact(true);
        setSidebarWidth(68);
        localStorage.setItem('cb_sidebar_width', '68');
        localStorage.setItem('cb_sidebar_compact', 'true');
      } else {
        setIsCompact(false);
        setSidebarWidth(newWidth);
        localStorage.setItem('cb_sidebar_width', String(newWidth));
        localStorage.setItem('cb_sidebar_compact', 'false');
      }
    };

    const onMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing]);

  const toggleCompact = () => {
    if (isCompact) {
      setIsCompact(false);
      setSidebarWidth(252);
      localStorage.setItem('cb_sidebar_width', '252');
      localStorage.setItem('cb_sidebar_compact', 'false');
    } else {
      setIsCompact(true);
      setSidebarWidth(68);
      localStorage.setItem('cb_sidebar_width', '68');
      localStorage.setItem('cb_sidebar_compact', 'true');
    }
  };

  if (pathname.startsWith('/auth') || !session) return <>{children}</>;

  const initials =
    session.user?.name
      ?.split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('') || 'CB';

  const current =
    navItems.find((item) => pathname.startsWith(item.href))?.label ||
    (pathname.startsWith('/sources') ? 'Source library' : 'Administration');

  return (
    <div className="app-shell">
      <a href="#workspace-content" className="skip-link">
        Skip to content
      </a>

      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Resizable Left Panel (Sidebar) */}
      <aside
        className={`app-sidebar ${open ? 'is-open' : ''} ${isCompact ? 'is-compact' : ''} ${
          isResizing ? 'is-resizing' : ''
        }`}
        style={{ width: isCompact ? 68 : sidebarWidth }}
        aria-label="Main navigation"
      >
        {/* Resize handle */}
        <div
          className={`sidebar-resizer ${isResizing ? 'is-dragging' : ''}`}
          onMouseDown={startResizing}
          onDoubleClick={toggleCompact}
          title="Drag to adjust sidebar width (Double click to collapse/expand)"
        />

        {/* Brand & Compact Toggle (Fixed Header) */}
        <div className="flex items-center justify-between sidebar-brand flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3">
            <BrainMark size={32} />
            {!isCompact && (
              <div>
                <div className="brand-name">GibCom</div>
                <div className="brand-caption">Collective intelligence</div>
              </div>
            )}
          </Link>
          {!isCompact && (
            <button
              onClick={toggleCompact}
              className="sidebar-toggle-btn"
              title="Compact sidebar (Ctrl+B)"
              aria-label="Compact sidebar"
            >
              <ChevronsLeft size={14} />
            </button>
          )}
        </div>

        {/* Scrollable Middle Navigation & Wisdom Area */}
        <div className="sidebar-scroll-area">
          {/* Workspace Switcher */}
          <div className="relative" ref={popoverRef}>
            <button
              onClick={() => setWorkspaceDropdownOpen((v) => !v)}
              className="workspace-switch w-[calc(100%-36px)] text-left cursor-pointer hover:bg-white/5 transition-colors"
              title={isCompact ? workspace.name : undefined}
            >
              <span className="workspace-avatar">{workspace.name.charAt(0)}</span>
              {!isCompact && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[#d6ddc9] truncate">{workspace.name}</p>
                    <p className="text-[9px] text-[#809373] mt-0.5 capitalize">
                      {workspace.role || 'Member'} · Org
                    </p>
                  </div>
                  <ChevronDown
                    size={13}
                    className={`text-[#7c8b71] transition-transform ${
                      workspaceDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </>
              )}
            </button>

            {/* Interactive Workspace Popover */}
            {workspaceDropdownOpen && (
              <div className="workspace-popover">
                <div className="pb-3 border-b border-[#364336] mb-2 px-1">
                  <span className="eyebrow text-[#8da075]">ACTIVE WORKSPACE</span>
                  <p className="text-xs font-medium text-[#edf3e4] mt-1">{workspace.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="pill pill-sage capitalize !text-[8px]">{workspace.role}</span>
                    <span className="text-[9px] text-[#829672]">8 Team Members</span>
                  </div>
                </div>
                <Link
                  href="/admin?tab=settings"
                  className="workspace-popover-item"
                  onClick={() => setWorkspaceDropdownOpen(false)}
                >
                  <Settings2 size={13} />
                  <span>Workspace Settings</span>
                </Link>
                <Link
                  href="/insights"
                  className="workspace-popover-item"
                  onClick={() => setWorkspaceDropdownOpen(false)}
                >
                  <Users size={13} />
                  <span>Insight Collaborators</span>
                </Link>
                <Link
                  href="/admin?tab=sources"
                  className="workspace-popover-item"
                  onClick={() => setWorkspaceDropdownOpen(false)}
                >
                  <FolderOpen size={13} />
                  <span>Source Library</span>
                </Link>
              </div>
            )}
          </div>

          {/* WORKSPACE NAV */}
          {!isCompact && <p className="sidebar-caption">WORKSPACE</p>}
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCompact ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`nav-link ${active ? 'active' : ''}`}
                >
                  <item.icon size={17} />
                  {!isCompact && <span>{item.label}</span>}
                  {!isCompact && item.badge && <span className="nav-badge">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>

          {/* MANAGE NAV */}
          <div className="mt-6">
            {!isCompact && <p className="sidebar-caption">MANAGE</p>}
            <nav className="sidebar-nav">
              {manageItems.map((item) => {
                const active = pathname === item.href.split('?')[0];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCompact ? item.label : undefined}
                    className={`nav-link ${active && pathname === item.href ? 'active' : ''}`}
                  >
                    <item.icon size={16} />
                    {!isCompact && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Wisdom Quote Card */}
          {/* {!isCompact && (
            <div className="sidebar-note grain my-5 mx-4">
              <Sparkles size={16} className="text-[#b9ca92]" />
              <p>
                A little knowledge.
                <br />
                An extraordinary edge.
              </p>
              <small>
                The more you share,
                <br />
                the more your company knows.
              </small>
              <Link
                href="/teach"
                className="flex items-center gap-2 mt-4 text-[10px] text-[#d0daba] relative z-10"
              >
                Share what you know
                <ArrowUpRight size={13} />
              </Link>
            </div>
          )} */}
        </div>

        {/* Pinned Bottom Footer & User Profile */}
        <div className="sidebar-footer">
          <div className="sidebar-account">
            {!isCompact ? (
              <>
                <div className="sidebar-avatar" title={session.user?.name || 'Account'}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-[#d7decb] truncate">{session.user?.name}</p>
                  <p className="text-[9px] text-[#809171] mt-0.5 capitalize">
                    {workspace.role || 'Member'}
                  </p>
                </div>
                <button
                  aria-label="Sign out"
                  title="Sign out"
                  onClick={() => signOut({ callbackUrl: '/auth/login' })}
                  className="p-1.5 rounded hover:bg-white/10 text-[#859677] hover:text-white transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <div className="compact-user-controls">
                <div className="sidebar-avatar" title={session.user?.name || 'Account'}>
                  {initials}
                </div>
                <button
                  aria-label="Sign out"
                  title="Sign out"
                  onClick={() => signOut({ callbackUrl: '/auth/login' })}
                  className="p-1.5 rounded hover:bg-white/10 text-[#859677] hover:text-white transition-colors"
                >
                  <LogOut size={13} />
                </button>
                <button
                  onClick={toggleCompact}
                  className="text-[#7d906f] hover:text-[#e4edd5] p-1"
                  title="Expand sidebar"
                >
                  <ChevronsRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu mr-2"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={12} />
            <span className="breadcrumb-current">{current}</span>
          </div>
          <div className="topbar-tools">
            <button
              className="search-trigger"
              onClick={() => {
                setQuery('');
                setSearchOpen(true);
              }}
              aria-label="Search workspace"
            >
              <Search size={13} />
              <span>Search anything</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="topbar-divider" />
            <span className="topbar-date">
              {new Date().toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <Link
              href="/admin"
              title="Workspace settings"
              className="w-7 h-7 flex items-center justify-center rounded-full border border-[#d9dfcd] bg-[#e8edde] text-[#7a8a65] text-[9px]"
            >
              {initials}
            </Link>
          </div>
        </header>

        <main id="workspace-content" className="app-scroll" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* Command Palette Search Modal */}
      {searchOpen && (
        <Modal title="Find your way around" onClose={() => setSearchOpen(false)}>
          <div className="relative mb-5">
            <Search size={17} className="absolute left-4 top-4 text-[#8b9b79]" />
            <input
              autoFocus
              className="input-field !pl-11"
              placeholder="Search people, projects, or pages…"
              aria-label="Search people, projects, or pages"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="eyebrow text-[#9aa58f] mb-2">Navigate</div>
          {navItems
            .filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))
            .map((item) => (
              <Link
                className="command-result"
                key={item.href}
                href={item.href}
                onClick={() => setSearchOpen(false)}
              >
                <item.icon size={16} />
                {item.label}
                <ArrowUpRight size={13} className="ml-auto" />
              </Link>
            ))}
          {query && (
            <>
              <div className="eyebrow text-[#9aa58f] mt-5 mb-2">Organizational knowledge</div>
              {entities
                .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 6)
                .map((entity) => (
                  <Link
                    className="command-result"
                    href={`/explore?entity=${entity.id}`}
                    key={entity.id}
                    onClick={() => setSearchOpen(false)}
                  >
                    <FolderClosed size={16} />
                    {entity.name}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {entity.entityType}
                    </span>
                  </Link>
                ))}
              <Link
                className="command-result border border-dashed mt-3"
                href={`/ask?q=${encodeURIComponent(query)}`}
                onClick={() => setSearchOpen(false)}
              >
                <BrainMark size={17} />
                Ask Brain about “{query}”
                <ArrowRight size={14} className="ml-auto" />
              </Link>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
