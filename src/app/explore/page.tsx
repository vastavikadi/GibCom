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
import { Compass, Search, Users, FolderOpen, Building, Cpu, GitBranch, Loader2 } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      if (data.success) setEntityRels(data.data.relationships);
    } catch {
      setEntityRels([]);
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
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left panel: Entity list */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Explore Brain</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entities..."
              className="pl-9"
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
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredEntities.map((e) => (
              <button
                key={e.id}
                onClick={() => selectEntity(e)}
                className={`w-full text-left p-2.5 rounded-md transition-colors text-sm ${selectedEntity?.id === e.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColors[e.entityType] || '#888' }} />
                  <span className="font-medium truncate">{e.name}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{e.description || e.entityType}</p>
              </button>
            ))}
            {filteredEntities.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No entities found</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Center: Graph */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 relative bg-muted/30">
          <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 400 }} />
          {entities.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">Upload documents to populate the knowledge graph</p>
            </div>
          )}
        </div>

        {/* Entity detail panel */}
        {selectedEntity && (
          <div className="border-t p-4 max-h-72 overflow-y-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: typeColors[selectedEntity.entityType] || '#888' }} />
              <h2 className="font-semibold">{selectedEntity.name}</h2>
              <Badge variant="outline">{selectedEntity.entityType}</Badge>
            </div>
            {selectedEntity.description && (
              <p className="text-sm text-muted-foreground mb-3">{selectedEntity.description}</p>
            )}
            {entityRels.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground mb-2">RELATIONSHIPS ({entityRels.length})</h3>
                <div className="space-y-1.5">
                  {entityRels.map((rel) => {
                    const isSource = rel.sourceEntity?.id === selectedEntity.id;
                    const other = isSource ? rel.targetEntity : rel.sourceEntity;
                    return (
                      <div key={rel.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50">
                        <span className="font-medium">{isSource ? '→' : '←'}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{rel.relationshipType}</Badge>
                        <button
                          onClick={() => other && selectEntity(other)}
                          className="text-primary hover:underline"
                        >
                          {other?.name}
                        </button>
                        <span className="text-muted-foreground ml-auto">{((rel.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

