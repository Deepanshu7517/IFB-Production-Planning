import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Edit3,
  X,
  Save,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Factory,
  Layers,
  Calendar,
  Package,
  AlertCircle,
  CheckCircle2,
  Zap,
  GitBranch,
  Box,
} from "lucide-react";
import { API_BASE } from "../../../config/api";

// ─── API Config ───────────────────────────────────────────────────────────────
// (API_BASE is imported at top from config/api.ts)

// ─── Types ────────────────────────────────────────────────────────────────────
interface DailyEntry {
  date: string;
  planned: number;
  actual: number | null;
  backlog: number;
  notes: string;
  shift: string;
  _id?: string;
}
interface ProductionPlan {
  _id: string;
  week: string;
  year: number;
  model: {
    modelId: string;
    modelName: string;
    assemblyLine: {
      assemblyLineId: string;
      assemblyLineName: string;
      capacity?: number;
      plant: { plantId: string; plantName: string };
    };
  };
  bom: { partNumber: string; partName: string; price: number };
  capacity: number;
  workingDays: number;
  status: string;
  notes: string;
  dailyEntries: DailyEntry[];
}
interface HierarchyStats {
  capacity: number;
  planned: number;
  actual: number;
  backlog: number;
  adherence: number;
  plansCount: number;
}
interface HierarchyPlan {
  planId: string;
  status: string;
  partNumber: string;
  partName: string;
  capacity: number;      // raw per-shift per-day rate from backend
  shift?: string | string[] | null; // needed to compute weekly capacity
  workingDays: number;
  totalPlanned: number;
  totalActual: number;
  adherence: number;
  deficit: number;
  daysEntered: number;
  daysRemaining: number;
  aheadDays: number;
  onTrackDays: number;
  behindDays: number;
}
interface HierarchyModel {
  modelId: string;
  modelName: string;
  stats: HierarchyStats;
  plans: HierarchyPlan[];
}
interface HierarchyLine {
  assemblyLineId: string;
  assemblyLineName: string;
  stats: HierarchyStats;
  models: HierarchyModel[];
  plans: HierarchyPlan[];  // flattened, used for day-count aggregation
}
interface HierarchyPlant {
  plantId: string;
  plantName: string;
  stats: HierarchyStats;
  assemblyLines: HierarchyLine[];
  plans: HierarchyPlan[];  // flattened, used for day-count aggregation
}
interface ChartDay {
  date: string;
  dayName: string;
  basePlanned: number;
  adjustedPlanned: number;
  actual: number;
  hasActual: boolean;
  backlog: number;
  cumulativeBacklog: number;
  performanceStatus: "ahead" | "on-track" | "behind" | "pending";
  shift?: string | null;
  notes?: string;
}
interface DashboardSummary {
  totalPlanned: number;
  totalActual: number;
  adherence: number;
  deficit: number;
  totalCapacity: number;
  plansCount: number;
  daysEntered: number;
  daysRemaining: number;
  statusCounts: {
    PLANNED: number;
    IN_PROGRESS: number;
    COMPLETED: number;
    CANCELLED: number;
  };
  aheadDays: number;
  onTrackDays: number;
  behindDays: number;
  pendingDays: number;
}
function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function weekdayShort(dateKey: string): string {
  return parseLocalDateKey(dateKey).toLocaleDateString("en-IN", {
    weekday: "short",
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dn = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dn);
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - y.getTime()) / 86400000 + 1) / 7);
}
const fmt = (n: number | null | undefined, fallback = "—") =>
  n === null || n === undefined ? fallback : n.toLocaleString();

/**
 * Computes the TOTAL WEEKLY capacity the same way production-calendar.tsx does:
 *   capacity (per-shift per-day rate) × number_of_shifts × working_days
 *
 * Used ONLY for display — never for adherence/deficit calculations.
 */
function calcWeeklyCapacity(
  rawCapacity: number,
  shift: string | string[] | null | undefined,
  workingDays: number,
): number {
  let shiftCount = 1;
  if (Array.isArray(shift)) {
    shiftCount = shift.length || 1;
  } else if (typeof shift === "string" && shift.trim()) {
    shiftCount = shift.split(",").filter((s) => s.trim()).length || 1;
  }
  return rawCapacity * shiftCount * (workingDays || 1);
}

// ─── AdherenceRing ────────────────────────────────────────────────────────────
const AdherenceRing = ({
  value,
  size = 80,
}: {
  value: number;
  size?: number;
}) => {
  const color = value >= 90 ? "#10b981" : value >= 70 ? "#f59e0b" : "#ef4444";
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = (circ * Math.min(value, 100)) / 100;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={6}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-black text-slate-800 leading-none">
          {value}%
        </span>
        <span className="text-[8px] text-slate-400 font-medium">ADH</span>
      </div>
    </div>
  );
};

// ─── StatsBar ────────────────────────────────────────────────────────────────
const StatsBar = ({
  planned,
  actual,
  backlog,
  adherence,
  capacity,
}: {
  planned: number;
  actual: number;
  backlog: number;
  adherence: number;
  capacity: number;
}) => {
  const pct = Math.min(100, capacity > 0 ? (actual / capacity) * 100 : 0);
  const color =
    adherence >= 90 ? "#10b981" : adherence >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
        <span>
          Planned <strong className="text-slate-600">{fmt(planned)}</strong>
        </span>
        <span style={{ color }}>
          <strong>{fmt(actual)}</strong> actual
        </span>
        {backlog > 0 && (
          <span className="text-red-500">+{fmt(backlog)} backlog</span>
        )}
        {backlog < 0 && (
          <span className="text-emerald-500">
            {fmt(Math.abs(backlog))} surplus
          </span>
        )}
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    PLANNED: "bg-slate-100 text-slate-500",
    IN_PROGRESS: "bg-blue-50 text-blue-600",
    COMPLETED: "bg-emerald-50 text-emerald-600",
    CANCELLED: "bg-red-50 text-red-500",
  };
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${map[status] ?? map.PLANNED}`}
    >
      {status?.replace("_", " ")}
    </span>
  );
};

// ─── HierarchyCard ────────────────────────────────────────────────────────────
const HierarchyCard = ({
  icon,
  title,
  subtitle,
  stats,
  isSelected,
  onClick,
  aheadDays,
  behindDays,
  pendingDays,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  stats: HierarchyStats;
  isSelected?: boolean;
  onClick?: () => void;
  aheadDays?: number;
  behindDays?: number;
  pendingDays?: number;
}) => (
  <div
    onClick={onClick}
    className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-200 select-none group
      ${isSelected ? "border-zinc-800 bg-zinc-900 shadow-xl" : "border-slate-200 bg-white hover:border-zinc-400 hover:shadow-md"}`}
  >
    <div className="flex items-start gap-3 mb-3">
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className={`text-[10px] ${isSelected ? "text-zinc-500" : "text-slate-400"}`}
          >
            {subtitle}
          </p>
        )}
        <p
          className={`text-[10px] font-medium mt-0.5 ${isSelected ? "text-zinc-500" : "text-slate-400"}`}
        >
          {stats.plansCount} plan{stats.plansCount !== 1 ? "s" : ""} · Cap{" "}
          {fmt(stats.capacity)}
        </p>
      </div>
      <span
        className={`text-xs font-black ${stats.adherence >= 90 ? (isSelected ? "text-emerald-400" : "text-emerald-600") : stats.adherence >= 70 ? (isSelected ? "text-amber-400" : "text-amber-500") : isSelected ? "text-red-400" : "text-red-500"}`}
      >
        {stats.adherence}%
      </span>
    </div>
    <div className="space-y-1">
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: isSelected ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, stats.planned > 0 ? (stats.actual / stats.planned) * 100 : 0)}%`,
            background:
              stats.adherence >= 90
                ? "#10b981"
                : stats.adherence >= 70
                  ? "#f59e0b"
                  : "#ef4444",
          }}
        />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className={isSelected ? "text-zinc-500" : "text-slate-400"}>
          {fmt(stats.actual)} / {fmt(stats.planned)}
        </span>
        {stats.backlog > 0 && (
          <span
            className={`font-bold ${isSelected ? "text-red-400" : "text-red-500"}`}
          >
            +{fmt(stats.backlog)} backlog
          </span>
        )}
        {stats.backlog < 0 && (
          <span
            className={`font-bold ${isSelected ? "text-emerald-400" : "text-emerald-500"}`}
          >
            {fmt(Math.abs(stats.backlog))} surplus
          </span>
        )}
      </div>
      {/* Day performance chips */}
      {(aheadDays !== undefined || behindDays !== undefined || pendingDays !== undefined) && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {(aheadDays ?? 0) > 0 && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
              isSelected ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-50 text-emerald-600"
            }`}>↑ {aheadDays} ahead</span>
          )}
          {(behindDays ?? 0) > 0 && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
              isSelected ? "bg-red-500/20 text-red-300" : "bg-red-50 text-red-600"
            }`}>↓ {behindDays} behind</span>
          )}
          {(pendingDays ?? 0) > 0 && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
              isSelected ? "bg-amber-500/20 text-amber-300" : "bg-amber-50 text-amber-700"
            }`}>⏳ {pendingDays} pending</span>
          )}
        </div>
      )}
    </div>
  </div>
);

// ─── PlanCard ─────────────────────────────────────────────────────────────────
const PlanCard = ({
  plan,
  isSelected,
  onClick,
}: {
  plan: HierarchyPlan;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className={`rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${isSelected ? "border-zinc-800 bg-zinc-900 shadow-xl" : "border-slate-200 bg-white hover:border-zinc-400 hover:shadow-md"}`}
  >
    <div className="flex justify-between items-start mb-3 gap-2">
      <div className="min-w-0">
        <p
          className={`text-[10px] font-mono ${isSelected ? "text-zinc-400" : "text-slate-400"}`}
        >
          {plan.partNumber}
        </p>
        <p
          className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}
        >
          {plan.partName}
        </p>
      </div>
      <StatusBadge status={plan.status} />
    </div>
    <div className="grid grid-cols-3 gap-1.5 mb-3">
      {[
        { l: "Weekly Cap", v: fmt(calcWeeklyCapacity(plan.capacity, plan.shift, plan.workingDays)) },
        { l: "Actual", v: fmt(plan.totalActual) },
        { l: "Deficit", v: fmt(plan.deficit), red: plan.deficit > 0 },
      ].map(({ l, v, red }) => (
        <div
          key={l}
          className={`rounded-lg p-2 text-center ${isSelected ? "bg-white/5" : "bg-slate-50"}`}
        >
          <p
            className={`text-[9px] font-medium ${isSelected ? "text-zinc-500" : "text-slate-400"}`}
          >
            {l}
          </p>
          <p
            className={`text-xs font-black ${red ? "text-red-500" : isSelected ? "text-white" : "text-slate-700"}`}
          >
            {v}
          </p>
        </div>
      ))}
    </div>
    <div className="flex justify-between items-center mb-1.5">
      <span
        className={`text-[10px] ${isSelected ? "text-zinc-500" : "text-slate-400"}`}
      >
        {plan.daysEntered}/{plan.workingDays} days
      </span>
      <span
        className={`text-xs font-black ${plan.adherence >= 90 ? (isSelected ? "text-emerald-400" : "text-emerald-600") : plan.adherence > 0 ? (isSelected ? "text-amber-400" : "text-amber-500") : isSelected ? "text-zinc-600" : "text-slate-300"}`}
      >
        {plan.adherence}%
      </span>
    </div>
    <div
      className="h-1 rounded-full overflow-hidden"
      style={{ background: isSelected ? "rgba(255,255,255,0.1)" : "#f1f5f9" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, plan.capacity > 0 ? (plan.totalActual / plan.capacity) * 100 : 0)}%`,
          background:
            plan.adherence >= 90
              ? "#10b981"
              : plan.adherence >= 70
                ? "#f59e0b"
                : "#ef4444",
        }}
      />
    </div>
    {/* Day performance chips */}
    {(plan.aheadDays > 0 || plan.behindDays > 0 || plan.onTrackDays > 0) && (
      <div className="flex gap-1 mt-2 flex-wrap">
        {plan.aheadDays > 0 && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
            isSelected ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-50 text-emerald-600"
          }`}>↑ {plan.aheadDays} ahead</span>
        )}
        {plan.onTrackDays > 0 && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
            isSelected ? "bg-blue-500/20 text-blue-300" : "bg-blue-50 text-blue-600"
          }`}>→ {plan.onTrackDays} on track</span>
        )}
        {plan.behindDays > 0 && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
            isSelected ? "bg-red-500/20 text-red-300" : "bg-red-50 text-red-600"
          }`}>↓ {plan.behindDays} behind</span>
        )}
      </div>
    )}
  </div>
);

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-200 text-xs min-w-[180px]">
      <p className="font-bold text-slate-800 mb-2">
        {label} <span className="text-slate-400 font-normal">{d.date}</span>
      </p>
      <div className="space-y-1">
        <p className="text-purple-600 font-semibold">
          Planned: {fmt(d.adjustedPlanned)}
        </p>
        <p className="text-blue-600 font-semibold">
          Actual: {d.hasActual ? fmt(d.actual) : "—"}
        </p>
        {d.hasActual && d.backlog > 0 && (
          <p className="text-red-500 font-semibold">
            Backlog: +{fmt(d.backlog)}
          </p>
        )}
        {d.hasActual && d.backlog < 0 && (
          <p className="text-emerald-500 font-semibold">
            Surplus: {fmt(Math.abs(d.backlog))}
          </p>
        )}
        {d.shift && (
          <p className="text-slate-400 text-[10px] pt-1 border-t border-slate-100 mt-1">
            Shift: {d.shift}
          </p>
        )}
        {d.notes && (
          <p className="text-slate-500 text-[10px] italic">{d.notes}</p>
        )}
      </div>
    </div>
  );
};

// ─── Entry Modal ──────────────────────────────────────────────────────────────
const EntryModal = ({
  entry,
  plan,
  onSave,
  onClose,
}: {
  entry: ChartDay;
  plan: ProductionPlan;
  onSave: (date: string, actual: number, notes: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [actual, setActual] = useState(
    entry.actual > 0 ? entry.actual.toString() : "",
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const parsed = actual !== "" ? parseInt(actual) : null;
  const diff = parsed !== null ? parsed - entry.basePlanned : null;
  const pct =
    parsed !== null && entry.basePlanned > 0
      ? ((parsed / entry.basePlanned) * 100).toFixed(1)
      : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest">
              {plan.week} · {plan.model?.assemblyLine?.plant?.plantName} ·{" "}
              {plan.model?.assemblyLine?.assemblyLineName}
            </span>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10"
            >
              <X size={15} />
            </button>
          </div>
          <h2 className="text-white text-2xl font-black">
            {entry.dayName}, {entry.date}
          </h2>
          <p className="text-zinc-400 text-sm mt-1 truncate">
            {plan.bom?.partNumber} · {plan.bom?.partName}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between bg-zinc-50 rounded-2xl px-5 py-3 border border-zinc-100">
            <div>
              <span className="text-sm font-semibold text-zinc-500">
                Daily Target
              </span>
              {entry.adjustedPlanned !== entry.basePlanned && (
                <p className="text-[11px] text-amber-600 font-medium">
                  Base {fmt(entry.basePlanned)} +{" "}
                  {fmt(entry.adjustedPlanned - entry.basePlanned)} backlog
                </p>
              )}
            </div>
            <span className="text-xl font-black text-zinc-800">
              {fmt(entry.adjustedPlanned)}{" "}
              <span className="text-sm font-normal text-zinc-400">units</span>
            </span>
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">
              Actual Production <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              autoFocus
              min="0"
              placeholder="Enter units produced"
              className="w-full px-4 py-3.5 text-xl font-black border-2 border-zinc-200 rounded-2xl focus:border-zinc-800 focus:outline-none"
            />
            {diff !== null && parsed !== null && (
              <div
                className={`mt-2 flex items-center gap-1.5 text-sm font-bold ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {diff >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                {diff >= 0 ? `+${fmt(diff)}` : fmt(diff)} vs target · {pct}%
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-700 mb-2">
              Remarks{" "}
              <span className="text-zinc-400 font-normal text-xs">
                (optional)
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Delays, overtime, stoppages..."
              className="w-full px-4 py-3 text-sm border-2 border-zinc-200 rounded-2xl focus:border-zinc-800 focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-zinc-200 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-50 text-sm"
            >
              Cancel
            </button>
            <button
              disabled={!actual || parseInt(actual) < 0 || saving}
              onClick={async () => {
                if (parsed === null) return;
                setSaving(true);
                await onSave(entry.date, parsed, notes);
                setSaving(false);
              }}
              className="flex-1 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-700 flex items-center justify-center gap-2 disabled:opacity-40 text-sm"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <Save size={15} />
              )}
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PlanDetailHeader ────────────────────────────────────────────────────────
// Shown at the top of the right panel when a single plan is selected.
// Displays identity (part #, name, plant, line, model, week) + key stats.
const PlanDetailHeader = ({
  plan,
  hierarchyPlan,
}: {
  plan: ProductionPlan;
  hierarchyPlan?: any;
}) => (
  <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800">
    <div className="flex flex-wrap items-start gap-4">
      {/* Identity */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono text-zinc-400 tracking-widest uppercase">
          {plan.bom?.partNumber}
        </p>
        <p className="text-white font-black text-base truncate">{plan.bom?.partName}</p>
        <p className="text-zinc-500 text-[10px] mt-0.5">
          {plan.model?.assemblyLine?.plant?.plantName} ·{" "}
          {plan.model?.assemblyLine?.assemblyLineName} · {plan.model?.modelName}
        </p>
      </div>
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 shrink-0 items-center">
        <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-white/10 text-white">
          {plan.week}
        </span>
        <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-white/10 text-zinc-300">
          {plan.workingDays} Working Days
        </span>
        <StatusBadge status={plan.status} />
      </div>
    </div>
    {/* Key metric strip */}
    {hierarchyPlan && (
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-zinc-800">
        {[
          { l: "Total Planned", v: fmt(hierarchyPlan.totalPlanned), c: "text-zinc-300" },
          { l: "Total Actual",  v: fmt(hierarchyPlan.totalActual),  c: "text-white font-black" },
          {
            l: "Deficit",
            v: hierarchyPlan.deficit > 0 ? `+${fmt(hierarchyPlan.deficit)}` : "—",
            c: hierarchyPlan.deficit > 0 ? "text-red-400" : "text-emerald-400",
          },
          {
            l: "Adherence",
            v: `${hierarchyPlan.adherence}%`,
            c: hierarchyPlan.adherence >= 90 ? "text-emerald-400" : hierarchyPlan.adherence >= 70 ? "text-amber-400" : "text-red-400",
          },
          { l: "Days Entered",   v: `${hierarchyPlan.daysEntered} / ${hierarchyPlan.workingDays}`, c: "text-zinc-300" },
          { l: "Days Remaining", v: String(hierarchyPlan.daysRemaining), c: hierarchyPlan.daysRemaining > 0 ? "text-amber-400" : "text-emerald-400" },
          {
            l: "Weekly Cap",
            v: fmt(calcWeeklyCapacity(hierarchyPlan.capacity, hierarchyPlan.shift, hierarchyPlan.workingDays)),
            c: "text-zinc-400",
          },
        ].map(({ l, v, c }) => (
          <div key={l} className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wider">{l}</span>
            <span className={`text-sm font-bold ${c}`}>{v}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── BomSection ───────────────────────────────────────────────────────────────
// Collapsible panel showing child BOM parts when viewing a single plan.
const BomSection = ({ plan }: { plan: ProductionPlan }) => {
  const [open, setOpen] = React.useState(false);
  const parts: any[] = (plan.bom as any)?.childPartList ?? [];
  if (parts.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-6 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100"
      >
        <div className="w-1 h-5 bg-amber-400 rounded-full" />
        <h3 className="text-sm font-black text-slate-800 flex-1">
          BOM — Child Parts
          <span className="ml-2 text-[10px] font-normal text-slate-400">
            {parts.length} component{parts.length !== 1 ? "s" : ""}
          </span>
        </h3>
        <span className="text-slate-400 text-xs font-medium">{open ? "▲ Hide" : "▼ Show"}</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-xs min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                {["#", "Part Code", "Description", "Qty", "Unit"].map((h) => (
                  <th key={h} className="py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parts.map((part: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="text-slate-400 font-mono text-[10px]">{i + 1}</td>
                  <td className="font-mono font-bold text-slate-700">{part.partCode ?? part.code ?? "—"}</td>
                  <td className="text-slate-600">{part.description ?? part.name ?? "—"}</td>
                  <td className="font-black text-slate-800">{part.qty ?? part.quantity ?? "—"}</td>
                  <td className="text-slate-500">{part.unit ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── PlanBreakdownTable ───────────────────────────────────────────────────────
// Sortable table showing every plan in the current filter scope.
// Click a row to drill into that plan.
const BREAKDOWN_SORT_COLS = [
  { key: "totalPlanned", label: "Planned" },
  { key: "totalActual",  label: "Actual" },
  { key: "adherence",    label: "Adh %" },
  { key: "deficit",      label: "Deficit" },
  { key: "daysEntered", label: "Days In" },
] as const;

const PlanBreakdownTable = ({
  breakdown,
  sort,
  onSort,
  onPlanClick,
}: {
  breakdown: any[];
  sort: { col: string; dir: "asc" | "desc" };
  onSort: (s: { col: string; dir: "asc" | "desc" }) => void;
  onPlanClick: (planId: string) => void;
}) => {
  const sorted = useMemo(() => {
    const arr = [...breakdown];
    arr.sort((a, b) => {
      const av = a[sort.col] ?? 0;
      const bv = b[sort.col] ?? 0;
      if (typeof av === "string") return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sort.dir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [breakdown, sort]);

  const toggle = (col: string) =>
    onSort({ col, dir: sort.col === col && sort.dir === "desc" ? "asc" : "desc" });

  return (
    <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
        <div className="w-1 h-5 bg-violet-500 rounded-full" />
        <h3 className="text-sm font-black text-slate-800 flex-1">
          All Plans
          <span className="ml-2 text-[10px] font-normal text-slate-400">
            {breakdown.length} plan{breakdown.length !== 1 ? "s" : ""} in current view
          </span>
        </h3>
        <span className="text-[10px] text-slate-400 hidden md:block">
          Click column to sort · Click row to drill in
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="table w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
              <th className="py-3 font-bold text-left px-4">Part / Model</th>
              <th className="py-3 font-bold text-left px-4">Plant · Line</th>
              <th className="py-3 font-bold text-left px-4">Week</th>
              <th className="py-3 font-bold text-left px-4">Status</th>
              <th className="py-3 font-bold text-left px-4">Shift</th>
              {BREAKDOWN_SORT_COLS.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => toggle(key)}
                  className={`py-3 font-bold text-right px-4 cursor-pointer select-none hover:text-slate-700 transition-colors ${
                    sort.col === key ? "text-violet-600" : ""
                  }`}
                >
                  {label}{" "}
                  {sort.col === key ? (sort.dir === "desc" ? "↓" : "↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p: any, i: number) => (
              <tr
                key={p.planId ?? i}
                onClick={() => onPlanClick(p.planId)}
                className="border-b border-slate-50 hover:bg-violet-50/40 cursor-pointer transition-colors group"
              >
                <td className="py-2.5 px-4">
                  <p className="font-mono text-[10px] text-slate-400">{p.partNumber}</p>
                  <p className="font-bold text-slate-800 max-w-[200px] truncate group-hover:text-violet-700 transition-colors" title={p.partName}>
                    {p.partName}
                  </p>
                  <p className="text-[10px] text-slate-400">{p.model}</p>
                </td>
                <td className="py-2.5 px-4">
                  <p className="font-medium text-slate-600">{p.plant}</p>
                  <p className="text-[10px] text-slate-400">{p.assemblyLine}</p>
                </td>
                <td className="py-2.5 px-4 font-bold text-slate-600">{p.week}</td>
                <td className="py-2.5 px-4"><StatusBadge status={p.status} /></td>
                {/* Shift badge */}
                <td className="py-2.5 px-4">
                  {p.shift ? (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                      {Array.isArray(p.shift) ? p.shift.join(" + ") : String(p.shift)}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                {/* Planned — raw sum of daily planned values */}
                <td className="py-2.5 px-4 text-right font-semibold text-slate-600">{fmt(p.totalPlanned)}</td>
                <td className="py-2.5 px-4 text-right font-bold text-blue-700">{p.totalActual > 0 ? fmt(p.totalActual) : <span className="text-slate-300">—</span>}</td>
                <td className={`py-2.5 px-4 text-right font-black ${
                  p.adherence >= 90 ? "text-emerald-600" : p.adherence >= 70 ? "text-amber-600" : p.adherence > 0 ? "text-red-600" : "text-slate-300"
                }`}>
                  {p.adherence > 0 ? `${p.adherence}%` : "—"}
                </td>
                <td className={`py-2.5 px-4 text-right font-bold ${
                  p.deficit > 0 ? "text-red-600" : "text-slate-300"
                }`}>
                  {p.deficit > 0 ? `+${fmt(p.deficit)}` : "—"}
                </td>
                <td className="py-2.5 px-4 text-right">
                  <span className="text-slate-600 font-semibold">{p.daysEntered}/{p.workingDays}</span>
                  <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden w-full">
                    <div
                      className="h-full rounded-full bg-violet-400 transition-all"
                      style={{ width: `${Math.min(100, p.workingDays > 0 ? (p.daysEntered / p.workingDays) * 100 : 0)}%` }}
                    />
                  </div>
                  {/* Weekly capacity computed same as production-calendar */}
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Cap: {fmt(calcWeeklyCapacity(p.capacity, p.shift, p.workingDays))}
                  </p>
                  {p.aheadDays > 0 || p.behindDays > 0 ? (
                    <div className="flex gap-1 mt-1 justify-end">
                      {p.aheadDays > 0 && <span className="text-[9px] text-emerald-600 font-bold">↑{p.aheadDays}</span>}
                      {p.behindDays > 0 && <span className="text-[9px] text-red-600 font-bold">↓{p.behindDays}</span>}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
const Breadcrumb = ({
  items,
  onNav,
}: {
  items: { label: string; key: string }[];
  onNav: (k: string) => void;
}) => (
  <div className="flex items-center gap-1 flex-wrap text-xs">
    {items.map((item, i) => (
      <React.Fragment key={item.key}>
        {i > 0 && <ChevronRight size={11} className="text-slate-300" />}
        <button
          onClick={() => onNav(item.key)}
          className={`px-2 py-1 rounded-lg font-semibold transition-colors ${i === items.length - 1 ? "bg-zinc-900 text-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
        >
          {item.label}
        </button>
      </React.Fragment>
    ))}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const ProductionCalendarDashboard: React.FC = () => {
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [dashboardData, setDashboardData] = useState<{
    week: string;
    year: number;
    summary: DashboardSummary;
    chartData: ChartDay[];
    planBreakdown: any[];
    hierarchyData: HierarchyPlant[];
  } | null>(null);
  const [singlePlanData, setSinglePlanData] = useState<any>(null);
  const [editing, setEditing] = useState<ChartDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentWeekNum = getISOWeekNumber(new Date());
  const [selectedWeek, setSelectedWeek] = useState(`W${currentWeekNum}`);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);

  // All ISO weeks for the current year (W1–W52 or W53)
  const allYearWeeks = useMemo(() => {
    const year = new Date().getFullYear();
    // ISO week 1 of the year always starts on the Monday nearest to Jan 1.
    // The last week is determined by getting the week number of Dec 28
    // (Dec 28 is always in the last ISO week of its year).
    const lastWeek = getISOWeekNumber(new Date(year, 11, 28));
    return Array.from({ length: lastWeek }, (_, i) => `W${i + 1}`);
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    plantId: "",
    assemblyLineId: "",
    modelId: "",
  });
  const [drillLevel, setDrillLevel] = useState<
    "plants" | "lines" | "models" | "plans"
  >("plants");
  const [drillPlantId, setDrillPlantId] = useState("");
  const [drillLineId, setDrillLineId] = useState("");
  const [drillModelId, setDrillModelId] = useState("");

  const [filterOptions, setFilterOptions] = useState<{
    plants: any[];
    assemblyLines: any[];
    models: any[];
    weeks: string[];
  }>({ plants: [], assemblyLines: [], models: [], weeks: [] });

  // Sort state for the plan breakdown summary table
  const [breakdownSort, setBreakdownSort] = useState<{ col: string; dir: "asc" | "desc" }>({
    col: "adherence",
    dir: "desc",
  });

  const singlePlan = useMemo(
    () => plans.find((p) => p._id === selectedPlanId),
    [plans, selectedPlanId],
  );
  const isViewingPlan = drillLevel === "plans" && !!selectedPlanId;

  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchFilterOptions = useCallback(async () => {
    try {
      const r = await fetch(
        `${API_BASE}/production-plans/dashboard/filters?year=${new Date().getFullYear()}`,
      );
      const j = await r.json();
      if (j.success) {
        setFilterOptions(j.data);
        if (j.data.weeks?.length > 0) {
          setAvailableWeeks(j.data.weeks);
          // Only auto-switch if the current week has no data at all
          if (!j.data.weeks.includes(selectedWeek) && j.data.weeks.length > 0) {
            // Don't force-change; keep user's current selection (all weeks are valid)
          }
        }
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchData = useCallback(
    async (f = filters, week = selectedWeek) => {
      setLoading(true);
      setError(null);
      try {
        const year = new Date().getFullYear();
        const p = new URLSearchParams({ year: String(year), week });
        if (f.plantId) p.append("plantId", f.plantId);
        if (f.assemblyLineId) p.append("assemblyLineId", f.assemblyLineId);
        if (f.modelId) p.append("modelId", f.modelId);

        const [pr, dr] = await Promise.all([
          fetch(`${API_BASE}/production-plans?${p}`),
          fetch(`${API_BASE}/production-plans/dashboard?${p}`),
        ]);
        const pj = await pr.json();
        if (pj.success) {
          setPlans(pj.data ?? []);
          if (
            pj.data?.length > 0 &&
            !pj.data.some((pl: any) => pl._id === selectedPlanId)
          )
            setSelectedPlanId("");
          else if (!pj.data?.length) setSelectedPlanId("");
        }
        const dj = await dr.json();
        if (dj.success) setDashboardData(dj.data);
        else setError(dj.message || "Failed to load dashboard");
      } catch {
        setError("Cannot connect to backend (port 5001).");
      } finally {
        setLoading(false);
      }
    },
    [filters, selectedWeek, selectedPlanId],
  );

  const fetchSinglePlan = useCallback(async (planId: string) => {
    if (!planId) return;
    try {
      const r = await fetch(
        `${API_BASE}/production-plans/${planId}/daily-entries`,
      );
      const j = await r.json();
      if (j.success) setSinglePlanData(j.data);
    } catch {
      /* silent */
    }
  }, []);

  const fetchCalendar = useCallback(async () => {
    try {
      const p = new URLSearchParams({
        year: String(currentDate.getFullYear()),
        month: String(currentDate.getMonth() + 1),
      });
      if (filters.plantId) p.append("plantId", filters.plantId);
      if (filters.assemblyLineId)
        p.append("assemblyLineId", filters.assemblyLineId);
      if (filters.modelId) p.append("modelId", filters.modelId);
      const r = await fetch(
        `${API_BASE}/production-plans/dashboard/calendar?${p}`,
      );
      const j = await r.json();
      if (j.success) setCalendarData(j.data.calendar ?? []);
    } catch {
      /* silent */
    }
  }, [currentDate, filters]);

  useEffect(() => {
    fetchFilterOptions();
    fetchData();
  }, []);
  useEffect(() => {
    if (isViewingPlan && selectedPlanId) fetchSinglePlan(selectedPlanId);
    else setSinglePlanData(null);
  }, [selectedPlanId, isViewingPlan]);
  useEffect(() => {
    fetchCalendar();
  }, [currentDate, filters]);

  // ── Drill handlers ─────────────────────────────────────────────────────────
  const drillToPlant = (plantId: string) => {
    const nf = { plantId, assemblyLineId: "", modelId: "" };
    setFilters(nf);
    setDrillPlantId(plantId);
    setDrillLineId("");
    setDrillModelId("");
    setDrillLevel("lines");
    setSelectedPlanId("");
    fetchData(nf, selectedWeek);
  };
  const drillToLine = (lineId: string) => {
    const nf = { ...filters, assemblyLineId: lineId, modelId: "" };
    setFilters(nf);
    setDrillLineId(lineId);
    setDrillModelId("");
    setDrillLevel("models");
    setSelectedPlanId("");
    fetchData(nf, selectedWeek);
  };
  const drillToModel = (modelId: string) => {
    const nf = { ...filters, modelId };
    setFilters(nf);
    setDrillModelId(modelId);
    setDrillLevel("plans");
    setSelectedPlanId("");
    fetchData(nf, selectedWeek);
  };
  const drillToPlan = (planId: string) => {
    const fullPlan = plans.find((p) => p._id === planId);
    if (fullPlan) {
      // Auto-set filters from plan's own metadata
      const nf = {
        plantId: fullPlan.model?.assemblyLine?.plant?.plantId ?? "",
        assemblyLineId: fullPlan.model?.assemblyLine?.assemblyLineId ?? "",
        modelId: fullPlan.model?.modelId ?? "",
      };
      setFilters(nf);
      setDrillPlantId(nf.plantId);
      setDrillLineId(nf.assemblyLineId);
      setDrillModelId(nf.modelId);
    }
    setSelectedPlanId(planId);
    setDrillLevel("plans");
  };

  const navigateBreadcrumb = (key: string) => {
    if (key === "all") {
      const nf = { plantId: "", assemblyLineId: "", modelId: "" };
      setFilters(nf);
      setDrillPlantId("");
      setDrillLineId("");
      setDrillModelId("");
      setDrillLevel("plants");
      setSelectedPlanId("");
      fetchData(nf, selectedWeek);
    } else if (key === "plant") {
      const nf = { plantId: drillPlantId, assemblyLineId: "", modelId: "" };
      setFilters(nf);
      setDrillLineId("");
      setDrillModelId("");
      setDrillLevel("lines");
      setSelectedPlanId("");
      fetchData(nf, selectedWeek);
    } else if (key === "line") {
      const nf = { ...filters, assemblyLineId: drillLineId, modelId: "" };
      setFilters(nf);
      setDrillModelId("");
      setDrillLevel("models");
      setSelectedPlanId("");
      fetchData(nf, selectedWeek);
    } else if (key === "model") {
      setDrillLevel("plans");
      setSelectedPlanId("");
    }
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const drillCards = useMemo(() => {
    if (!dashboardData?.hierarchyData) return [];
    const h = dashboardData.hierarchyData;
    if (drillLevel === "plants") return h;
    const plant = h.find((p) => p.plantId === drillPlantId);
    if (!plant) return [];
    if (drillLevel === "lines") return plant.assemblyLines;
    const line = plant.assemblyLines.find(
      (l) => l.assemblyLineId === drillLineId,
    );
    if (!line) return [];
    if (drillLevel === "models") return line.models;
    const model = line.models.find((m) => m.modelId === drillModelId);
    return model?.plans ?? [];
  }, [dashboardData, drillLevel, drillPlantId, drillLineId, drillModelId]);

  const activeStats = useMemo((): HierarchyStats | null => {
    if (!dashboardData) return null;
    const s = dashboardData.summary;
    if (drillLevel === "plants")
      return {
        capacity: s.totalCapacity,
        planned: s.totalPlanned,
        actual: s.totalActual,
        backlog: s.deficit,
        adherence: s.adherence,
        plansCount: s.plansCount,
      };
    const h = dashboardData.hierarchyData;
    const plant = h.find((p) => p.plantId === drillPlantId);
    if (drillLevel === "lines") return plant?.stats ?? null;
    const line = plant?.assemblyLines.find(
      (l) => l.assemblyLineId === drillLineId,
    );
    if (drillLevel === "models") return line?.stats ?? null;
    const model = line?.models.find((m) => m.modelId === drillModelId);
    if (isViewingPlan && singlePlanData?.summary) {
      const sp = singlePlanData.summary;
      return {
        capacity: singlePlan?.capacity ?? 0,
        planned: sp.totalPlanned,
        actual: sp.totalActual,
        backlog: sp.backlog,
        adherence: sp.adherence,
        plansCount: 1,
      };
    }
    return model?.stats ?? null;
  }, [
    dashboardData,
    drillLevel,
    drillPlantId,
    drillLineId,
    drillModelId,
    isViewingPlan,
    singlePlanData,
    singlePlan,
  ]);

  const breadcrumbItems = useMemo(() => {
    const items: { label: string; key: string }[] = [
      { label: "All Plants", key: "all" },
    ];
    if (!drillPlantId) return items;
    const plant = dashboardData?.hierarchyData.find(
      (p) => p.plantId === drillPlantId,
    );
    items.push({ label: plant?.plantName ?? drillPlantId, key: "plant" });
    if (!drillLineId) return items;
    const line = plant?.assemblyLines.find(
      (l) => l.assemblyLineId === drillLineId,
    );
    items.push({ label: line?.assemblyLineName ?? drillLineId, key: "line" });
    if (!drillModelId) return items;
    const model = line?.models.find((m) => m.modelId === drillModelId);
    items.push({ label: model?.modelName ?? drillModelId, key: "model" });
    if (selectedPlanId) {
      const p = plans.find((pl) => pl._id === selectedPlanId);
      items.push({ label: p?.bom?.partNumber ?? "Plan", key: "plan_detail" });
    }
    return items;
  }, [
    dashboardData,
    drillPlantId,
    drillLineId,
    drillModelId,
    selectedPlanId,
    plans,
  ]);

  // const chartData: ChartDay[] = useMemo(() => {
  //   if (isViewingPlan && singlePlanData?.entries) {
  //     let cum = 0;
  //     return singlePlanData.entries.map((e: any) => {
  //       const ha = e.actual !== null && e.actual !== undefined;
  //       const bl = ha ? (e.planned - e.actual) : 0;
  //       if (ha) cum += bl;
  //       let st: ChartDay['performanceStatus'] = 'pending';
  //       if (ha) st = e.actual >= e.planned ? 'ahead' : e.actual >= e.planned * 0.9 ? 'on-track' : 'behind';
  //       return { date: e.date, dayName: new Date(e.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short' }), basePlanned: e.planned, adjustedPlanned: e.planned, actual: e.actual ?? 0, hasActual: ha, backlog: bl, cumulativeBacklog: ha ? cum : 0, performanceStatus: st, shift: e.shift };
  //     });
  //   }
  //   return dashboardData?.chartData ?? [];
  // }, [isViewingPlan, singlePlanData, dashboardData]);
  const chartData: ChartDay[] = useMemo(() => {
    if (isViewingPlan && singlePlanData?.entries) {
      let cum = 0;

      return singlePlanData.entries.map((e: any) => {
        const hasActual = e.actual !== null && e.actual !== undefined;
        const backlog = hasActual ? e.planned - e.actual : 0;

        if (hasActual) cum += backlog;

        let performanceStatus: ChartDay["performanceStatus"] = "pending";
        if (hasActual) {
          if (e.actual >= e.planned) performanceStatus = "ahead";
          else if (e.actual >= e.planned * 0.9) performanceStatus = "on-track";
          else performanceStatus = "behind";
        }

        return {
          date: e.date,
          dayName: weekdayShort(e.date),
          basePlanned: e.planned,
          adjustedPlanned: e.planned,
          actual: e.actual ?? 0,
          hasActual,
          backlog,
          cumulativeBacklog: hasActual ? cum : 0,
          performanceStatus,
          shift: e.shift,
        };
      });
    }

    return dashboardData?.chartData ?? [];
  }, [isViewingPlan, singlePlanData, dashboardData]);

  const stats = useMemo(() => {
    if (isViewingPlan && singlePlanData?.summary) {
      const sp = singlePlanData.summary;
      return {
        totalPlanned: sp.totalPlanned,
        totalActual: sp.totalActual,
        adherence: sp.adherence,
        deficit: Math.max(0, sp.backlog),
        totalCapacity: singlePlan?.capacity ?? 0,
        plansCount: 1,
        daysEntered: sp.daysEntered,
        daysRemaining: sp.daysRemaining,
      };
    }
    return dashboardData?.summary ?? null;
  }, [isViewingPlan, singlePlanData, dashboardData, singlePlan]);

  const handleSave = async (date: string, actual: number, notes: string) => {
    if (!selectedPlanId) return;
    try {
      const res = await fetch(
        `${API_BASE}/production-plans/${selectedPlanId}/daily-entries/${date}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actual, notes }),
        },
      );
      const d = await res.json();
      if (d.success)
        await Promise.all([
          fetchSinglePlan(selectedPlanId),
          fetchData(filters, selectedWeek),
        ]);
    } catch {
      console.error("Save failed");
    }
    setEditing(null);
  };

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const calMonthData = useMemo(() => {
    const y = currentDate.getFullYear(),
      m = currentDate.getMonth();
    const first = new Date(y, m, 1),
      last = new Date(y, m + 1, 0);
    const days: (number | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(d);
    return {
      days,
      monthName: first.toLocaleDateString("en-US", { month: "long" }),
      year: y,
    };
  }, [currentDate]);

  const isToday = (day: number) => {
    const t = new Date();
    return (
      day === t.getDate() &&
      currentDate.getMonth() === t.getMonth() &&
      currentDate.getFullYear() === t.getFullYear()
    );
  };
  // const calendarDataMap = useMemo(() => {
  //   return new Map(calendarData.map(day => [day.date, day]));
  // }, [calendarData]);
  const calendarDataMap = useMemo(() => {
    // Splits on 'T' to ensure the key is always strictly "YYYY-MM-DD"
    return new Map(calendarData.map((day) => [day.date.split("T")[0], day]));
  }, [calendarData]);
  const getCalDayColor = (day: number) => {
    const dateKey = toLocalDateKey(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
    );

    const match = calendarDataMap.get(dateKey);
    if (!match) return null;

    if (match.status === "ahead" || match.status === "on-track") return "green";
    if (match.status === "behind") return "red";
    if (match.status === "pending") return "amber";
    return null;
  };

  // const getCalDayColor = (day: number) => {
  //   const ds = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
  //   const m = calendarData.find(c => c.date === ds);
  //   if (!m) return null;
  //   if (m.status === 'ahead' || m.status === 'on-track') return 'green';
  //   if (m.status === 'behind') return 'red';
  //   if (m.status === 'pending') return 'amber';
  //   return null;
  // };

  const drillIcon = (level: string) => {
    if (level === "plants") return <Factory size={14} />;
    if (level === "lines") return <GitBranch size={14} />;
    if (level === "models") return <Box size={14} />;
    return <Package size={14} />;
  };

  const levelTitle = (level: string) => {
    if (level === "plants") return "Plants";
    if (level === "lines") return "Assembly Lines";
    if (level === "models") return "Models";
    return "Plans";
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-50 font-sans w-full">
      {/* HEADER */}
      {/* <div className=" bg-white border-b border-slate-200 px-4 py-3"> */}
      {/* HEADER */}
      <div className="sticky top-[64px] z-20 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-xl flex items-center justify-center">
              <Factory size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 leading-none">
                Production Dashboard
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {selectedWeek} · {new Date().getFullYear()}
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-slate-400" />
            <select
              className="select select-sm select-bordered bg-base-100 text-sm font-bold min-w-[90px]"
              value={selectedWeek}
              onChange={(e) => {
                setSelectedWeek(e.target.value);
                fetchData(filters, e.target.value);
              }}
            >
              {allYearWeeks.map((w) => {
                const hasData = availableWeeks.includes(w);
                const isCurrent = w === `W${currentWeekNum}`;
                return (
                  <option key={w} value={w}>
                    {hasData ? "● " : ""}{w}{isCurrent ? " ◀" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Plant filter */}
          <select
            className="select select-sm select-bordered bg-base-100 text-xs font-medium w-36"
            value={filters.plantId}
            onChange={(e) => {
              const v = e.target.value;
              const nf = { plantId: v, assemblyLineId: "", modelId: "" };
              setFilters(nf);
              if (v) {
                setDrillPlantId(v);
                setDrillLevel("lines");
              } else {
                setDrillPlantId("");
                setDrillLevel("plants");
              }
              setDrillLineId("");
              setDrillModelId("");
              setSelectedPlanId("");
              fetchData(nf, selectedWeek);
            }}
          >
            <option value="">All Plants</option>
            {filterOptions.plants?.map((p) => (
              <option key={p.plantId} value={p.plantId}>
                {p.plantName}
              </option>
            ))}
          </select>

          {/* Assembly Line filter */}
          <select
            className="select select-sm select-bordered bg-base-100 text-xs font-medium w-40"
            value={filters.assemblyLineId}
            onChange={(e) => {
              const v = e.target.value;
              const nf = { ...filters, assemblyLineId: v, modelId: "" };
              setFilters(nf);
              if (v) {
                setDrillLineId(v);
                setDrillLevel("models");
              } else setDrillLevel("lines");
              setDrillModelId("");
              setSelectedPlanId("");
              fetchData(nf, selectedWeek);
            }}
          >
            <option value="">All Lines</option>
            {filterOptions.assemblyLines?.map((l) => (
              <option key={l.assemblyLineId} value={l.assemblyLineId}>
                {l.assemblyLineName}
              </option>
            ))}
          </select>

          {/* Model filter */}
          <select
            className="select select-sm select-bordered bg-base-100 text-xs font-medium w-36"
            value={filters.modelId}
            onChange={(e) => {
              const v = e.target.value;
              const nf = { ...filters, modelId: v };
              setFilters(nf);
              if (v) {
                setDrillModelId(v);
                setDrillLevel("plans");
              } else setDrillLevel("models");
              setSelectedPlanId("");
              fetchData(nf, selectedWeek);
            }}
          >
            <option value="">All Models</option>
            {filterOptions.models?.map((m) => (
              <option key={m.modelId} value={m.modelId}>
                {m.modelName}
              </option>
            ))}
          </select>

          <div className="hidden lg:block flex-1" />
          <button
            onClick={() => fetchData(filters, selectedWeek)}
            disabled={loading}
            className="btn btn-primary btn-sm"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>
          <button
            onClick={() => {
              const c = { plantId: "", assemblyLineId: "", modelId: "" };
              setFilters(c);
              setDrillPlantId("");
              setDrillLineId("");
              setDrillModelId("");
              setDrillLevel("plants");
              setSelectedPlanId("");
              fetchData(c, selectedWeek);
            }}
            className="btn btn-ghost btn-sm text-xs"
          >
            Reset
          </button>
        </div>

        {breadcrumbItems.length > 1 && (
          <div className="mt-2">
            <Breadcrumb items={breadcrumbItems} onNav={navigateBreadcrumb} />
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error shadow-sm mx-4 mt-3">
          <AlertTriangle size={14} />
          <p className="text-sm font-bold">{error}</p>
          <button
            onClick={() => fetchData(filters, selectedWeek)}
            className="ml-auto text-xs underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* MAIN GRID */}
      <div className=" grid grid-cols-1 xl:grid-cols-12 ">
        {/* LEFT PANEL */}
        <div className="xl:col-span-4 flex flex-col ">
          {/* Active level stats */}
          <div className="bg-white border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {drillLevel === "plants"
                    ? "All Plants Combined"
                    : drillLevel === "lines"
                      ? (dashboardData?.hierarchyData.find(
                          (p) => p.plantId === drillPlantId,
                        )?.plantName ?? "Plant")
                      : drillLevel === "models"
                        ? (dashboardData?.hierarchyData
                            .find((p) => p.plantId === drillPlantId)
                            ?.assemblyLines.find(
                              (l) => l.assemblyLineId === drillLineId,
                            )?.assemblyLineName ?? "Line")
                        : isViewingPlan
                          ? (singlePlan?.bom?.partNumber ?? "Plan")
                          : "Model"}
                </p>
                <p className="text-3xl font-black text-slate-900">
                  {activeStats ? `${activeStats.adherence}%` : "—"}
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  Plan adherence
                </p>
              </div>
              {activeStats && (
                <AdherenceRing value={activeStats.adherence} size={72} />
              )}
            </div>
            {activeStats ? (
              <div className="space-y-3">
                <StatsBar
                  planned={activeStats.planned}
                  actual={activeStats.actual}
                  backlog={activeStats.backlog}
                  adherence={activeStats.adherence}
                  capacity={activeStats.capacity}
                />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      l: "Capacity",
                      v: fmt(activeStats.capacity),
                      icon: <Zap size={10} />,
                    },
                    {
                      l: "Plans",
                      v: String(activeStats.plansCount),
                      icon: <Layers size={10} />,
                    },
                    {
                      l: "Deficit",
                      v: fmt(activeStats.backlog > 0 ? activeStats.backlog : 0),
                      red: activeStats.backlog > 0,
                      icon: <AlertCircle size={10} />,
                    },
                    {
                      l: "Surplus",
                      v: fmt(
                        activeStats.backlog < 0
                          ? Math.abs(activeStats.backlog)
                          : 0,
                      ),
                      green: activeStats.backlog < 0,
                      icon: <CheckCircle2 size={10} />,
                    },
                  ].map(({ l, v, red, green, icon }) => (
                    <div
                      key={l}
                      className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2"
                    >
                      <span
                        className={`${red ? "text-red-400" : green ? "text-emerald-400" : "text-slate-400"}`}
                      >
                        {icon}
                      </span>
                      <div>
                        <p className="text-[9px] text-slate-400 font-medium uppercase">
                          {l}
                        </p>
                        <p
                          className={`text-xs font-black ${red ? "text-red-600" : green ? "text-emerald-600" : "text-slate-700"}`}
                        >
                          {v}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {drillLevel === "plants" &&
                  dashboardData?.summary.statusCounts && (
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {Object.entries(dashboardData.summary.statusCounts).map(
                        ([st, cnt]) =>
                          cnt > 0 && (
                            <span
                              key={st}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600"
                            >
                              {cnt} {st.replace("_", " ")}
                            </span>
                          ),
                      )}
                    </div>
                  )}

                {/* Level-aware secondary stats row */}
                {(() => {
                  const s = dashboardData?.summary;
                  if (!s || !activeStats) return null;
                  const pills: { l: string; v: string; color?: string }[] = [];

                  if (drillLevel === "plants") {
                    pills.push(
                      { l: "Total Plans",  v: String(s.plansCount) },
                      { l: "Days Entered", v: String(s.daysEntered) },
                      { l: "Ahead Days",   v: String(s.aheadDays),   color: s.aheadDays > 0 ? "text-emerald-600" : undefined },
                      { l: "On-Track",     v: String(s.onTrackDays), color: s.onTrackDays > 0 ? "text-blue-600" : undefined },
                      { l: "Behind Days",  v: String(s.behindDays),  color: s.behindDays > 0 ? "text-red-600" : undefined },
                      { l: "Pending Days", v: String(s.pendingDays), color: s.pendingDays > 0 ? "text-amber-600" : undefined },
                    );
                  } else if (drillLevel === "lines" || drillLevel === "models") {
                    pills.push(
                      { l: "Plans",    v: String(activeStats.plansCount) },
                      { l: "Capacity", v: fmt(activeStats.capacity) },
                      { l: "Planned",  v: fmt(activeStats.planned) },
                      { l: "Actual",   v: fmt(activeStats.actual) },
                    );
                  } else if (isViewingPlan) {
                    const hp = dashboardData?.planBreakdown?.find((p: any) => p.planId === selectedPlanId);
                    if (hp) {
                      const avgDaily = hp.workingDays > 0 ? Math.floor(hp.totalPlanned / hp.workingDays) : 0;
                      const completionPct = hp.workingDays > 0 ? Math.round((hp.daysEntered / hp.workingDays) * 100) : 0;
                      pills.push(
                        { l: "Days Entered",  v: `${hp.daysEntered}/${hp.workingDays}` },
                        { l: "Days Left",     v: String(hp.daysRemaining),    color: hp.daysRemaining > 0 ? "text-amber-600" : "text-emerald-600" },
                        { l: "Avg Daily",     v: fmt(avgDaily) },
                        { l: "Week Done",     v: `${completionPct}%`,          color: "text-violet-600" },
                      );
                    }
                  }

                  if (pills.length === 0) return null;
                  return (
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 mt-1">
                      {pills.map(({ l, v, color }) => (
                        <div key={l} className="flex flex-col bg-slate-50 rounded-lg px-2 py-1.5">
                          <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">{l}</span>
                          <span className={`text-xs font-black ${color ?? "text-slate-700"}`}>{v}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-slate-300" size={20} />
              </div>
            )}
          </div>

          {/* Drill-down list */}
          <div className="bg-white  border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
              <span className="text-slate-500">{drillIcon(drillLevel)}</span>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider flex-1">
                {levelTitle(drillLevel)}
              </p>
              {loading && (
                <Loader2 className="animate-spin text-slate-400" size={13} />
              )}
            </div>
            <div className="p-3 max-h-[420px] overflow-y-auto space-y-2">
              {!dashboardData && loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-slate-300" size={28} />
                </div>
              ) : drillCards.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No data for {selectedWeek}
                </div>
              ) : drillLevel === "plans" ? (
                (drillCards as HierarchyPlan[]).map((plan) => (
                  <PlanCard
                    key={plan.planId}
                    plan={plan}
                    isSelected={selectedPlanId === plan.planId}
                    onClick={() => drillToPlan(plan.planId)}
                  />
                ))
              ) : (
                (drillCards as any[]).map((item: any) => {
                  const id =
                    item.plantId ?? item.assemblyLineId ?? item.modelId;
                  const name =
                    item.plantName ?? item.assemblyLineName ?? item.modelName;
                  const isSel =
                    drillLevel === "plants"
                      ? drillPlantId === id
                      : drillLevel === "lines"
                        ? drillLineId === id
                        : drillModelId === id;
                  // Aggregate day counts from plans inside this hierarchy item
                  const itemPlans: any[] = item.plans ?? [];
                  const ah    = itemPlans.reduce((s: number, p: any) => s + (p.aheadDays  ?? 0), 0);
                  const bh    = itemPlans.reduce((s: number, p: any) => s + (p.behindDays ?? 0), 0);
                  const ent   = itemPlans.reduce((s: number, p: any) => s + (p.daysEntered ?? 0), 0);
                  const tot   = itemPlans.reduce((s: number, p: any) => s + (p.workingDays ?? 0), 0);
                  const pend  = Math.max(0, tot - ent);
                  return (
                    <HierarchyCard
                      key={id}
                      icon={drillIcon(drillLevel)}
                      title={name}
                      subtitle={`${item.stats.plansCount} plan${item.stats.plansCount !== 1 ? "s" : ""}`}
                      stats={item.stats}
                      isSelected={isSel}
                      aheadDays={ah}
                      behindDays={bh}
                      pendingDays={pend}
                      onClick={() => {
                        if (drillLevel === "plants") drillToPlant(id);
                        else if (drillLevel === "lines") drillToLine(id);
                        else drillToModel(id);
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>


          {/* Mini calendar */}
          <div className="bg-white  border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() - 1,
                      1,
                    ),
                  )
                }
                className="btn btn-ghost btn-xs"
              >
                <ChevronLeft size={14} />
              </button>
              <p className="text-sm font-bold text-slate-800">
                {calMonthData.monthName} {calMonthData.year}
              </p>
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() + 1,
                      1,
                    ),
                  )
                }
                className="btn btn-ghost btn-xs"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex gap-3 text-[10px] mb-2 font-medium flex-wrap">
              {[
                { c: "bg-emerald-500", l: "On Track" },
                { c: "bg-amber-400", l: "Pending" },
                { c: "bg-red-400", l: "Behind" },
              ].map(({ c, l }) => (
                <span key={l} className="flex items-center gap-1">
                  <div className={`w-2 h-2 ${c} rounded-full`} />
                  <span className="text-slate-500">{l}</span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="font-bold text-slate-400 py-1">
                  {d}
                </div>
              ))}
              {calMonthData.days.map((day, idx) => {
                if (day === null) return <div key={`e${idx}`} />;
                const st = getCalDayColor(day);
                const td = isToday(day);
                const bg =
                  st === "green"
                    ? "bg-emerald-500 text-white"
                    : st === "red"
                      ? "bg-red-400 text-white"
                      : st === "amber"
                        ? "bg-amber-400 text-white"
                        : "bg-slate-100 text-slate-500";
                return (
                  <div
                    key={day}
                    className={`p-1.5 rounded-lg flex items-center justify-center text-[10px] font-semibold transition-all ${bg} ${td ? "ring-2 ring-purple-500 ring-offset-1" : ""}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            {/* <button
              onClick={() => {
                setCurrentDate(new Date());
              }}
              className="btn btn-xs btn-ghost w-full mt-1"
            >
              Today
            </button> */}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="xl:col-span-8 flex flex-col ">
          {isViewingPlan && singlePlan && (
            <PlanDetailHeader
              plan={singlePlan}
              hierarchyPlan={dashboardData?.planBreakdown?.find((p: any) => p.planId === selectedPlanId)}
            />
          )}
          {/* Bar chart */}
          <div className="bg-white  border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Production Performance — {selectedWeek}
                  {isViewingPlan && singlePlan && (
                    <span className="text-xs font-normal text-slate-400 ml-2">
                      · {singlePlan.bom?.partNumber}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {stats ? (
                    stats.deficit > 0 ? (
                      <span className="text-red-600 font-semibold">
                        {fmt(stats.deficit)} units below target
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">
                        On track
                      </span>
                    )
                  ) : (
                    "Loading..."
                  )}
                </p>
              </div>
              {dashboardData?.summary && (
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    {
                      l: `${dashboardData.summary.aheadDays} ahead`,
                      c: "bg-emerald-100 text-emerald-700",
                    },
                    {
                      l: `${dashboardData.summary.onTrackDays} on-track`,
                      c: "bg-blue-100 text-blue-700",
                    },
                    {
                      l: `${dashboardData.summary.behindDays} behind`,
                      c: "bg-red-100 text-red-700",
                    },
                    {
                      l: `${dashboardData.summary.pendingDays} pending`,
                      c: "bg-slate-100 text-slate-500",
                    },
                  ]
                    .filter((x) => !x.l.startsWith("0 "))
                    .map((x) => (
                      <span
                        key={x.l}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${x.c}`}
                      >
                        {x.l}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center h-72 items-center">
                <Loader2 className="animate-spin text-slate-300" size={40} />
              </div>
            ) : chartData.length > 0 ? (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    {/* <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="dayName" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dy={6} />
                      <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} dx={-4}
                        label={{ value: 'Units', angle: -90, position: 'insideLeft', style: { fill: '#cbd5e1', fontSize: 10 } }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} iconType="rect" formatter={v => <span className="text-slate-500">{v}</span>} />
                      <Bar dataKey="adjustedPlanned" name="Planned" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="actual" name="Actual" radius={[3, 3, 0, 0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={!d.hasActual ? '#e2e8f0' : d.performanceStatus === 'ahead' ? '#10b981' : d.performanceStatus === 'behind' ? '#ef4444' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart> */}
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="dayName"
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8" }}
                        dy={6}
                      />

                      <YAxis
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#94a3b8" }}
                        dx={-4}
                        label={{
                          value: "Units",
                          angle: -90,
                          position: "insideLeft",
                          style: { fill: "#cbd5e1", fontSize: 10 },
                        }}
                      />

                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
                      />

                      {/* BARS */}
                      <Bar
                        dataKey="adjustedPlanned"
                        name="Planned"
                        fill="#a78bfa"
                        radius={[3, 3, 0, 0]}
                      />

                      <Bar dataKey="actual" name="Actual" radius={[3, 3, 0, 0]}>
                        {chartData.map((d, i) => (
                          <Cell
                            key={i}
                            fill={
                              !d.hasActual
                                ? "#e2e8f0"
                                : d.performanceStatus === "ahead"
                                  ? "#10b981"
                                  : d.performanceStatus === "behind"
                                    ? "#ef4444"
                                    : "#3b82f6"
                            }
                          />
                        ))}
                      </Bar>

                      {/* 🔥 ADD THESE LINES */}
                      <Line
                        type="monotone"
                        dataKey="adjustedPlanned"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Planned Trend"
                      />

                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#111827"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Actual Trend"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-3 justify-center mt-2 text-[10px] flex-wrap">
                  {[
                    { c: "bg-emerald-500", l: "Ahead" },
                    { c: "bg-blue-500", l: "On Track" },
                    { c: "bg-red-400", l: "Behind" },
                    { c: "bg-slate-200", l: "Pending" },
                  ].map(({ c, l }) => (
                    <span
                      key={l}
                      className="flex items-center gap-1 text-slate-500"
                    >
                      <div className={`w-2 h-2 rounded-sm ${c}`} />
                      {l}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-72 bg-slate-50 rounded-xl">
                <p className="text-slate-400 font-medium text-sm">
                  No chart data for {selectedWeek}
                </p>
              </div>
            )}
          </div>

          {/* Daily breakdown table */}
          {chartData.length > 0 && (
            <div className="bg-white  border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
                <div className="w-1 h-5 bg-zinc-900 rounded-full" />
                <h3 className="text-sm font-black text-slate-800">
                  Daily Breakdown — {selectedWeek}
                </h3>
                {isViewingPlan && singlePlan && (
                  <span className="ml-auto text-[10px] text-slate-400">
                    {singlePlan.bom?.partNumber} ·{" "}
                    {singlePlan.model?.assemblyLine?.assemblyLineName}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full text-xs min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-200">
                      {[
                        "Day",
                        "Planned",
                        "Adj. Plan",
                        "Actual",
                        "Backlog",
                        "Cum. Backlog",
                        "Shift",
                        "Status",
                        ...(isViewingPlan ? ["Action"] : []),
                      ].map((h) => (
                        <th key={h} className="py-3 font-bold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((day, i) => (
                      <tr
                        key={i}
                        className={`border-b border-slate-50 hover:bg-slate-50 ${day.performanceStatus === "behind" ? "bg-red-50/30" : day.performanceStatus === "ahead" ? "bg-emerald-50/20" : ""}`}
                      >
                        <td className="py-2.5 font-bold text-slate-800">
                          {day.dayName}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {day.date}
                          </span>
                        </td>
                        <td className="text-slate-500">
                          {fmt(day.basePlanned)}
                        </td>
                        <td className="font-bold text-purple-700">
                          {fmt(day.adjustedPlanned)}
                        </td>
                        <td className="font-bold text-blue-700">
                          {day.hasActual ? (
                            fmt(day.actual)
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="font-semibold">
                          {day.hasActual ? (
                            day.backlog > 0 ? (
                              <span className="text-red-600">
                                +{fmt(day.backlog)}
                              </span>
                            ) : day.backlog < 0 ? (
                              <span className="text-emerald-600">
                                {fmt(day.backlog)}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                        <td className="font-bold">
                          {day.hasActual ? (
                            day.cumulativeBacklog > 0 ? (
                              <span className="text-red-700">
                                +{fmt(day.cumulativeBacklog)}
                              </span>
                            ) : day.cumulativeBacklog < 0 ? (
                              <span className="text-emerald-700">
                                {fmt(day.cumulativeBacklog)}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                        <td>
                          {day.shift ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[9px] capitalize">
                              {day.shift}
                            </span>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                        <td>
                          {!day.hasActual ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-bold text-[9px]">
                              PENDING
                            </span>
                          ) : day.performanceStatus === "ahead" ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[9px] border border-emerald-200">
                              ✓ AHEAD
                            </span>
                          ) : day.performanceStatus === "behind" ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[9px] border border-red-200">
                              ⚠ BEHIND
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-[9px] border border-blue-200">
                              → ON TRACK
                            </span>
                          )}
                        </td>
                        {isViewingPlan && (
                          <td>
                            {singlePlan && (
                              <button
                                onClick={() => setEditing(day)}
                                className="btn btn-xs btn-outline btn-primary gap-1"
                              >
                                <Edit3 size={10} /> Edit
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {stats && (
                      <tr className="bg-slate-100 font-black border-t-2 border-slate-200 text-xs">
                        <td className="py-3 text-slate-700">TOTAL</td>
                        <td>
                          {fmt(
                            chartData.reduce((s, d) => s + d.basePlanned, 0),
                          )}
                        </td>
                        <td className="text-purple-700">
                          {fmt(
                            chartData.reduce(
                              (s, d) => s + d.adjustedPlanned,
                              0,
                            ),
                          )}
                        </td>
                        <td className="text-blue-700">
                          {fmt(stats.totalActual)}
                        </td>
                        <td className="text-slate-500">—</td>
                        <td>
                          {(chartData[chartData.length - 1]
                            ?.cumulativeBacklog ?? 0) > 0 ? (
                            <span className="text-red-700">
                              +
                              {fmt(
                                chartData[chartData.length - 1]
                                  .cumulativeBacklog,
                              )}
                            </span>
                          ) : (
                            <span className="text-emerald-700">
                              {fmt(
                                chartData[chartData.length - 1]
                                  ?.cumulativeBacklog ?? 0,
                              )}
                            </span>
                          )}
                        </td>
                        <td>—</td>
                        <td className="text-slate-600">
                          {stats.adherence}% Adh.
                        </td>
                        {isViewingPlan && <td />}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Plan Breakdown Table — all plans in current scope (not when viewing single plan) */}
          {!isViewingPlan &&
            dashboardData?.planBreakdown &&
            dashboardData.planBreakdown.length > 0 && (
              <PlanBreakdownTable
                breakdown={dashboardData.planBreakdown}
                sort={breakdownSort}
                onSort={setBreakdownSort}
                onPlanClick={drillToPlan}
              />
            )}

          {/* BOM child parts — visible only when viewing a single plan */}
          {isViewingPlan && singlePlan && <BomSection plan={singlePlan} />}

        </div>
      </div>

      {/* Entry modal */}
      {editing && singlePlan && isViewingPlan && (
        <EntryModal
          entry={editing}
          plan={singlePlan}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

export default ProductionCalendarDashboard;
