'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type GraphNode = {
  id: string;
  fullName: string;
  caseStatus: string | null;
  segment: string;
  score: number;
  agencyCount: number;
  x?: number;
  y?: number;
};

type GraphEdge = {
  source: string;
  target: string;
  type: string;
  label: string;
  weight: number;
};

type NetworkData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeCount: number;
  edgeCount: number;
  filters: { aois: string[] };
};

const SEGMENT_COLORS: Record<string, string> = {
  Champion: '#8b5cf6',
  'Rising Star': '#3b82f6',
  Active: '#22c55e',
  'At-Risk': '#f59e0b',
  Dormant: '#6b7280',
};

const EDGE_COLORS: Record<string, string> = {
  event: '#3b82f6',
  aoi: '#22c55e',
  org: '#f59e0b',
};

export default function NetworkPage() {
  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aoiFilter, setAoiFilter] = useState('');
  const [edgeType, setEdgeType] = useState('');
  const [minConnections, setMinConnections] = useState(2);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const graphRef = useRef<{ d3Force: (name: string) => { strength: (s: number) => void } | undefined } | null>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (aoiFilter) params.set('aoi', aoiFilter);
    if (edgeType) params.set('edgeType', edgeType);
    params.set('minConnections', String(minConnections));

    try {
      const res = await fetch(`/api/network?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [aoiFilter, edgeType, minConnections]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (graphRef.current) {
      const charge = graphRef.current.d3Force('charge');
      if (charge) charge.strength(-120);
    }
  }, [data]);

  const graphData = data ? {
    nodes: data.nodes.map(n => ({ ...n })),
    links: data.edges.map(e => ({ ...e })),
  } : { nodes: [], links: [] };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Network Graph</h1>
        <p className="text-sm text-muted-foreground">
          Visualize stakeholder connections across events, organizations, and areas of interest
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={aoiFilter}
          onChange={e => setAoiFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Areas of Interest</option>
          {(data?.filters.aois ?? []).map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <select
          value={edgeType}
          onChange={e => setEdgeType(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All Connection Types</option>
          <option value="event">Shared Events</option>
          <option value="aoi">Shared AOI</option>
          <option value="org">Same Organisation</option>
        </select>

        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Min connections:</label>
          <input
            type="range"
            min={1}
            max={10}
            value={minConnections}
            onChange={e => setMinConnections(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-xs font-medium">{minConnections}</span>
        </div>

        {data && (
          <span className="text-xs text-muted-foreground">
            {data.nodeCount} nodes · {data.edgeCount} connections
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Node color (segment):</span>
          {Object.entries(SEGMENT_COLORS).map(([seg, color]) => (
            <span key={seg} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {seg}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Edge color:</span>
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="h-0.5 w-4 rounded" style={{ backgroundColor: color }} />
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Graph */}
        <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden" style={{ height: 600 }}>
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No connections found. Try adjusting filters.
            </div>
          ) : (
            // @ts-expect-error -- react-force-graph-2d generic types don't support custom node/link shapes via dynamic import
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeLabel={(node: GraphNode) => `${node.fullName} (${node.segment})`}
              nodeColor={(node: GraphNode) => SEGMENT_COLORS[node.segment] ?? '#6b7280'}
              nodeVal={(node: GraphNode) => Math.max(2, node.score / 15)}
              linkColor={(link: GraphEdge) => EDGE_COLORS[link.type] ?? '#d1d5db'}
              linkWidth={0.5}
              linkOpacity={0.4}
              onNodeClick={(node: GraphNode) => setSelectedNode(node)}
              cooldownTicks={100}
              width={selectedNode ? 700 : 900}
              height={600}
              nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
                const size = Math.max(3, (node.score ?? 30) / 15);
                const color = SEGMENT_COLORS[node.segment] ?? '#6b7280';

                ctx.beginPath();
                ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, 2 * Math.PI);
                ctx.fillStyle = color;
                ctx.fill();

                if (globalScale > 1.5) {
                  ctx.font = `${Math.max(2, 3 / globalScale)}px Sans-Serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'top';
                  ctx.fillStyle = '#374151';
                  ctx.fillText(node.fullName, node.x ?? 0, (node.y ?? 0) + size + 1);
                }
              }}
            />
          )}
        </div>

        {/* Node Detail Panel */}
        {selectedNode && (
          <div className="w-72 rounded-xl border border-border bg-card p-4 self-start">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold">{selectedNode.fullName}</h3>
                <p className="text-xs text-muted-foreground">{selectedNode.caseStatus}</p>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Engagement</span>
                <span className="font-medium">{selectedNode.score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Segment</span>
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white',
                )} style={{ backgroundColor: SEGMENT_COLORS[selectedNode.segment] }}>
                  {selectedNode.segment}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agencies</span>
                <span className="font-medium">{selectedNode.agencyCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connections</span>
                <span className="font-medium">
                  {data?.edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length ?? 0}
                </span>
              </div>
            </div>

            <Link
              href={`/dashboard/stakeholders/${selectedNode.id}`}
              className="mt-3 block w-full rounded-lg bg-primary px-3 py-1.5 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Full Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
