"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Heartbeat,
  SignIn,
  UserPlus,
  Graph,
  Brain,
  ShieldCheck,
  ChartLineUp,
  FirstAid,
  Users,
  ArrowRight,
  ArrowDown,
  GithubLogo,
  Clock,
  Waveform,
  MagnifyingGlass,
  Warning,
  List,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

interface LandingPageProps {
  signInUrl: string;
  signUpUrl: string;
}

/* ═══════════════════════════════════════════
   useInView — intersection observer hook
   ═══════════════════════════════════════════ */

function useInView<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); ob.unobserve(el); } },
      { threshold }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ═══════════════════════════════════════════
   ParticleField — canvas background
   ═══════════════════════════════════════════ */

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0, raf = 0;
    interface P { x: number; y: number; vx: number; vy: number; r: number; o: number }
    const pts: P[] = [];

    const resize = () => {
      const rect = cvs.parentElement?.getBoundingClientRect();
      w = cvs.width = rect?.width ?? window.innerWidth;
      h = cvs.height = rect?.height ?? 700;
    };

    const init = () => {
      resize();
      pts.length = 0;
      const count = Math.floor((w * h) / 20000);
      for (let i = 0; i < count; i++) {
        pts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.4 + 0.4, o: Math.random() * 0.25 + 0.04,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(160,160,180,${p.o})`; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 90) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(160,160,180,${0.05 * (1 - d / 90)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    init(); draw();
    window.addEventListener("resize", init);
    return () => { window.removeEventListener("resize", init); cancelAnimationFrame(raf); };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden />;
}

/* ═══════════════════════════════════════════
   LiveGraph — large interactive patient graph
   ═══════════════════════════════════════════ */

interface GNode {
  id: string; cx: number; cy: number; label: string; dept: string; color: string;
  risk: string; vitals: string; time: string; cost: string; meds: string; labs: string;
}

const NODES: GNode[] = [
  { id: "admission",  cx: 55,  cy: 170, label: "Admission",     dept: "Intake",       color: "var(--color-dept-ambulance)", risk: "—",    vitals: "BP 142/88 · HR 98 · SpO₂ 94%",   time: "08:12", cost: "$320",    meds: "—",                    labs: "CBC pending" },
  { id: "triage",     cx: 165, cy: 65,  label: "Triage",        dept: "Emergency",    color: "var(--color-triage-red)",     risk: "HIGH", vitals: "SpO₂ 91% · Temp 38.7°C · HR 112", time: "08:18", cost: "$180",    meds: "O₂ 4L nasal cannula",  labs: "—" },
  { id: "lab",        cx: 165, cy: 275, label: "Lab Work",      dept: "Diagnostics",  color: "var(--color-dept-radiology)", risk: "—",    vitals: "—",                                time: "08:25", cost: "$890",    meds: "—",                    labs: "Troponin 0.42 · BNP 1840 · CRP 48" },
  { id: "imaging",    cx: 310, cy: 50,  label: "CT Angio",      dept: "Radiology",    color: "var(--color-dept-radiology)", risk: "MOD",  vitals: "HR 108 · BP 138/82",               time: "08:42", cost: "$2,400",  meds: "Contrast 100mL IV",    labs: "eGFR 72 mL/min" },
  { id: "er",         cx: 310, cy: 170, label: "ER Eval",       dept: "Emergency",    color: "var(--color-dept-emergency)", risk: "HIGH", vitals: "GCS 14 · Pain 7/10 · RR 22",       time: "08:55", cost: "$1,200",  meds: "Morphine 4mg IV",      labs: "Lactate 2.8 mmol/L" },
  { id: "pharmacy",   cx: 310, cy: 280, label: "Pharmacy",      dept: "Medications",  color: "var(--color-dept-internal)",  risk: "LOW",  vitals: "—",                                time: "09:05", cost: "$640",    meds: "Heparin 5000U · ASA 325mg", labs: "INR 1.1 · aPTT 28s" },
  { id: "consult",    cx: 460, cy: 50,  label: "Cardiology",    dept: "Consult",      color: "var(--color-dept-cardiology)",risk: "HIGH", vitals: "ST elevation V2-V4",                time: "09:20", cost: "$450",    meds: "Nitroglycerin SL",     labs: "Troponin 1.24 (rising)" },
  { id: "icu",        cx: 460, cy: 130, label: "ICU",           dept: "Critical Care", color: "var(--color-dept-icu)",      risk: "CRIT", vitals: "Ventilator · MAP 68 · CVP 12",      time: "09:45", cost: "$8,200",  meds: "Norepinephrine 0.1mcg/kg", labs: "ABG: pH 7.32 pCO₂ 48" },
  { id: "surgery",    cx: 460, cy: 230, label: "Cath Lab",      dept: "Surgery",      color: "var(--color-dept-surgery)",   risk: "HIGH", vitals: "Under sedation · MAP 72",           time: "10:15", cost: "$18,500", meds: "Propofol · Heparin gtt", labs: "ACT 280s" },
  { id: "postop",     cx: 600, cy: 90,  label: "Post-Op",       dept: "Recovery",     color: "var(--color-dept-stepdown)",  risk: "MOD",  vitals: "BP 118/72 · HR 78 · SpO₂ 97%",     time: "12:30", cost: "$3,100",  meds: "Plavix 75mg · Metoprolol", labs: "Troponin 0.86 (falling)" },
  { id: "stepdown",   cx: 600, cy: 200, label: "Step-Down",     dept: "Intermediate", color: "var(--color-dept-stepdown)",  risk: "LOW",  vitals: "BP 128/76 · HR 72 · Ambulatory",    time: "Day 2", cost: "$4,800",  meds: "Dual antiplatelet",    labs: "BMP normal · Hgb 11.2" },
  { id: "ward",       cx: 600, cy: 300, label: "General Ward",  dept: "Internal Med", color: "var(--color-dept-internal)",  risk: "LOW",  vitals: "Stable · Mobilizing · Diet regular", time: "Day 3", cost: "$2,200",  meds: "Statin · ACEi · BB",   labs: "Lipid panel pending" },
  { id: "rehab",      cx: 740, cy: 140, label: "Cardiac Rehab", dept: "Rehab",        color: "var(--color-dept-orthopedics)",risk: "—",   vitals: "6MWT: 320m · NYHA II",              time: "Day 4", cost: "$1,600",  meds: "Cardiac rehab protocol", labs: "Echo: EF 48%" },
  { id: "discharge",  cx: 740, cy: 260, label: "Discharge",     dept: "Outcome",      color: "var(--color-healed)",         risk: "—",    vitals: "HEALED · LOS 6.2 days",             time: "Day 6", cost: "$44,480", meds: "ASA+Plavix+Statin+BB+ACEi", labs: "Troponin 0.04 (normal)" },
];

interface GEdge { from: number; to: number; dur: string }
const EDGES: GEdge[] = [
  { from: 0, to: 1, dur: "6m" },   { from: 0, to: 2, dur: "13m" },
  { from: 1, to: 3, dur: "24m" },  { from: 1, to: 4, dur: "37m" },
  { from: 2, to: 4, dur: "30m" },  { from: 2, to: 5, dur: "40m" },
  { from: 3, to: 6, dur: "38m" },  { from: 4, to: 7, dur: "50m" },
  { from: 4, to: 8, dur: "80m" },  { from: 5, to: 8, dur: "70m" },
  { from: 6, to: 7, dur: "25m" },  { from: 7, to: 8, dur: "30m" },
  { from: 7, to: 9, dur: "2h45m" },{ from: 8, to: 9, dur: "2h15m" },
  { from: 9, to: 10, dur: "18h" }, { from: 9, to: 11, dur: "24h" },
  { from: 10, to: 12, dur: "2d" }, { from: 11, to: 13, dur: "3d" },
  { from: 12, to: 13, dur: "2d" },
];

const RISK_COLORS: Record<string, string> = {
  "—": "rgba(160,160,180,0.5)",
  "LOW": "var(--color-risk-low)",
  "MOD": "var(--color-risk-moderate)",
  "HIGH": "var(--color-risk-high)",
  "CRIT": "var(--color-risk-critical)",
};

function curvePath(ax: number, ay: number, bx: number, by: number) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax, dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  const off = Math.min(len * 0.18, 25);
  const nx = -dy / len * off, ny = dx / len * off;
  return `M${ax},${ay} Q${mx + nx},${my + ny} ${bx},${by}`;
}

function LiveGraph({ onSelect }: { onSelect: (n: GNode | null) => void }) {
  const [hov, setHov] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeEdges, setActiveEdges] = useState<Set<number>>(new Set([0]));
  const tickRef = useRef(0);

  useEffect(() => {
    const iv = setInterval(() => {
      tickRef.current = (tickRef.current + 1) % EDGES.length;
      setActiveEdges(new Set([
        tickRef.current,
        (tickRef.current + 5) % EDGES.length,
        (tickRef.current + 11) % EDGES.length,
        (tickRef.current + 16) % EDGES.length,
      ]));
    }, 800);
    return () => clearInterval(iv);
  }, []);

  const activeNodeIds = new Set<string>();
  activeEdges.forEach((ei) => {
    activeNodeIds.add(NODES[EDGES[ei].from].id);
    activeNodeIds.add(NODES[EDGES[ei].to].id);
  });

  const handleClick = (n: GNode) => {
    const next = selected === n.id ? null : n.id;
    setSelected(next);
    onSelect(next ? n : null);
  };

  return (
    <svg viewBox="0 0 800 340" className="w-full select-none" aria-label="Interactive patient flow graph">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="glowSm"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id="ep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
          <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
        <marker id="ah" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" className="fill-foreground/15" />
        </marker>
        <marker id="ahActive" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="var(--primary)" opacity="0.5" />
        </marker>
      </defs>

      {/* Department zone labels */}
      {[
        { x: 55, label: "INTAKE" }, { x: 240, label: "ACUTE CARE" },
        { x: 460, label: "INTERVENTION" }, { x: 600, label: "RECOVERY" }, { x: 740, label: "OUTCOME" },
      ].map((z) => (
        <text key={z.label} x={z.x} y={16} textAnchor="middle" className="fill-muted-foreground/30 font-bold uppercase" style={{ fontSize: "6px", letterSpacing: "0.12em" }}>{z.label}</text>
      ))}

      {/* Edges — curved paths */}
      {EDGES.map((edge, i) => {
        const a = NODES[edge.from], b = NODES[edge.to];
        const d = curvePath(a.cx, a.cy, b.cx, b.cy);
        const isActive = activeEdges.has(i);
        const isHovEdge = hov !== null && (a.id === hov || b.id === hov);
        const isSelEdge = selected !== null && (a.id === selected || b.id === selected);
        return (
          <g key={`e${i}`}>
            <path
              d={d} fill="none"
              className={cn("transition-all duration-500",
                isSelEdge ? "stroke-primary/30" : isHovEdge ? "stroke-foreground/20" : "stroke-foreground/[0.06]"
              )}
              strokeWidth={isSelEdge ? 2 : isHovEdge ? 1.8 : 1}
              markerEnd={isActive ? "url(#ahActive)" : "url(#ah)"}
            />
            {/* Edge duration label */}
            {(isHovEdge || isSelEdge) && (
              <text className="fill-muted-foreground/60 font-mono" style={{ fontSize: "4.5px" }}>
                <textPath href={`#epath${i}`} startOffset="50%" textAnchor="middle">
                  {edge.dur}
                </textPath>
              </text>
            )}
            <path id={`epath${i}`} d={d} fill="none" stroke="none" />
            {isActive && (
              <path d={d} fill="none" stroke="url(#ep)" strokeWidth="3" strokeDasharray="10 6"
                className="animate-edge-draw" style={{ animationDuration: "0.8s" }} />
            )}
          </g>
        );
      })}

      {/* Traveling data dots */}
      {Array.from(activeEdges).map((ei) => {
        const edge = EDGES[ei];
        const a = NODES[edge.from], b = NODES[edge.to];
        const d = curvePath(a.cx, a.cy, b.cx, b.cy);
        return (
          <circle key={`dot${ei}`} r="3" fill="var(--primary)" filter="url(#glow)" opacity="0.85">
            <animateMotion dur="1s" repeatCount="indefinite" path={d} />
          </circle>
        );
      })}

      {/* Nodes */}
      {NODES.map((n) => {
        const isHovered = hov === n.id;
        const isSel = selected === n.id;
        const isActive = activeNodeIds.has(n.id);
        const baseR = 20;
        const r = isSel ? 26 : isHovered ? 25 : isActive ? 22 : baseR;

        return (
          <g
            key={n.id}
            onMouseEnter={() => setHov(n.id)}
            onMouseLeave={() => setHov(null)}
            onClick={() => handleClick(n)}
            className="cursor-pointer"
          >
            {/* Outer ring */}
            {(isHovered || isActive || isSel) && (
              <circle cx={n.cx} cy={n.cy} r={isSel ? 36 : isHovered ? 34 : 28}
                fill="none" stroke={n.color} strokeWidth={isSel ? 1.5 : 1}
                opacity={isSel ? 0.35 : isHovered ? 0.25 : 0.1}
                className="transition-all duration-500" />
            )}
            {/* Selection ring */}
            {isSel && (
              <circle cx={n.cx} cy={n.cy} r={40}
                fill="none" stroke="var(--primary)" strokeWidth="1"
                strokeDasharray="4 3" opacity="0.4" className="transition-all duration-300" />
            )}

            {/* Main circle */}
            <circle cx={n.cx} cy={n.cy} r={r}
              fill={isActive || isHovered || isSel ? n.color : "var(--card)"}
              fillOpacity={isSel ? 0.25 : isActive || isHovered ? 0.15 : 0.85}
              stroke={n.color}
              strokeWidth={isSel ? 2.5 : isHovered ? 2 : isActive ? 1.5 : 1}
              className="transition-all duration-300"
              filter={isHovered || isSel ? "url(#glowSm)" : undefined} />

            {/* Risk dot */}
            {n.risk !== "—" && (
              <circle cx={n.cx + baseR - 4} cy={n.cy - baseR + 4} r="4.5"
                fill={RISK_COLORS[n.risk]} stroke="var(--card)" strokeWidth="1.5" />
            )}

            {/* Time badge */}
            <text x={n.cx} y={n.cy + baseR + 10} textAnchor="middle"
              className="fill-muted-foreground/50 font-mono" style={{ fontSize: "4.5px" }}>
              {n.time}
            </text>

            {/* Label */}
            <text x={n.cx} y={n.cy - 2} textAnchor="middle" dominantBaseline="middle"
              className="fill-foreground font-semibold transition-all duration-300"
              style={{ fontSize: isHovered || isSel ? "7.5px" : "6.5px" }}>
              {n.label}
            </text>
            {/* Dept subtitle */}
            <text x={n.cx} y={n.cy + 7} textAnchor="middle" dominantBaseline="middle"
              className="fill-muted-foreground" style={{ fontSize: "4.5px" }}>
              {n.dept}
            </text>

            {/* Hover tooltip */}
            {isHovered && !isSel && (
              <g>
                <rect x={n.cx - 85} y={n.cy - 68} width="170" height="48" rx="6"
                  className="fill-popover stroke-border" strokeWidth="0.5"
                  style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))" }} />
                <text x={n.cx} y={n.cy - 56} textAnchor="middle" dominantBaseline="middle"
                  className="fill-foreground font-semibold" style={{ fontSize: "6px" }}>
                  {n.dept} · {n.label} · {n.cost}
                </text>
                <text x={n.cx} y={n.cy - 45} textAnchor="middle" dominantBaseline="middle"
                  className="fill-muted-foreground" style={{ fontSize: "5px" }}>
                  {n.vitals}
                </text>
                <text x={n.cx} y={n.cy - 35} textAnchor="middle" dominantBaseline="middle"
                  className="fill-muted-foreground" style={{ fontSize: "4.5px" }}>
                  {n.meds !== "—" ? `💊 ${n.meds}` : `🧪 ${n.labs}`}
                </text>
                {n.risk !== "—" && (
                  <text x={n.cx} y={n.cy - 26} textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: "5px", fill: RISK_COLORS[n.risk] }} className="font-bold">
                    ▲ Risk: {n.risk}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════
   NodeDetail — selected node detail panel
   ═══════════════════════════════════════════ */

function NodeDetail({ node }: { node: GNode }) {
  return (
    <div className="flex h-full flex-col gap-2 rounded-lg border border-border/30 bg-background/90 p-3 font-mono text-[10px] backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[9px]">
        <div className="h-2.5 w-2.5 rounded-full" style={{ background: node.color }} />
        <span className="font-semibold text-foreground">{node.label}</span>
        <span className="ml-auto text-muted-foreground">{node.time}</span>
      </div>
      <div className="text-[9px] text-muted-foreground">{node.dept}</div>
      <Separator className="opacity-30" />
      <div className="space-y-1.5">
        <div><span className="text-muted-foreground/70">Vitals:</span> <span className="text-foreground">{node.vitals !== "—" ? node.vitals : "N/A"}</span></div>
        <div><span className="text-muted-foreground/70">Meds:</span> <span className="text-foreground">{node.meds !== "—" ? node.meds : "None"}</span></div>
        <div><span className="text-muted-foreground/70">Labs:</span> <span className="text-foreground">{node.labs !== "—" ? node.labs : "Pending"}</span></div>
        <div className="flex items-center justify-between">
          <span><span className="text-muted-foreground/70">Cost:</span> <span className="font-semibold text-foreground">{node.cost}</span></span>
          {node.risk !== "—" && (
            <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ color: RISK_COLORS[node.risk], border: `1px solid ${RISK_COLORS[node.risk]}`, opacity: 0.8 }}>
              {node.risk}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SimulatedAI — fake streaming output
   ═══════════════════════════════════════════ */

const AI_LINES = [
  "▸ Analyzing patient graph topology…",
  "▸ MedGemma: Elevated troponin T (0.42 ng/mL) — STEMI probable",
  "▸ Cross-referencing 127 similar cases…",
  "▸ Risk score: 0.23 (LOW) — PCI pathway recommended",
  "▸ GPT-4o: Formatting clinical summary…",
  "▸ Pathway optimization complete ✓",
];

function SimulatedAI() {
  const [lines, setLines] = useState<string[]>([]);
  const [ci, setCi] = useState(0);
  const [li, setLi] = useState(0);
  const { ref, visible } = useInView();

  useEffect(() => {
    if (!visible) return;
    if (li >= AI_LINES.length) {
      const t = setTimeout(() => { setLines([]); setCi(0); setLi(0); }, 3500);
      return () => clearTimeout(t);
    }
    const full = AI_LINES[li];
    if (ci <= full.length) {
      const t = setTimeout(() => {
        setLines((p) => { const c = [...p]; c[li] = full.slice(0, ci); return c; });
        setCi((c) => c + 1);
      }, ci === 0 ? 350 : 16);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLi((l) => l + 1);
      setCi(0);
    }, 0);
    return () => clearTimeout(t);
  }, [visible, ci, li, lines.length]);

  return (
    <div ref={ref} className="h-full rounded-lg border border-border/30 bg-background/90 p-3 font-mono text-[10px] leading-relaxed backdrop-blur-sm">
      <div className="mb-1.5 flex items-center gap-1.5 text-[9px] text-primary">
        <Brain size={10} weight="fill" />
        <span className="font-semibold">AI Analysis Stream</span>
        <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>
      <div className="space-y-0.5">
        {lines.map((l, i) => (
          <div key={i} className={cn("text-muted-foreground", i === lines.length - 1 && "text-foreground")}>
            {l}
            {i === li && <span className="animate-pulse text-primary">▌</span>}
          </div>
        ))}
        {lines.length === 0 && <div className="text-muted-foreground/40">Waiting for input…</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LiveMetric — flashing stat card
   ═══════════════════════════════════════════ */

function LiveMetric({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => { setFlash(true); setTimeout(() => setFlash(false), 600); }, 3000 + Math.random() * 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className={cn("rounded-xl border bg-card/50 p-3 transition-all duration-500", flash ? "border-primary/30 shadow-md shadow-primary/5" : "border-border/40")}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <Icon size={14} weight="duotone" className={color} />
      </div>
      <p className={cn("mt-1 text-lg font-bold transition-colors duration-300", flash && "text-primary")}>{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FeatureCard — 3D tilt on hover
   ═══════════════════════════════════════════ */

function FeatureCard({ icon: Icon, title, description, accentClass = "text-primary" }: { icon: React.ElementType; title: string; description: string; accentClass?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientX - r.left) / r.width - 0.5) * 8;
    const ry = ((e.clientY - r.top) / r.height - 0.5) * -8;
    el.style.transform = `perspective(600px) rotateY(${rx}deg) rotateX(${ry}deg) scale(1.02)`;
  }, []);
  const handleLeave = useCallback(() => {
    if (cardRef.current) cardRef.current.style.transform = "perspective(600px) rotateY(0) rotateX(0) scale(1)";
  }, []);

  return (
    <Card ref={cardRef} onMouseMove={handleMove} onMouseLeave={handleLeave} className="group relative overflow-hidden border-transparent bg-card/50 backdrop-blur-sm ring-1 ring-foreground/[0.06] transition-all duration-300 will-change-transform hover:ring-primary/20 hover:shadow-xl hover:shadow-primary/5">
      <CardContent className="relative p-6">
        <div className={cn("mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15", accentClass)}>
          <Icon size={22} weight="duotone" />
        </div>
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   StepCard — with connector
   ═══════════════════════════════════════════ */

function StepCard({ step, title, description, icon: Icon, isLast = false }: { step: number; title: string; description: string; icon: React.ElementType; isLast?: boolean }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="relative mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 hover:scale-110 hover:bg-primary/20 hover:shadow-lg hover:shadow-primary/10">
          <Icon size={28} weight="duotone" />
        </div>
        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-md">{step}</span>
      </div>
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      {!isLast && (
        <div className="pointer-events-none absolute top-7 left-[calc(50%+40px)] hidden h-px w-[calc(100%-60px)] lg:block">
          <div className="h-full w-full bg-gradient-to-r from-primary/30 via-primary/10 to-transparent" />
          <ArrowRight size={10} weight="bold" className="absolute -top-[5px] right-0 text-primary/30" />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Smooth scroll helper
   ═══════════════════════════════════════════ */

function scrollTo(id: string) {
  return (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export function LandingPage({ signInUrl, signUpUrl }: LandingPageProps) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    const fn = () => setScrolled(c.scrollTop > 10);
    c.addEventListener("scroll", fn, { passive: true });
    return () => c.removeEventListener("scroll", fn);
  }, []);

  return (
    <div ref={scrollRef} className="relative h-full overflow-x-hidden overflow-y-auto scroll-smooth bg-background font-mono">

      {/* ──── Navbar ──── */}
      <nav className={cn("sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl transition-all duration-300", scrolled ? "border-border/60 shadow-sm" : "border-transparent")}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heartbeat size={18} weight="bold" />
            </div>
            <span className="text-sm font-bold tracking-tight">MedGraph AI</span>
          </div>
          <div className="hidden items-center gap-6 text-xs text-muted-foreground sm:flex">
            <a href="#features" onClick={scrollTo("features")} className="transition-colors hover:text-foreground">Features</a>
            <a href="#how-it-works" onClick={scrollTo("how-it-works")} className="transition-colors hover:text-foreground">How It Works</a>
            <a href="#tech" onClick={scrollTo("tech")} className="transition-colors hover:text-foreground">Technology</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex"><a href={signInUrl}>Sign In</a></Button>
            <Button size="sm" asChild className="hidden sm:inline-flex"><a href={signUpUrl}>Get Started <ArrowRight size={14} weight="bold" /></a></Button>
            <Button variant="ghost" size="icon-sm" className="sm:hidden" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X size={18} /> : <List size={18} />}
            </Button>
          </div>
        </div>
        {mobileMenu && (
          <div className="border-t border-border/40 bg-background/95 px-4 py-3 backdrop-blur-xl sm:hidden">
            <div className="flex flex-col gap-2 text-sm">
              <a href="#features" onClick={(e) => { scrollTo("features")(e); setMobileMenu(false); }} className="py-1.5 text-muted-foreground hover:text-foreground">Features</a>
              <a href="#how-it-works" onClick={(e) => { scrollTo("how-it-works")(e); setMobileMenu(false); }} className="py-1.5 text-muted-foreground hover:text-foreground">How It Works</a>
              <a href="#tech" onClick={(e) => { scrollTo("tech")(e); setMobileMenu(false); }} className="py-1.5 text-muted-foreground hover:text-foreground">Technology</a>
              <Separator className="my-1" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1"><a href={signInUrl}>Sign In</a></Button>
                <Button size="sm" asChild className="flex-1"><a href={signUpUrl}>Get Started</a></Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ──── Hero ──── */}
      <section className="relative overflow-hidden">
        <ParticleField />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[600px] w-[600px] rounded-full bg-primary/[0.04] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-20">
          <div className="flex flex-col items-center text-center">
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              <span className="bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                Clinical Intelligence
              </span>
              <br />
              <span className="text-foreground">for Modern Hospitals</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Graph-based patient modeling meets dual-AI analysis.
              Transform every clinical decision point into actionable insight — from triage to discharge.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="gap-2 shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30">
                <a href={signUpUrl}><UserPlus size={18} weight="bold" />Create Free Account</a>
              </Button>
              <Button variant="outline" size="lg" asChild className="gap-2">
                <a href={signInUrl}><SignIn size={18} />Sign In to Dashboard</a>
              </Button>
            </div>
          </div>

          {/* ── Hero dashboard mock ── */}
          <div className="relative mx-auto mt-14 w-full">
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 p-1 shadow-2xl shadow-primary/5 ring-1 ring-foreground/[0.04] backdrop-blur-sm">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 rounded-t-xl border-b border-border/40 bg-muted/40 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
                </div>
                <div className="ml-3 flex-1 rounded-md bg-background/60 px-3 py-1 text-[10px] text-muted-foreground">medgraph.vulniq.org/dashboard/patients/P-0042</div>
              </div>

              <div className="rounded-b-xl bg-background/80 p-4 sm:p-6">
                {/* Live stat cards */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  <LiveMetric label="Active Patients" value="127" icon={Users} color="text-primary" />
                  <LiveMetric label="Avg. Stay" value="4.2d" icon={Clock} color="text-chart-2" />
                  <LiveMetric label="Decision Quality" value="94%" icon={ShieldCheck} color="text-emerald-500" />
                  <LiveMetric label="AI Alerts" value="12" icon={Warning} color="text-amber-500" />
                </div>

                {/* Full-width graph */}
                <div className="mt-4 rounded-xl border border-border/30 bg-muted/10 p-2 sm:p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                    <Graph size={10} weight="fill" className="text-primary" />
                    <span className="font-medium">Patient Flow Graph — STEMI Case P-0042</span>
                    <span className="ml-auto text-[8px]">14 nodes · 19 edges · click a node for details</span>
                  </div>
                  <LiveGraph onSelect={setSelectedNode} />
                </div>

                {/* Bottom row: Node detail + AI stream */}
                <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2">
                  <div className="min-h-[140px]">
                    {selectedNode ? (
                      <NodeDetail node={selectedNode} />
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border/30 bg-muted/5 p-4 text-[10px] text-muted-foreground/40">
                        <span>Click a node above to inspect clinical details</span>
                      </div>
                    )}
                  </div>
                  <SimulatedAI />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 -z-10 translate-y-4 scale-95 rounded-3xl bg-primary/[0.06] blur-2xl" />
          </div>

          {/* Scroll hint */}
          <div className="mt-8 flex justify-center">
            <button onClick={scrollTo("features")} className="flex flex-col items-center gap-1 text-muted-foreground/50 transition-colors hover:text-muted-foreground">
              <span className="text-[9px] uppercase tracking-widest">Explore</span>
              <ArrowDown size={14} weight="bold" className="animate-bounce" />
            </button>
          </div>
        </div>
      </section>

      <Separator className="mx-auto max-w-6xl opacity-40" />

      {/* ──── Features ──── */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything You Need for Clinical Intelligence</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">From patient admission to discharge — every decision point modeled, analyzed, and optimized by AI.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={Graph} title="Graph-Based Patient Modeling" description="Each patient journey is a directed graph. Nodes are clinical decision points, edges are temporal transitions — giving a complete topological view of care." />
          <FeatureCard icon={Brain} title="Dual-AI Analysis Pipeline" description="MedGemma handles structured clinical reasoning; GPT-4o streams polished, presentation-ready insights. Two models, one seamless experience." accentClass="text-chart-2" />
          <FeatureCard icon={MagnifyingGlass} title="Cross-Case Pattern Analysis" description="Client-side similarity scoring, graph alignment, and divergence detection across your entire patient cohort — no API call needed." accentClass="text-chart-3" />
          <FeatureCard icon={Warning} title="Real-Time Risk Assessment" description="Multi-level severity flags (INFO → WARNING → CRITICAL) with pulsing alerts, risk gauges, and historical pattern matching." accentClass="text-amber-500" />
          <FeatureCard icon={ChartLineUp} title="Cost & Outcome Tracking" description="Track per-node costs, total care expenditure, and outcome correlations. Visualize department load and resource allocation at a glance." accentClass="text-emerald-500" />
          <FeatureCard icon={Waveform} title="AI-Powered Explanations" description="Click any node, decision, or alert to get streaming AI explanations — clinical context built automatically, rendered as live markdown." accentClass="text-chart-4" />
        </div>
      </section>

      {/* ──── How It Works ──── */}
      <section id="how-it-works" className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">From Data to Decision in Seconds</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">A streamlined pipeline that turns raw patient data into clinically actionable intelligence.</p>
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard step={1} icon={FirstAid} title="Patient Ingestion" description="Structured patient flow data enters the system — demographics, vitals, labs, medications, and clinical notes." />
            <StepCard step={2} icon={Graph} title="Graph Construction" description="Each patient is modeled as a directed graph with ~24 decision nodes — from triage through departments to discharge." />
            <StepCard step={3} icon={Brain} title="Dual-AI Analysis" description="MedGemma performs clinical reasoning. OpenAI streams the results as polished, user-friendly markdown insights." />
            <StepCard step={4} icon={ChartLineUp} title="Actionable Insights" description="Risk heatmaps, cross-case patterns, cost breakdowns, and pathway optimization — all at your fingertips." isLast />
          </div>
        </div>
      </section>

      {/* ──── Tech Stack ──── */}
      <section id="tech" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built on a Modern Stack</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">Enterprise-grade technologies carefully chosen for performance, security, and developer experience.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Next.js 16", desc: "App Router + Turbopack", category: "Framework" },
            { name: "React 19", desc: "Server & Client Components", category: "UI Library" },
            { name: "Tailwind CSS v4", desc: "Utility-first with CSS vars", category: "Styling" },
            { name: "shadcn/ui", desc: "Radix-maia style primitives", category: "Components" },
            { name: "MedGemma 27B", desc: "Clinical reasoning via HF", category: "AI — Phase 1" },
            { name: "GPT-4o-mini", desc: "Streaming presentation", category: "AI — Phase 2" },
            { name: "WorkOS AuthKit", desc: "Enterprise-ready auth", category: "Authentication" },
            { name: "AWS ECS + Fargate", desc: "Containerized deployment", category: "Infrastructure" },
          ].map((t) => (
            <div key={t.name} className="group rounded-xl border border-border/40 bg-card/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:bg-card/70 hover:shadow-md hover:shadow-primary/5">
              <span className="text-[9px] font-medium uppercase tracking-widest text-primary/70">{t.category}</span>
              <p className="mt-1 text-sm font-semibold">{t.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="mx-auto max-w-6xl opacity-40" />

      {/* ──── CTA ──── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-300 hover:scale-110">
              <Heartbeat size={30} weight="bold" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to Transform Clinical Decisions?</h2>
            <p className="mt-3 text-sm text-muted-foreground">Join the platform that brings graph intelligence and dual-AI analysis to every patient journey.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="gap-2 shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/30">
                <a href={signUpUrl}><UserPlus size={18} weight="bold" />Get Started Free</a>
              </Button>
              <Button variant="outline" size="lg" asChild className="gap-2">
                <a href={signInUrl}><SignIn size={18} />Sign In</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ──── Footer ──── */}
      <footer className="border-t border-border/40 bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground"><Heartbeat size={14} weight="bold" /></div>
            <span className="text-xs font-semibold">MedGraph AI</span>
          </div>
          <p className="text-center text-[10px] text-muted-foreground">Hospital Intelligence Platform · Secured by WorkOS AuthKit</p>
          <div className="flex items-center gap-3">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-foreground"><GithubLogo size={16} weight="bold" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
