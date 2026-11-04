'use client';
import Link from 'next/link';
import { usePathname,useRouter } from 'next/navigation';
import { useSession,signOut } from 'next-auth/react';
import { useEffect,useState } from 'react';
import { ArrowUpRight,ArrowRight,ChevronDown,ChevronRight,Command,Compass,FolderClosed,GraduationCap,LayoutGrid,Lightbulb,LogOut,Menu,MessageSquare,Search,Settings2,ShieldCheck,Sparkles,X,Zap } from 'lucide-react';
import { BrainMark } from './brand';
import { Modal } from './workspace';
import { request } from '@/lib/client';

const navItems=[{href:'/dashboard',label:'Overview',icon:LayoutGrid},{href:'/ask',label:'Ask Brain',icon:MessageSquare},{href:'/explore',label:'Explore Brain',icon:Compass},{href:'/insights',label:'Brain Insights',icon:Lightbulb},{href:'/actions',label:'Brain Actions',icon:Zap},{href:'/teach',label:'Teach Brain',icon:GraduationCap}];
export function AppShell({children}:{children:React.ReactNode}){
  const pathname=usePathname();const router=useRouter();const {data:session,status}=useSession();
  const [open,setOpen]=useState(false);const [searchOpen,setSearchOpen]=useState(false);const [query,setQuery]=useState('');
  const [workspace,setWorkspace]=useState<{name:string;role?:string}>({name:'Your workspace'});
  const [entities,setEntities]=useState<{id:string;name:string;entityType:string}[]>([]);
  useEffect(()=>{if(status==='authenticated'){request<{organization?:{name:string};role?:string}>('/api/dashboard').then(data=>{if(data.organization)setWorkspace({name:data.organization.name,role:data.role});}).catch(()=>{});}},[status]);
  useEffect(()=>{if(searchOpen&&status==='authenticated')request<typeof entities>('/api/entities').then(setEntities).catch(()=>setEntities([]));},[searchOpen,status]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setSearchOpen(v=>!v);}if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  useEffect(()=>{setOpen(false);setSearchOpen(false);},[pathname]);
  if(pathname.startsWith('/auth')||!session)return <>{children}</>;
  const initials=session.user?.name?.split(' ').map(n=>n[0]).slice(0,2).join('')||'CB';
  const current=navItems.find(item=>pathname.startsWith(item.href))?.label||(pathname.startsWith('/sources')?'Source library':'Administration');
  return <div className="app-shell"><a href="#workspace-content" className="skip-link">Skip to content</a>
    {open&&<button className="sidebar-overlay" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
    <aside className={`app-sidebar ${open?'is-open':''}`} aria-label="Main navigation">
      <Link href="/dashboard" className="sidebar-brand"><BrainMark size={34}/><div><div className="brand-name">Company’s Brain</div><div className="brand-caption">Collective intelligence</div></div></Link>
      <Link href="/admin" className="workspace-switch"><span className="workspace-avatar">{workspace.name.charAt(0)}</span><div className="min-w-0 flex-1"><p className="text-[11px] text-[#d6ddc9] truncate">{workspace.name}</p><p className="text-[9px] text-[#809373] mt-1">Organization workspace</p></div><ChevronDown size={13} className="text-[#7c8b71]"/></Link>
      <p className="sidebar-caption">WORKSPACE</p><nav className="sidebar-nav">{navItems.map(item=><Link key={item.href} href={item.href} aria-current={pathname===item.href?'page':undefined} className={`nav-link ${pathname===item.href?'active':''}`}><item.icon/>{item.label}</Link>)}</nav>
      <div className="mt-8"><p className="sidebar-caption">MANAGE</p><nav className="sidebar-nav"><Link href="/admin" className={`nav-link ${pathname==='/admin'?'active':''}`} aria-current={pathname==='/admin'?'page':undefined}><Settings2/>Administration</Link></nav></div>
      <div className="sidebar-bottom"><div className="sidebar-note grain"><Sparkles size={17} className="text-[#b9ca92]"/><p>A little knowledge.<br/>An extraordinary edge.</p><small>The more you share,<br/>the more your company knows.</small><Link href="/teach" className="flex items-center gap-2 mt-4 text-[10px] text-[#d0daba] relative z-10">Share what you know<ArrowUpRight size={13}/></Link></div><div className="sidebar-account"><div className="sidebar-avatar">{initials}</div><div className="min-w-0 flex-1"><p className="text-[11px] text-[#d7decb] truncate">{session.user?.name}</p><p className="text-[9px] text-[#809171] mt-1 capitalize">{workspace.role||'Workspace member'}</p></div><button aria-label="Sign out" onClick={()=>signOut({callbackUrl:'/auth/login'})} className="p-2 hover:text-white transition-colors"><LogOut size={15}/></button></div></div>
    </aside>
    <div className="app-main"><header className="app-topbar"><div className="breadcrumb"><button className="mobile-menu mr-2" aria-label="Open navigation" onClick={()=>setOpen(true)}><Menu size={20}/></button><span>Workspace</span><ChevronRight size={12}/><span className="breadcrumb-current">{current}</span></div><div className="topbar-tools"><button className="search-trigger" onClick={()=>{setQuery('');setSearchOpen(true);}} aria-label="Search workspace"><Search size={13}/><span>Search anything</span><kbd>⌘ K</kbd></button><div className="topbar-divider"/><span className="topbar-date">{new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span><Link href="/admin" title="Workspace settings" className="w-7 h-7 flex items-center justify-center rounded-full border border-[#d9dfcd] bg-[#e8edde] text-[#7a8a65] text-[9px]">{initials}</Link></div></header>
    <main id="workspace-content" className="app-scroll" tabIndex={-1}>{children}</main></div>
    {searchOpen&&<Modal title="Find your way around" onClose={()=>setSearchOpen(false)}><div className="relative mb-5"><Search size={17} className="absolute left-4 top-4 text-[#8b9b79]"/><input autoFocus className="input-field !pl-11" placeholder="Search people, projects, or pages…" aria-label="Search people, projects, or pages" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="eyebrow text-[#9aa58f] mb-2">Navigate</div>{navItems.filter(item=>item.label.toLowerCase().includes(query.toLowerCase())).map(item=><Link className="command-result" key={item.href} href={item.href} onClick={()=>setSearchOpen(false)}><item.icon size={16}/>{item.label}<ArrowUpRight size={13} className="ml-auto"/></Link>)}{query&&<><div className="eyebrow text-[#9aa58f] mt-5 mb-2">Organizational knowledge</div>{entities.filter(e=>e.name.toLowerCase().includes(query.toLowerCase())).slice(0,6).map(entity=><Link className="command-result" href={`/explore?entity=${entity.id}`} key={entity.id} onClick={()=>setSearchOpen(false)}><FolderClosed size={16}/>{entity.name}<span className="text-[10px] text-muted-foreground ml-auto">{entity.entityType}</span></Link>)}<Link className="command-result border border-dashed mt-3" href={`/ask?q=${encodeURIComponent(query)}`} onClick={()=>setSearchOpen(false)}><BrainMark size={17}/>Ask Brain about “{query}”<ArrowRight size={14} className="ml-auto"/></Link></>}</Modal>}
  </div>;
}
