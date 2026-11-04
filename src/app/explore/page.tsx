'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Compass, Search, Users, FolderOpen, Building, Cpu, GitBranch, Loader2, ChevronsLeft, ChevronsRight, X, Clock, Layers, Sparkles } from 'lucide-react';

interface Entity {
  id: string;
  name: string;
  entityType: string;
  description: string | null;
  attributes: Record<string, unknown>;
  status: string;
}

interface Relationship {
  id: string;
  relationshipType: string;
  confidence: number;
  sourceEntity: Entity;
  targetEntity: Entity;
}

const typeIcons: Record<string, typeof Users> = {
  person: Users,
  project: FolderOpen,
  customer: Building,
  technology: Cpu,
  department: Users,
};

const typeColors: Record<string, string> = {
  person: '#3b82f6',
  project: '#10b981',
  customer: '#f59e0b',
  technology: '#8b5cf6',
  department: '#ec4899',
  vendor: '#ef4444',
  partner: '#06b6d4',
  decision: '#f97316',
  process: '#22c55e',
  document: '#6b7280',
  event: '#eab308',
  experience: '#a855f7',
};

export default function ExploreBrainPage() {
  const { status } = useSession();
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityRels, setEntityRels] = useState<Relationship[]>([]);
  const [entityMemories, setEntityMemories] = useState<any[]>([]);
  const [entityEvents, setEntityEvents] = useState<any[]>([]);
  const [detailTab, setDetailTab] = useState<'relationships' | 'memories' | 'timeline'>('relationships');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Adjustable panel sizes (Left & Right)
  const [leftWidth, setLeftWidth] = useState<number>(310);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(false);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);

  const [rightWidth, setRightWidth] = useState<number>(400);
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);

  const startResizingLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  const startResizingRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  useEffect(() => {
    if (!isResizingLeft) return;
    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(550, Math.max(200, e.clientX));
      setLeftWidth(newWidth);
    };
    const onMouseUp = () => setIsResizingLeft(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizingLeft]);

  useEffect(() => {
    if (!isResizingRight) return;
    const onMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const newWidth = Math.min(700, Math.max(280, windowWidth - e.clientX));
      setRightWidth(newWidth);
    };
    const onMouseUp = () => setIsResizingRight(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizingRight]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
    if (status === 'authenticated') {
      Promise.all([
        fetch('/api/entities').then((r) => r.json()),
        fetch('/api/graph').then((r) => r.json()),
      ])
        .then(([entRes, relRes]) => {
          if (entRes.success) setEntities(entRes.data);
          if (relRes.success) setRelationships(relRes.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  const selectEntity = useCallback(async (entity: Entity) => {
    setSelectedEntity(entity);
    try {
      const res = await fetch(`/api/entities/${entity.id}`);
      const data = await res.json();
      if (data.success) {
        setEntityRels(data.data.relationships || []);
        setEntityMemories(data.data.memories || []);
        setEntityEvents(data.data.events || []);
      }
    } catch {
      setEntityRels([]);
      setEntityMemories([]);
      setEntityEvents([]);
    }
  }, []);

  // Simple canvas graph visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || entities.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Position entities in a force-directed-like layout
    const positions: Map<string, { x: number; y: number }> = new Map();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const radius = Math.min(cx, cy) - 60;

    const visibleEntities = entities.slice(0, 50); // Cap for performance
    visibleEntities.forEach((e, i) => {
      const angle = (2 * Math.PI * i) / visibleEntities.length;
      const r = radius * (0.5 + Math.random() * 0.5);
      positions.set(e.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    });

    // Draw relationships
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.15)';
    ctx.lineWidth = 1;
    relationships.forEach((rel) => {
      const from = positions.get(rel.sourceEntity?.id);
      const to = positions.get(rel.targetEntity?.id);
      if (from && to) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
    });

    // Draw entities
    visibleEntities.forEach((e) => {
      const pos = positions.get(e.id);
      if (!pos) return;

      const color = typeColors[e.entityType] || '#6b7280';
      const isSelected = selectedEntity?.id === e.id;
      const nodeRadius = isSelected ? 10 : 7;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.fillStyle = '#888';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.name.length > 15 ? e.name.slice(0, 15) + '…' : e.name, pos.x, pos.y + nodeRadius + 14);
    });
  }, [entities, relationships, selectedEntity]);

  const filteredEntities = entities.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || e.entityType === filterType;
    return matchesSearch && matchesType;
  });

  const entityTypes = Array.from(new Set(entities.map((e) => e.entityType)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full relative overflow-hidden">
      {/* Left panel: Entity list (Adjustable width & collapsible) */}
      <div
        className={`border-b lg:border-b-0 lg:border-r flex flex-col relative transition-all ${
          isResizingLeft ? 'select-none' : ''
        }`}
        style={{
          width: isLeftCollapsed ? 54 : leftWidth,
          minWidth: isLeftCollapsed ? 54 : 200,
        }}
      >
        {/* Resize Handle */}
        {!isLeftCollapsed && (
          <div
            onMouseDown={startResizingLeft}
            className={`hidden lg:block absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-[#86a666]/30 z-20 ${
              isResizingLeft ? 'bg-[#86a666]/40' : ''
            }`}
            title="Drag to resize panel"
          />
        )}

        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            {!isLeftCollapsed && (
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                <h1 className="font-semibold text-sm">Explore Brain</h1>
              </div>
            )}
            <button
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground ml-auto"
              title={isLeftCollapsed ? 'Expand entity list' : 'Compact entity list'}
            >
              {isLeftCollapsed ? <Compass className="h-4 w-4" /> : <span className="text-xs">⇥</span>}
            </button>
          </div>

          {!isLeftCollapsed && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entities..."
                  className="pl-9 h-9 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setFilterType('all')}
                >
                  All ({entities.length})
                </Badge>
                {entityTypes.map((t) => (
                  <Badge
                    key={t}
                    variant={filterType === t ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px]"
                    onClick={() => setFilterType(t)}
                  >
                    {t} ({entities.filter((e) => e.entityType === t).length})
                  </Badge>
                ))}
              </div>
            </>
          )}
        </div>
        {!isLeftCollapsed && (
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredEntities.map((e) => (
                <button
                  key={e.id}
                  onClick={() => selectEntity(e)}
                  className={`w-full text-left p-2.5 rounded-md transition-colors text-sm ${
                    selectedEntity?.id === e.id
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: typeColors[e.entityType] || '#888' }}
                    />
                    <span className="font-medium truncate">{e.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {e.description || e.entityType}
                  </p>
                </button>
              ))}
              {filteredEntities.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No entities found</p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Center: Graph */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <div className="flex-1 relative bg-muted/20">
          <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 400 }} />
          {entities.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Upload documents to populate the knowledge graph</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Resizer Handle */}
      {!isRightCollapsed && (
        <div
          onMouseDown={startResizingRight}
          className="w-1 cursor-col-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-20 bg-border/40"
          title="Drag to resize inspector panel"
        />
      )}

      {/* Right Inspector Panel */}
      <div
        style={{ width: isRightCollapsed ? '48px' : `${rightWidth}px` }}
        className="relative border-l bg-background flex flex-col h-full z-10 transition-all duration-75 ease-out flex-shrink-0"
      >
        {isRightCollapsed ? (
          <div className="p-3 flex flex-col items-center gap-4">
            <button
              onClick={() => setIsRightCollapsed(false)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
              title="Expand Inspector Panel"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <div className="writing-vertical text-xs font-medium text-muted-foreground tracking-widest uppercase">
              Inspector
            </div>
          </div>
        ) : selectedEntity ? (
          <div className="flex flex-col h-full min-h-0">
            {/* Inspector Header */}
            <div className="p-3.5 border-b space-y-3 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: typeColors[selectedEntity.entityType] || '#888' }}
                  />
                  <h2 className="font-semibold text-sm truncate" title={selectedEntity.name}>
                    {selectedEntity.name}
                  </h2>
                  <Badge variant="outline" className="text-[10px] uppercase flex-shrink-0">
                    {selectedEntity.entityType}
                  </Badge>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setIsRightCollapsed(true)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                    title="Compact Inspector Panel"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                    title="Close Inspector"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {selectedEntity.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {selectedEntity.description}
                </p>
              )}

              {/* Sub-tabs */}
              <div className="flex gap-1 pt-1">
                <Button
                  size="sm"
                  variant={detailTab === 'relationships' ? 'default' : 'ghost'}
                  className="!text-[10px] !h-7 !px-2.5 flex-1"
                  onClick={() => setDetailTab('relationships')}
                >
                  Graph ({entityRels.length})
                </Button>
                <Button
                  size="sm"
                  variant={detailTab === 'memories' ? 'default' : 'ghost'}
                  className="!text-[10px] !h-7 !px-2.5 flex-1"
                  onClick={() => setDetailTab('memories')}
                >
                  Memories ({entityMemories.length})
                </Button>
                <Button
                  size="sm"
                  variant={detailTab === 'timeline' ? 'default' : 'ghost'}
                  className="!text-[10px] !h-7 !px-2.5 flex-1"
                  onClick={() => setDetailTab('timeline')}
                >
                  Timeline ({entityEvents.length})
                </Button>
              </div>
            </div>

            {/* Inspector Tab Content */}
            <ScrollArea className="flex-1 p-3.5">
              {detailTab === 'relationships' && (
                <div>
                  {entityRels.length > 0 ? (
                    <div className="space-y-2">
                      {entityRels.map((rel) => {
                        const isSource = rel.sourceEntity?.id === selectedEntity.id;
                        const other = isSource ? rel.targetEntity : rel.sourceEntity;
                        return (
                          <div
                            key={rel.id}
                            className="flex items-center justify-between text-xs p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-xs text-muted-foreground">
                                {isSource ? '→' : '←'}
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                                {rel.relationshipType}
                              </Badge>
                              <button
                                onClick={() => other && selectEntity(other)}
                                className="text-primary hover:underline font-medium truncate"
                              >
                                {other?.name}
                              </button>
                            </div>
                            <span className="text-muted-foreground text-[10px] font-mono flex-shrink-0 ml-2">
                              {((rel.confidence || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      No direct graph relationships connected yet.
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'memories' && (
                <div className="space-y-2.5">
                  {entityMemories.length > 0 ? (
                    entityMemories.map((mem: any) => (
                      <div
                        key={mem.id}
                        className="p-3 rounded-lg bg-card border border-border/70 text-xs space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-foreground font-semibold truncate">{mem.title}</strong>
                          <span className="pill pill-sage !text-[9px] uppercase flex-shrink-0">
                            {mem.memoryType}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {mem.description}
                        </p>
                        <div className="flex items-center gap-2 pt-1 text-[10px] text-muted-foreground border-t border-border/40 font-mono">
                          <span>Confidence: {((mem.confidence || 0) * 100).toFixed(0)}%</span>
                          <span>·</span>
                          <span className="capitalize">{mem.verificationStatus}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      No structured memories linked directly to this entity.
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'timeline' && (
                <div className="space-y-2.5">
                  {entityEvents.length > 0 ? (
                    entityEvents.map((evt: any) => (
                      <div
                        key={evt.id}
                        className="p-3 rounded-lg bg-card border-l-2 border-primary border-t border-r border-b text-xs space-y-1 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-foreground font-semibold">{evt.title}</strong>
                          <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                            {evt.eventDate ? new Date(evt.eventDate).toLocaleDateString() : 'Historical'}
                          </span>
                        </div>
                        {evt.description && (
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {evt.description}
                          </p>
                        )}
                        <Badge variant="outline" className="text-[9px] capitalize">
                          {evt.eventType || 'Event'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      No temporal timeline events logged for this entity.
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center justify-center text-center h-full text-muted-foreground space-y-3">
            <Compass className="h-8 w-8 text-muted-foreground/60" />
            <h3 className="font-semibold text-sm text-foreground">Entity Inspector</h3>
            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              Select any node on the graph or pick an entity from the left list to view its 7D connections, memories, and timeline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

