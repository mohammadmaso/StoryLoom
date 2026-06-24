import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useTranslation } from "react-i18next";
import { api, type GraphData } from "@/lib/api";
import { useProject } from "@/context/ProjectContext";

const TYPE_COLORS: Record<string, string> = {
  character: "#d97706",
  location: "#059669",
  item: "#7c3aed",
  chapter: "#2563eb",
  lore: "#64748b",
};

export function GraphPage() {
  const { t } = useTranslation();
  const { project } = useProject();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const loadGraph = useCallback(async () => {
    if (!project?.open) return;
    setLoading(true);
    try {
      const data = await api.getGraph();
      setGraph(data);
    } finally {
      setLoading(false);
    }
  }, [project?.open]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    if (!graph) return;
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const cols = Math.ceil(Math.sqrt(graph.nodes.length || 1));
    setNodes(
      graph.nodes.map((node, i) => ({
        id: node.id,
        data: { label: node.label, type: node.type, status: node.status },
        position: { x: (i % cols) * 220, y: Math.floor(i / cols) * 120 },
        style: {
          background: TYPE_COLORS[node.type] ?? "#44403c",
          color: "#fff",
          border: "1px solid #57534e",
          borderRadius: 8,
          padding: 8,
          fontSize: 12,
          minWidth: 100,
        },
      })),
    );
    setEdges(
      graph.edges
        .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map((edge, i) => ({
          id: `${edge.source}-${edge.target}-${i}`,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#78716c" },
          labelStyle: { fill: "#a8a29e", fontSize: 10 },
        })),
    );
  }, [graph, setNodes, setEdges]);

  async function rebuild() {
    setLoading(true);
    try {
      const { graph: g } = await api.buildGraph(true);
      setGraph(g);
    } finally {
      setLoading(false);
    }
  }

  if (!project?.open) {
    return <p className="text-stone-400">{t("home.noProject")}</p>;
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-amber-100">{t("graph.title")}</h1>
          {graph && (
            <p className="text-sm text-stone-500">
              {t("graph.nodes")}: {graph.nodes.length} · {t("graph.edges")}: {graph.edges.length} · {t("graph.warnings")}: {graph.warnings.length}
            </p>
          )}
        </div>
        <button type="button" className="btn-primary" onClick={() => void rebuild()} disabled={loading}>
          {loading ? t("common.loading") : t("graph.build")}
        </button>
      </div>

      <div className="panel min-h-0 flex-1 overflow-hidden">
        {graph && graph.nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <Background color="#44403c" gap={16} />
            <Controls />
            <MiniMap nodeColor={(n) => TYPE_COLORS[String(n.data?.type)] ?? "#444"} />
          </ReactFlow>
        ) : (
          <div className="flex h-full items-center justify-center text-stone-500">
            {t("graph.empty")}
          </div>
        )}
      </div>

      {graph && graph.warnings.length > 0 && (
        <div className="panel max-h-40 overflow-auto p-4 text-sm text-amber-200/90">
          {graph.warnings.map((w, i) => (
            <div key={i}>• {w.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
