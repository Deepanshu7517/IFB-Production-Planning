import React, { useState, useMemo, useEffect } from 'react';
import {
  Trash2, Plus, CalendarDays, ArrowLeft, Edit,
  Package, Factory, Settings, TrendingUp, X, Save, Loader2,
  Search, ChevronRight, AlertCircle, Upload, FileSpreadsheet,
  CheckCircle2, Info,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import { API_BASE as _API_BASE } from '../../../config/api';

// =============================================================================
// TYPES
// =============================================================================

interface ChildPart {
  partCode: string;
  description: string;
  qty: number;
  unit: string;
}

interface ProductionPlan {
  _id: string;
  week: string;
  year: number;
  workingDays: number;
  capacity: number;
  status: string;
  notes?: string;
  shift?: string;
  matrixRef?: string;

  model: {
    _id: string;
    modelId: string;
    modelName: string;
    assemblyLine: {
      _id: string;
      assemblyLineId: string;
      assemblyLineName: string;
      capacity: number;
      plant: {
        _id: string;
        plantId: string;
        plantName: string;
      };
    };
  };

  bom: {
    _id: string;
    partNumber: string;
    partName: string;
    price: number;
    childPartList: ChildPart[];
  };

  isPartialWeek?: boolean;
  createdAt?: string;
  updatedAt?: string;
  dailyEntries?: DailyEntry[];
}

interface MatrixRow {
  _id: string;
  model: {
    _id: string;
    modelId: string;
    modelName: string;
    assemblyLine: {
      _id: string;
      assemblyLineId: string;
      assemblyLineName: string;
      capacity: number;
      plant: {
        _id: string;
        plantId: string;
        plantName: string;
      };
    };
  };
  bom: {
    _id: string;
    partNumber: string;
    partName: string;
    price: number;
    childPartList: ChildPart[];
  };
  shift: string;
}

interface DailyEntry {
  date: string;
  planned: number;
  actual: number | null;
  notes: string;
  shift: string;
}

interface DisplayEntry extends DailyEntry {
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

interface WeekStat {
  label: string;
  month: string;
  weekNumber: number;
  count: number;
  plans: ProductionPlan[];
  totalCapacity: number;
  plants: string[];
  hasPartial: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const API_BASE_URL = _API_BASE;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// =============================================================================
// HELPERS
// =============================================================================

// function getCustomWeek(date: Date) {
//   const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
//   const dayNum = d.getUTCDay() || 7; 
//   d.setUTCDate(d.getUTCDate() + 4 - dayNum); 
//   const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
//   let weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
//   weekNum = weekNum - 1; 
//   if (weekNum === 0) weekNum = 52; 

//   return weekNum;
// }
function getCustomWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 ... Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getCurrentWeekInfo() {
  const today = new Date();
  const weekNumber = getCustomWeek(today);
  return {
    weekNumber,
    weekLabel: `W${weekNumber}`,
    month: today.toLocaleDateString('en-US', { month: 'long' }),
    year: today.getFullYear(),
  };
}

function buildAllWeeks() {
  return Array.from({ length: 52 }, (_, i) => {
    const n = i + 1;
    const monthIndex = Math.min(Math.floor((n - 1) / 4.33), 11);
    return { label: `W${n}`, weekNumber: n, month: MONTH_NAMES[monthIndex] };
  });
}

function inrFormat(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function enrichEntries(plan: ProductionPlan): DisplayEntry[] {
  const today = new Date(); 
  today.setHours(0, 0, 0, 0);
  
  const entries = (plan.dailyEntries ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  return entries.map((entry, i) => {
    // SAFE PARSE: Splitting YYYY-MM-DD prevents native JS timezone offset bugs
    const [y, m, d] = entry.date.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    
    const dow = localDate.getDay();                    
    const dayIdx = dow === 0 ? 6 : dow - 1;   
    
    return {
      ...entry,
      dayLabel: DAY_NAMES[dayIdx] ?? `D${i + 1}`,
      dateLabel: localDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      isToday: localDate.getTime() === today.getTime(),
      isPast:  localDate.getTime() < today.getTime(),
      isFuture: localDate.getTime() > today.getTime(),
    };
  });
}

// type DayStatus = 'ahead' | 'on-track' | 'behind' | 'pending' | 'upcoming';
// function getDayStatus(e: DisplayEntry): DayStatus {
//   if (e.actual !== null) {
//     if (e.actual >= e.planned) return 'ahead';
//     if (e.actual >= e.planned * 0.9) return 'on-track';
//     return 'behind';
//   }
//   return e.isFuture && !e.isToday ? 'upcoming' : 'pending';
// }

// const SS: Record<DayStatus, { border: string; bg: string; badge: string; badgeTxt: string; bar: string; label: string; numColor: string }> = {
//   ahead:      { border: '#6ee7b7', bg: '#f0fdf4', badge: '#10b981', badgeTxt: '#fff',    bar: '#10b981', label: 'AHEAD',    numColor: '#059669' },
//   'on-track': { border: '#93c5fd', bg: '#eff6ff', badge: '#3b82f6', badgeTxt: '#fff',    bar: '#3b82f6', label: 'ON TRACK', numColor: '#2563eb' },
//   behind:     { border: '#fca5a5', bg: '#fff1f2', badge: '#ef4444', badgeTxt: '#fff',    bar: '#ef4444', label: 'BEHIND',   numColor: '#dc2626' },
//   pending:    { border: '#fcd34d', bg: '#fffbeb', badge: '#f59e0b', badgeTxt: '#fff',    bar: '#f59e0b', label: 'PENDING',  numColor: '#374151' },
//   upcoming:   { border: '#e2e8f0', bg: '#f8fafc', badge: '#cbd5e1', badgeTxt: '#64748b', bar: '#e2e8f0', label: 'UPCOMING', numColor: '#94a3b8' },
// };

const g = {
  plant: (p: ProductionPlan) => p?.model?.assemblyLine?.plant ?? { plantId: '', plantName: '—' },
  line:  (p: ProductionPlan) => p?.model?.assemblyLine ?? { assemblyLineId: '', assemblyLineName: '—', capacity: 0, plant: { plantId: '', plantName: '' } },
  model: (p: ProductionPlan) => p?.model ?? { modelId: '', modelName: '—' },
  bom:   (p: ProductionPlan) => p?.bom  ?? { partNumber: '—', partName: '—', price: 0, childPartList: [] },
  children: (p: ProductionPlan) => p?.bom?.childPartList ?? [],
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ProductionPlanningScheduler: React.FC = () => {
  const currentWeekInfo = useMemo(getCurrentWeekInfo, []);
  const allWeeks = useMemo(buildAllWeeks, []);

  const [viewMode, setViewMode] = useState<'annual' | 'detail'>('annual');
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ProductionPlan | null>(null);
  const [editingEntry, setEditingEntry] = useState<{entry: DisplayEntry, plan: ProductionPlan} | null>(null);

  const fetchPlans = async (week?: string, year = currentWeekInfo.year) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/production-plans?year=${year}`;
      if (week) url += `&week=${week}`;
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) setPlans(result.data);
      else setError(result.message);
    } catch {
      setError('Cannot reach server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  // FORCE ENABLED: We always return false here so action buttons never disable due to dates
  // const isPast = (weekLabel: any) => false;
  const isPast = (weekLabel: any) => { console.log(weekLabel); return false};

  const weeklyStats: WeekStat[] = useMemo(() =>
    allWeeks.map(w => {
      const wp = plans.filter(p => p.week === w.label);
      return {
        ...w,
        count: wp.length,
        plans: wp,
        totalCapacity: wp.reduce((s, p) => s + p.capacity, 0),
        plants: [...new Set(wp.map(p => p.model?.assemblyLine?.plant?.plantName).filter(Boolean))],
        hasPartial: wp.some(p => p.isPartialWeek === true),
      };
    }),
    [plans, allWeeks]);

  const currentMonthWeeks = useMemo(() => {
    const idx = currentWeekInfo.weekNumber - 1;
    const start = Math.max(0, idx - 2);
    return allWeeks.slice(start, start + 5);
  }, [allWeeks, currentWeekInfo.weekNumber]);

  const handleWeekClick = async (weekLabel: string) => {
    setSelectedWeek(weekLabel);
    setViewMode('detail');
    setSearchFilter('');
    await fetchPlans(weekLabel);
  };

  const handleBack = () => {
    setViewMode('annual');
    setSelectedWeek(null);
    setSearchFilter('');
    fetchPlans();
  };

  const handleDelete = async (id: string, week: any) => {
    // Disabled past week check to allow deletion anytime
    console.log(week);
    if (!confirm('Delete this production plan?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/production-plans/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setPlans(prev => prev.filter(p => p._id !== id));
      } else alert(result.message);
    } catch { alert('Error deleting plan.'); }
  };

  const handleSave = async (payload: Record<string, any>) => {
    const method = editingPlan ? 'PUT' : 'POST';
    const url = editingPlan
      ? `${API_BASE_URL}/production-plans/${editingPlan._id}`
      : `${API_BASE_URL}/production-plans`;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);

    setShowModal(false);
    setEditingPlan(null);
    if (viewMode === 'detail' && selectedWeek) await fetchPlans(selectedWeek);
    else await fetchPlans();
  };

  const handleSaveEntry = async (planId: string, date: string, actual: number | null, notes: string, redistribution?: { date: string, addedPlanned: number }[]) => {
    try {
      await fetch(`${API_BASE_URL}/production-plans/${planId}/daily-entries/${date}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual, notes, redistribution }),
      });
    } catch (e) { 
      console.warn('Save error:', e); 
    }
    setEditingEntry(null);
    if (viewMode === 'detail' && selectedWeek) await fetchPlans(selectedWeek);
    else await fetchPlans();
  };

  const detailPlans = useMemo(() => {
    if (!selectedWeek) return [];
    const q = searchFilter.toLowerCase();
    return plans
      .filter(p => p.week === selectedWeek)
      .filter(p => !q ||
        p.model?.assemblyLine?.plant?.plantName?.toLowerCase().includes(q) ||
        p.model?.assemblyLine?.assemblyLineName?.toLowerCase().includes(q) ||
        p.model?.modelName?.toLowerCase().includes(q) ||
        p.bom?.partNumber?.toLowerCase().includes(q) ||
        p.bom?.partName?.toLowerCase().includes(q)
      );
  }, [plans, selectedWeek, searchFilter]);

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-slate-600 font-semibold">Loading production plans…</p>
        </div>
      </div>
    );
  }

  if (error && plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-200 text-center max-w-md">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Error</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={() => fetchPlans()} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  if (viewMode === 'annual') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-6 w-full">
        <div className="max-w-[1600px] mx-auto">

          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Production Planning</h1>
              <p className="text-sm text-slate-500 mt-1">Annual schedule and capacity overview</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition shadow-sm"
              >
                <FileSpreadsheet size={17} /> Upload Monthly Excel
              </button>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={18} className="text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">
                Current Period: {currentWeekInfo.month} ({currentWeekInfo.weekLabel})
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {currentMonthWeeks.map(w => {
                const ws = weeklyStats.find(x => x.label === w.label)!;
                const isCur = w.label === currentWeekInfo.weekLabel;
                return (
                  <button
                    key={w.label}
                    onClick={() => handleWeekClick(w.label)}
                    className={`relative bg-white rounded-xl border p-5 text-left shadow-sm hover:shadow-lg transition-all group
                      ${isCur ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    {isCur && (
                      <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NOW</span>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-2xl font-bold ${isCur ? 'text-blue-600' : 'text-slate-800 group-hover:text-blue-600'}`}>{w.label}</span>
                      <Factory size={18} className={isCur ? 'text-blue-400' : 'text-slate-300 group-hover:text-blue-400'} />
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plans</span>
                        <span className={`font-bold ${ws.count > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{ws.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Capacity</span>
                        <span className={`font-semibold ${ws.totalCapacity > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{ws.totalCapacity}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow border border-slate-200">
            <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800">All 52 Weeks</h2>
                <p className="text-xs text-slate-500 mt-0.5">Click a row to see detailed plans</p>
              </div>
              <button
                onClick={() => fetchPlans()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
              >
                <Loader2 size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 border-b-2 border-slate-300 z-10 text-xs uppercase tracking-wide text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-5 text-left">Week</th>
                    <th className="py-3 px-5 text-left">Month</th>
                    <th className="py-3 px-5 text-center">Plans</th>
                    <th className="py-3 px-5 text-center">Capacity</th>
                    <th className="py-3 px-5 text-left">Plants</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyStats.map(w => (
                    <tr
                      key={w.label}
                      className="border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer transition"
                      onClick={() => handleWeekClick(w.label)}
                    >
                      <td className="py-3.5 px-5">
                        <span className={`font-bold text-base ${w.label === currentWeekInfo.weekLabel ? 'text-blue-600' : 'text-slate-700'}`}>{w.label}</span>
                        {w.label === currentWeekInfo.weekLabel && (
                          <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-full">Current</span>
                        )}
                        {w.hasPartial && (
                          <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full" title="Contains partial plans">⚡ Partial</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">{w.month}</td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs ${w.count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                          <Package size={12} /> {w.count}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs ${w.totalCapacity > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                          <TrendingUp size={12} /> {w.totalCapacity}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex flex-wrap gap-1">
                          {w.plants.length > 0
                            ? w.plants.map((p, i) => (
                              <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                                <Factory size={10} /> {p}
                              </span>
                            ))
                            : <span className="text-xs text-slate-400 italic">No plans</span>
                          }
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); handleWeekClick(w.label); }}
                          className="flex items-center gap-1 ml-auto text-blue-600 hover:text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
                        >
                          Details <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showModal && (
          <PlanModal
            plan={editingPlan}
            currentYear={currentWeekInfo.year}
            currentWeekNumber={currentWeekInfo.weekNumber}
            selectedWeek={selectedWeek}
            onClose={() => { setShowModal(false); setEditingPlan(null); }}
            onSave={handleSave}
          />
        )}
        {showUploadModal && (
          <MonthlyUploadModal
            currentYear={currentWeekInfo.year}
            currentWeekNumber={currentWeekInfo.weekNumber}
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => { setShowUploadModal(false); fetchPlans(); }}
          />
        )}
      </div>
    );
  }

  const detailStats = detailPlans.reduce(
    (acc, p) => ({
      totalCapacity: acc.totalCapacity + p.capacity,
      totalValue: acc.totalValue + (p.bom?.price ?? 0) * p.capacity,
      plants: acc.plants.add(p.model?.assemblyLine?.plant?.plantName ?? ''),
      models: acc.models.add(p.model?.modelName ?? ''),
    }),
    { totalCapacity: 0, totalValue: 0, plants: new Set<string>(), models: new Set<string>() }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-6 w-full">
      <div className="max-w-[1600px] mx-auto">

        <div className="mb-8">
          <button onClick={handleBack} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 text-sm font-medium mb-4 hover:bg-white px-3 py-2 rounded-lg transition">
            <ArrowLeft size={16} /> Back to Annual View
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Week {selectedWeek} — Production Plans</h1>
              <p className="text-sm text-slate-500 mt-1">Detailed capacity and part configuration</p>
            </div>
            {selectedWeek && !isPast(selectedWeek) ? (
              <button onClick={() => { setEditingPlan(null); setShowModal(true); }} className="btn btn-primary flex items-center gap-2">
                <Plus size={18} /> Add Plan to {selectedWeek}
              </button>
            ) : (
              <div className="bg-amber-100 text-amber-800 px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2">
                🔒 Past Week — View Only
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Plans', value: detailPlans.length, color: 'text-blue-600', icon: <Package size={20} className="text-blue-600" /> },
            { label: 'Total Capacity', value: detailStats.totalCapacity, color: 'text-emerald-600', icon: <TrendingUp size={20} className="text-emerald-600" /> },
            { label: 'Active Plants', value: detailStats.plants.size, color: 'text-purple-600', icon: <Factory size={20} className="text-purple-600" /> },
            { label: 'Est. Value', value: inrFormat(detailStats.totalValue), color: 'text-orange-600', icon: <Settings size={20} className="text-orange-600" /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                {icon}
              </div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {detailPlans.some(p => p.isPartialWeek) && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
            <span className="text-lg shrink-0">⚡</span>
            <div>
              <p className="text-sm font-bold text-amber-800">This week has partial plans</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Some plans only contain days from one month because this week spans a month boundary.
                When the adjacent month's Excel is uploaded, the remaining days will be automatically
                merged in — all actuals already entered are preserved.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow border border-slate-200">
          <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarDays size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-900">Production Config — {selectedWeek}</h3>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 w-72">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search plant, model, part…"
                className="grow text-sm outline-none bg-transparent"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
              />
              {searchFilter && (
                <button onClick={() => setSearchFilter('')}><X size={14} className="text-slate-400" /></button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-600 font-bold bg-slate-100 border-b-2 border-slate-300">
                <tr>
                  <th className="py-4 px-5 text-left">Plant</th>
                  <th className="py-4 px-5 text-left">Assembly Line</th>
                  <th className="py-4 px-5 text-left">Model</th>
                  <th className="py-4 px-5 text-left">BOM / Part</th>
                  <th className="py-4 px-5 text-center">Shift</th>
                  <th className="py-4 px-5 text-center">Capacity</th>
                  <th className="py-4 px-5 text-center">Child Parts</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {detailPlans.map(plan => {
                  const plant = plan.model?.assemblyLine?.plant;
                  const al = plan.model?.assemblyLine;
                  // const canEdit = true; // ALWAYS ENABLED
                  const isPartial = plan.isPartialWeek === true;
                  return (
                    <tr key={plan._id} className={`border-b border-slate-100 hover:bg-blue-50/30 transition align-top
                      ${isPartial ? 'bg-amber-50/30' : ''}`}>

                      <td className="py-4 px-5">
                        <div className="flex items-start gap-2">
                          <Factory size={15} className="text-slate-400 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-800">{plant?.plantName || '—'}</p>
                            <p className="text-xs text-slate-400 font-mono">{plant?.plantId}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-start gap-2">
                          <Settings size={15} className="text-slate-400 mt-0.5" />
                          <div>
                            <p className="font-semibold text-slate-700">{al?.assemblyLineName || '—'}</p>
                            <p className="text-xs text-slate-400 font-mono">{al?.assemblyLineId}</p>
                            {al?.capacity != null && (
                              <p className="text-xs text-slate-400 mt-0.5">{al.capacity} units/shift</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          {plan.model?.modelName || '—'}
                        </span>
                        <p className="text-xs text-slate-400 font-mono mt-1">{plan.model?.modelId}</p>
                      </td>

                      <td className="py-4 px-5">
                        <p className="font-bold text-slate-800 font-mono text-xs">{plan.bom?.partNumber}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{plan.bom?.partName}</p>
                        {plan.bom?.price != null && (
                          <p className="text-xs text-emerald-600 font-semibold mt-1">{inrFormat(plan.bom.price)}</p>
                        )}
                      </td>

                      <td className="py-4 px-5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono font-semibold text-xs">
                            Shift {plan.shift || '—'}
                          </span>
                          {isPartial && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold flex items-center gap-1">
                              ⚡ Partial
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg font-bold text-base
                          ${isPartial ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {plan.capacity}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 font-semibold text-xs">
                          <Package size={12} /> {plan.bom?.childPartList?.length ?? 0}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => { setEditingPlan(plan); setShowModal(true); }}
                            className={`p-2 rounded-lg transition text-slate-500 hover:text-blue-600 hover:bg-blue-50`}
                            title={'Edit Plan'}
                          ><Edit size={16} /></button>
                          <button
                            onClick={() => handleDelete(plan._id, plan.week)}
                            className={`p-2 rounded-lg transition text-slate-400 hover:text-red-600 hover:bg-red-50`}
                            title={'Delete Plan'}
                          ><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {detailPlans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Package size={40} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-semibold">No plans for {selectedWeek}</p>
                      <p className="text-slate-400 text-xs mt-1">Add a production plan to get started</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <PlanModal
          plan={editingPlan}
          currentYear={currentWeekInfo.year}
          currentWeekNumber={currentWeekInfo.weekNumber}
          selectedWeek={selectedWeek}
          onClose={() => { setShowModal(false); setEditingPlan(null); }}
          onSave={handleSave}
        />
      )}
      {editingEntry && (
        <EntryModal 
          entry={editingEntry.entry} 
          plan={editingEntry.plan} 
          onSave={(date, actual, notes, redistribution) => handleSaveEntry(editingEntry.plan._id, date, actual, notes, redistribution)} 
          onClose={() => setEditingEntry(null)} 
        />
      )}
      {showUploadModal && (
        <MonthlyUploadModal
          currentYear={currentWeekInfo.year}
          currentWeekNumber={currentWeekInfo.weekNumber}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => { setShowUploadModal(false); fetchPlans(); }}
        />
      )}
    </div>
  );
};

// =============================================================================
// ENTRY MODAL
// =============================================================================
const EntryModal = ({ entry, plan, onSave, onClose }: {
  entry: DisplayEntry; plan: ProductionPlan;
  onSave: (date: string, actual: number | null, notes: string, redistribution?: { date: string, addedPlanned: number }[]) => Promise<void>;
  onClose: () => void;
}) => {
  const [actual, setActual]   = useState(entry.actual?.toString() ?? '');
  const [notes, setNotes]     = useState(entry.notes);
  const [saving, setSaving]   = useState(false);
  
  const [distMode, setDistMode] = useState<'even' | 'custom' | null>('even');
  const [customDist, setCustomDist] = useState<Record<string, string>>({});

  const parsed = actual !== '' ? parseInt(actual) : null;
  const diff   = parsed !== null ? parsed - entry.planned : null; 
  const bom = g.bom(plan);

  const varianceType = diff !== null && diff > 0 ? 'surplus' : 'shortfall';
  const varianceAmount = diff !== null ? Math.abs(diff) : 0;

  const futureDays = useMemo(() => {
    return enrichEntries(plan).filter(e => e.date > entry.date);
  }, [plan, entry.date]);

  const evenSplit = useMemo(() => {
    if (futureDays.length === 0 || varianceAmount <= 0) return [];
    const base = Math.floor(varianceAmount / futureDays.length);
    let remainder = varianceAmount % futureDays.length;
    
    return futureDays.map(fd => {
      const val = base + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      return { date: fd.date, label: fd.dayLabel, val, originalPlanned: fd.planned };
    });
  }, [futureDays, varianceAmount]);

  const customTotal = Object.values(customDist).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  const customRemaining = varianceAmount - customTotal;

  const isInvalidActual = actual !== '' && parsed !== null && parsed < 0;
  const isClearing = actual === '';
  const needsRedistribution = varianceAmount > 0 && futureDays.length > 0;

  const evenInvalid = distMode === 'even' && varianceType === 'surplus' && evenSplit.some(s => s.val > s.originalPlanned);
  const customInvalid = distMode === 'custom' && varianceType === 'surplus' && futureDays.some(fd => (parseInt(customDist[fd.date]) || 0) > fd.planned);

  const canSaveRedistribution = !needsRedistribution || 
    (distMode === 'even' && !evenInvalid) || 
    (distMode === 'custom' && customTotal === varianceAmount && !customInvalid);

  const handleSave = async () => {
    if (parsed === null && !isClearing) return;
    setSaving(true);
    
    let redistributionPayload: { date: string, addedPlanned: number }[] = [];
    
    if (needsRedistribution) {
      if (distMode === 'even') {
        redistributionPayload = evenSplit.map(s => ({ 
          date: s.date, 
          addedPlanned: varianceType === 'surplus' ? -Math.abs(s.val) : Math.abs(s.val)
        }));
      } else if (distMode === 'custom') {
        redistributionPayload = Object.entries(customDist)
          .filter(([_, val]) => parseInt(val) > 0)
          .map(([date, val]) => ({ 
            date, 
            addedPlanned: varianceType === 'surplus' ? -parseInt(val) : parseInt(val)
          }));
      }
    }

    await onSave(entry.date, parsed, notes, redistributionPayload.length > 0 ? redistributionPayload : undefined);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '20px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
              {plan.week} · {g.plant(plan).plantName} · {g.line(plan).assemblyLineName}
            </span>
            <button onClick={onClose} style={{ color: '#64748b', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} />
            </button>
          </div>
          <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{entry.dayLabel}, {entry.dateLabel}</div>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{bom.partNumber} · {bom.partName}</div>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Daily Target</div>
              <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>backlog-adjusted from server</div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>{entry.planned.toLocaleString()}</div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
              Actual Production <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input type="number" value={actual} onChange={e => setActual(e.target.value)} autoFocus min="0" placeholder="Clear entry"
              style={{ width: '100%', padding: '12px 16px', fontSize: 22, fontWeight: 900, border: '2px solid #e2e8f0', borderRadius: 12, outline: 'none', boxSizing: 'border-box' }} />
            
            {!needsRedistribution && diff !== null && parsed !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: diff >= 0 ? '#059669' : '#dc2626', marginTop: 6 }}>
                {diff >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {diff >= 0 ? `+${diff}` : diff} vs target · {((parsed / Math.max(entry.planned, 1)) * 100).toFixed(1)}%
              </div>
            )}
          </div>

          {needsRedistribution && (
            <div style={{ 
              background: varianceType === 'shortfall' ? '#fff7ed' : '#f0fdf4', 
              border: `1px solid ${varianceType === 'shortfall' ? '#fed7aa' : '#bbf7d0'}`, 
              borderRadius: 12, padding: 16, marginTop: 4 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                {varianceType === 'shortfall' ? <AlertTriangle size={16} style={{ color: '#ea580c' }} /> : <CheckCircle2 size={16} style={{ color: '#16a34a' }} />}
                <span style={{ fontSize: 14, fontWeight: 800, color: varianceType === 'shortfall' ? '#9a3412' : '#166534' }}>
                  {varianceType === 'shortfall' ? 'Shortfall' : 'Surplus'} of {varianceAmount} units
                </span>
              </div>
              <p style={{ fontSize: 12, color: varianceType === 'shortfall' ? '#c2410c' : '#15803d', marginBottom: 14, fontWeight: 600 }}>
                {varianceType === 'shortfall' 
                  ? 'You must redistribute this backlog to future days before saving.' 
                  : 'You must deduct this surplus from future days before saving.'}
              </p>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <button onClick={() => setDistMode('even')} 
                  style={{ 
                    flex: 1, padding: '8px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer', 
                    border: distMode === 'even' ? (varianceType === 'shortfall' ? '2px solid #f97316' : '2px solid #22c55e') : (varianceType === 'shortfall' ? '1px solid #fdba74' : '1px solid #bbf7d0'), 
                    background: distMode === 'even' ? '#fff' : (varianceType === 'shortfall' ? '#ffedd5' : '#dcfce7'), 
                    color: distMode === 'even' ? (varianceType === 'shortfall' ? '#ea580c' : '#16a34a') : (varianceType === 'shortfall' ? '#c2410c' : '#15803d') 
                  }}>
                  Evenly Across Week
                </button>
                <button onClick={() => setDistMode('custom')} 
                  style={{ 
                    flex: 1, padding: '8px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: 'pointer', 
                    border: distMode === 'custom' ? (varianceType === 'shortfall' ? '2px solid #f97316' : '2px solid #22c55e') : (varianceType === 'shortfall' ? '1px solid #fdba74' : '1px solid #bbf7d0'), 
                    background: distMode === 'custom' ? '#fff' : (varianceType === 'shortfall' ? '#ffedd5' : '#dcfce7'), 
                    color: distMode === 'custom' ? (varianceType === 'shortfall' ? '#ea580c' : '#16a34a') : (varianceType === 'shortfall' ? '#c2410c' : '#15803d') 
                  }}>
                  Custom Allocation
                </button>
              </div>

              {distMode === 'even' && (
                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {evenSplit.map(s => (
                      <div key={s.date} style={{ background: '#fff', border: `1px solid ${varianceType === 'shortfall' ? '#fed7aa' : '#bbf7d0'}`, borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: varianceType === 'shortfall' ? '#9a3412' : '#166534' }}>
                        {s.label}: {varianceType === 'shortfall' ? '+' : '-'}{s.val}
                      </div>
                    ))}
                  </div>
                  {evenInvalid && (
                    <div style={{ marginTop: 10, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                      ⚠️ Even deduction drops one or more days below 0. Please use Custom Allocation.
                    </div>
                  )}
                </div>
              )}

              {distMode === 'custom' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8 }}>
                    {futureDays.map(fd => (
                      <div key={fd.date}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: varianceType === 'shortfall' ? '#9a3412' : '#166534', display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          {fd.dayLabel}
                        </label>
                        <input type="number" min="0" max={varianceType === 'surplus' ? fd.planned : undefined} value={customDist[fd.date] || ''}
                          onChange={e => setCustomDist(p => ({ ...p, [fd.date]: e.target.value }))}
                          style={{ width: '100%', padding: '6px 8px', fontSize: 13, fontWeight: 700, border: `1px solid ${varianceType === 'shortfall' ? '#fdba74' : '#86efac'}`, borderRadius: 6, outline: 'none' }} />
                        {varianceType === 'surplus' && <div style={{fontSize: 9, color: '#6b7280', marginTop: 2}}>Max deduct: {fd.planned}</div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: customRemaining === 0 ? '#16a34a' : (varianceType === 'shortfall' ? '#ea580c' : '#15803d'), display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total {varianceType === 'shortfall' ? 'Added' : 'Deducted'}: {customTotal}</span>
                    <span>Remaining: {customRemaining}</span>
                  </div>
                  {customInvalid && (
                    <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                      ⚠️ You cannot deduct more than a day's planned target.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {varianceAmount > 0 && futureDays.length === 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
              This is the last day of the week. The {varianceType} of {varianceAmount} units cannot be redistributed and will permanently affect the weekly total.
            </div>
          )}

          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
              Remarks <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Delays, stoppages, overtime..."
              style={{ width: '100%', padding: '10px 14px', fontSize: 13, border: '2px solid #e2e8f0', borderRadius: 12, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px 0', border: '2px solid #e2e8f0', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <button disabled={isInvalidActual || saving || !canSaveRedistribution} onClick={handleSave}
            style={{ flex: 1, padding: '11px 0', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: isClearing ? '#ef4444' : '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (isInvalidActual || saving || !canSaveRedistribution) ? 0.4 : 1 }}>
            {saving ? <Loader2 className="animate-spin" size={13} /> : (isClearing ? <Trash2 size={13} /> : <Save size={13} />)}
            {saving ? 'Saving...' : (isClearing ? 'Clear Entry' : 'Save Entry')}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// PLAN MODAL
// =============================================================================

interface PlanModalProps {
  plan: ProductionPlan | null;
  currentYear: number;
  currentWeekNumber: number;
  selectedWeek: string | null;
  onClose: () => void;
  onSave: (payload: Record<string, any>) => Promise<void>;
}

const PlanModal: React.FC<PlanModalProps> = ({
  plan, currentYear, currentWeekNumber, selectedWeek, onClose, onSave,
}) => {
  const allWeeks = useMemo(buildAllWeeks, []);

  const [week, setWeek] = useState(plan?.week ?? selectedWeek ?? `W${currentWeekNumber}`);
  const [workingDays, setWorkingDays] = useState<number>(plan?.workingDays ?? 6);
  const [capacity, setCapacity] = useState<number>(plan?.capacity ?? 0);
  const [status, setStatus] = useState(plan?.status ?? 'PLANNED');
  const [notes, setNotes] = useState(plan?.notes ?? '');

  const [matrices, setMatrices] = useState<MatrixRow[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [matrixFilter, setMatrixFilter] = useState('');
  const [selectedMatrix, setSelectedMatrix] = useState<MatrixRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingMatrix(true);
      setMatrixError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/masters/matrix`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        const result = await res.json();
        const rows: MatrixRow[] = Array.isArray(result) ? result : [];
        setMatrices(rows);

        if (plan?.matrixRef) {
          const match = rows.find(r => r._id === plan.matrixRef);
          if (match) setSelectedMatrix(match);
        }
      } catch (err: any) {
        console.error('[Matrix] fetch error:', err);
        setMatrixError(`Failed to load Matrix configurations: ${err.message}`);
      } finally {
        setLoadingMatrix(false);
      }
    })();
  }, []);

  const handleMatrixSelect = (id: string) => {
    const row = matrices.find(r => r._id === id) ?? null;
    setSelectedMatrix(row);
    if (row && !plan) {
      setCapacity(row.model?.assemblyLine?.capacity ?? 0);
    }
  };

  const filteredMatrices = useMemo(() => {
    const q = matrixFilter.toLowerCase();
    if (!q) return matrices;
    return matrices.filter(m =>
      m.model?.assemblyLine?.plant?.plantName?.toLowerCase().includes(q) ||
      m.model?.assemblyLine?.assemblyLineName?.toLowerCase().includes(q) ||
      m.model?.modelName?.toLowerCase().includes(q) ||
      m.bom?.partNumber?.toLowerCase().includes(q) ||
      m.bom?.partName?.toLowerCase().includes(q)
    );
  }, [matrices, matrixFilter]);

  // FORCE ENABLED: disabled past selection check so saving is always allowed
  // const isPastSelection = false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatrix) { alert('Please select a Matrix configuration.'); return; }

    setSaving(true);
    try {
      await onSave({
        matrixId: selectedMatrix._id,
        week,
        year: currentYear,
        workingDays,
        capacity,
        status,
        notes,
      });
    } catch (err: any) {
      alert(err.message ?? 'Error saving plan.');
    } finally {
      setSaving(false);
    }
  };

  const m = selectedMatrix;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {plan ? 'Edit Production Plan' : 'Add Production Plan'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loadingMatrix ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
              <span className="text-slate-600 font-medium">Loading Matrix configurations…</span>
            </div>
          ) : matrixError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-center">
              <AlertCircle className="text-red-500 mx-auto mb-2" size={36} />
              <p className="text-red-700 font-semibold">{matrixError}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Week <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={week}
                    onChange={e => setWeek(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    required
                  >
                    {Object.entries(
                      allWeeks.reduce<Record<string, typeof allWeeks>>((acc, w) => {
                        (acc[w.month] = acc[w.month] || []).push(w);
                        return acc;
                      }, {})
                    ).map(([month, weeks]) => (
                      <optgroup key={month} label={month}>
                        {weeks.map(w => {
                          const past = w.weekNumber < currentWeekNumber;
                          const cur = w.weekNumber === currentWeekNumber;
                          return (
                            <option key={w.label} value={w.label}
                              style={{ color: past ? '#94a3b8' : cur ? '#2563eb' : undefined, fontWeight: cur ? 'bold' : undefined }}>
                              {w.label}{cur ? ' (Current)' : past ? ' (Past)' : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Year</label>
                  <input
                    type="number" value={currentYear} disabled
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Search Matrix Config
                </label>
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 mb-2 bg-blue-50/50">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Filter by plant, model, part number…"
                    className="grow text-sm outline-none bg-transparent"
                    value={matrixFilter}
                    onChange={e => setMatrixFilter(e.target.value)}
                  />
                  {matrixFilter && (
                    <button type="button" onClick={() => setMatrixFilter('')}>
                      <X size={13} className="text-slate-400" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">{filteredMatrices.length} of {matrices.length} configurations shown</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Matrix Configuration <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs font-normal text-slate-400">(Plant → Line → Model → BOM all auto-fill)</span>
                </label>
                <select
                  value={selectedMatrix?._id ?? ''}
                  onChange={e => handleMatrixSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  required
                >
                  <option value="">— Select Matrix Configuration —</option>
                  {filteredMatrices.map(m => (
                    <option key={m._id} value={m._id}>
                      Shift {m.shift} | {m.model?.assemblyLine?.plant?.plantName} › {m.model?.assemblyLine?.assemblyLineName} › {m.model?.modelName} | {m.bom?.partNumber} ({m.bom?.partName})
                    </option>
                  ))}
                </select>
                {!loadingMatrix && matrices.length === 0 && !matrixError && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    <p className="font-semibold flex items-center gap-1 mb-1">
                      <AlertCircle size={12} /> No Matrix configurations found
                    </p>
                    <p>Go to <strong>Masters → Matrix tab</strong> and create at least one Matrix entry (Model + BOM + Shift) before adding a production plan.</p>
                  </div>
                )}
              </div>

              {m && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Auto-filled from Matrix selection</p>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded font-mono font-semibold">{m.model?.assemblyLine?.plant?.plantId}</span>
                    <span className="font-semibold text-slate-600">{m.model?.assemblyLine?.plant?.plantName}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded font-mono font-semibold">{m.model?.assemblyLine?.assemblyLineId}</span>
                    <span className="font-semibold text-slate-600">{m.model?.assemblyLine?.assemblyLineName}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-semibold">{m.model?.modelName}</span>
                  </div>

                  <div className="flex items-start gap-4 pt-1 border-t border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Part Number</p>
                      <p className="font-mono font-bold text-slate-800 text-sm">{m.bom?.partNumber}</p>
                    </div>
                    <div className="grow">
                      <p className="text-xs text-slate-500 mb-0.5">Part Name</p>
                      <p className="font-semibold text-slate-700 text-sm">{m.bom?.partName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-0.5">Price</p>
                      <p className="font-semibold text-emerald-600 text-sm">{inrFormat(m.bom?.price ?? 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-500">Shift: </span>
                      <span className="font-mono font-bold text-slate-700">Shift {m.shift}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Line capacity: </span>
                      <span className="font-bold text-slate-700">{m.model?.assemblyLine?.capacity} units/8 hrs</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Child parts: </span>
                      <span className="font-bold text-blue-600">{m.bom?.childPartList?.length ?? 0}</span>
                    </div>
                  </div>

                  {(m.bom?.childPartList?.length ?? 0) > 0 && (
                    <details className="text-xs pt-1">
                      <summary className="cursor-pointer text-slate-500 hover:text-blue-600 font-medium select-none">
                        Show {m.bom.childPartList.length} child parts
                      </summary>
                      <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                        {m.bom.childPartList.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 px-2 py-1 bg-white border border-slate-200 rounded text-xs">
                            <span className="font-mono font-semibold text-slate-700 shrink-0">{c.partCode}</span>
                            <span className="text-slate-600 grow">{c.description}</span>
                            <span className="text-slate-500 shrink-0">×{c.qty} {c.unit}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Capacity (units/week)
                  </label>
                  <input
                    type="number" min={0} value={capacity}
                    onChange={e => setCapacity(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder="Defaults to line capacity"
                  />
                  <p className="text-xs text-slate-400 mt-1">Override if different from line default</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Working Days <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={workingDays}
                    onChange={e => setWorkingDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    required
                  >
                    <option value={6}>6 Days (Mon–Sat)</option>
                    <option value={7}>7 Days (Mon–Sun)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  {['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional notes…"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-200">
                <button type="button" onClick={onClose} className="flex-1 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedMatrix}
                  className="flex-1 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <><Loader2 className="animate-spin" size={16} /> Saving…</> : <><Save size={16} /> {plan ? 'Update Plan' : 'Create Plan'}</>}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// MONTHLY UPLOAD MODAL
// =============================================================================

interface MonthlyUploadModalProps {
  currentYear: number;
  currentWeekNumber: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface WeekManpower { weekLabel: string; manpower: number; }

function getWeeksForMonth(month: number, year: number): string[] {
  const weeks = new Set<string>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const weekNum = getCustomWeek(date);
    if (weekNum >= 1 && weekNum <= 52) {
      weeks.add(`W${weekNum}`);
    }
  }
  return [...weeks].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
}

function getSplitWeeks(month: number, year: number): { week: string; note: string }[] {
  const split: { week: string; note: string }[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthName = MONTH_NAMES[(month + 11) % 12];
  const nextMonthName = MONTH_NAMES[(month + 1) % 12];

  const getWeekStr = (date: Date) => `W${getCustomWeek(date)}`;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month, daysInMonth);
  
  const firstWk = getWeekStr(firstDay);
  const lastWk = getWeekStr(lastDay);

  if (firstDay.getDay() !== 1) {
    split.push({ week: firstWk, note: `Starts in ${prevMonthName} — remaining days added when ${prevMonthName} is uploaded` });
  }
  if (lastDay.getDay() !== 0 && lastWk !== firstWk) {
    split.push({ week: lastWk, note: `Ends in ${nextMonthName} — remaining days added when ${nextMonthName} is uploaded` });
  } else if (lastDay.getDay() !== 0 && lastWk === firstWk) {
    const existing = split.find(s => s.week === lastWk);
    if (!existing) {
      split.push({ week: lastWk, note: `Spans ${prevMonthName}–${nextMonthName} — days from both months merged automatically` });
    }
  }

  return split;
}

const MonthlyUploadModal: React.FC<MonthlyUploadModalProps> = ({
  currentYear, currentWeekNumber, onClose, onSuccess,
}:{currentYear:any, currentWeekNumber:any, onClose:any, onSuccess:any}) => {
  console.log(currentWeekNumber);
  const today = new Date();
  const currentMonth = today.getMonth();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const availableMonths = Array.from({ length: 13 }, (_, i) => {
    const totalMonth = currentMonth + i;
    return { month: totalMonth % 12, year: currentYear + Math.floor(totalMonth / 12) };
  });
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [weekManpower, setWeekManpower] = useState<WeekManpower[]>([]);
  const [uploading, setUploading] = useState(false);

  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const weeks = getWeeksForMonth(selectedMonth, selectedYear);
    setWeekManpower(weeks.map(w => ({ weekLabel: w, manpower: 0 })));
  }, [selectedMonth, selectedYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!f) { setFile(null); return; }
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setFileError('Please upload an .xlsx or .xls file');
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const manpowerObj: Record<string, number> = {};
      weekManpower.forEach(w => { if (w.manpower > 0) manpowerObj[w.weekLabel] = w.manpower; });

      const fd = new FormData();
      fd.append('file', file);
      fd.append('year', String(selectedYear));
      fd.append('manpower', JSON.stringify(manpowerObj));

      const res = await fetch(`${API_BASE_URL}/production-plans/upload-monthly-excel`, {
        method: 'POST', body: fd,
      });
      const data = await res.json();
      setResult(data);
      setStep(3);
    } catch (err: any) {
      setResult({ success: false, message: err.message });
      setStep(3);
    } finally {
      setUploading(false);
    }
  };

  const selectedMonthLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  const weeksInMonth = getWeeksForMonth(selectedMonth, selectedYear);

  const stepLabels = ['Select Month', 'Upload & Manpower', 'Results'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Upload Monthly Production Plan</h2>
              <p className="text-xs text-slate-500">Auto-matches parts to Matrix configurations</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-3 shrink-0">
          <div className="flex items-center gap-1">
            {stepLabels.map((label, i) => {
              const s = i + 1;
              const done = step > s;
              const current = step === s;
              return (
                <React.Fragment key={s}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition
                    ${current ? 'bg-blue-600 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? <CheckCircle2 size={12} /> : <span className="w-3.5 text-center">{s}</span>}
                    {label}
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 rounded ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">

          {/* ════ STEP 1 — Month ════ */}
          {step === 1 && (
            <div className="space-y-4 pt-1">
              <p className="text-sm font-semibold text-slate-700">Select the planning month</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {availableMonths.map((mo, i) => {
                  const selected = mo.month === selectedMonth && mo.year === selectedYear;
                  return (
                    <button
                      key={i} type="button"
                      onClick={() => { setSelectedMonth(mo.month); setSelectedYear(mo.year); }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold border text-center transition
                        ${selected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'}`}
                    >
                      {MONTH_NAMES[mo.month].slice(0, 3)}
                      {mo.year !== currentYear && <span className="block text-[10px] opacity-70">{mo.year}</span>}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const splitInfo = getSplitWeeks(selectedMonth, selectedYear);
                const splitSet = new Set(splitInfo.map(s => s.week));
                return (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                      <p className="text-xs font-semibold text-blue-700 mb-2">
                        📅 {selectedMonthLabel} spans:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {weeksInMonth.map(w => (
                          <span key={w} className={`px-2.5 py-1 rounded-lg text-xs font-bold border
                            ${splitSet.has(w)
                              ? 'bg-amber-100 border-amber-300 text-amber-700'
                              : 'bg-white border-blue-200 text-blue-600'}`}>
                            {w}{splitSet.has(w) ? ' ⚡' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    {splitInfo.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                        <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                          <Info size={13} /> {splitInfo.length} split week{splitInfo.length > 1 ? 's' : ''} detected
                        </p>
                        {splitInfo.map(s => (
                          <div key={s.week} className="flex items-start gap-2 text-xs text-amber-700">
                            <span className="font-bold shrink-0">{s.week}:</span>
                            <span>{s.note}</span>
                          </div>
                        ))}
                        <p className="text-[11px] text-amber-600 border-t border-amber-200 pt-2 mt-1">
                          Split weeks are handled automatically — this upload stores the days it has.
                          The adjacent month's upload merges in the remaining days without overwriting actuals.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ════ STEP 2 — Upload + Manpower ════ */}
          {step === 2 && (
            <div className="space-y-5 pt-1">

              {/* Month reminder */}
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                <CalendarDays size={15} className="text-blue-500 shrink-0" />
                Planning month: <strong className="text-slate-800">{selectedMonthLabel}</strong>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500 text-xs">{weeksInMonth.join(', ')}</span>
              </div>

              {/* Excel upload zone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Excel File <span className="text-red-500">*</span>
                </label>
                <label className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-7 cursor-pointer transition
                  ${file ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/20'}`}>
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
                  {file ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-700">{file.name}</p>
                        <p className="text-xs text-emerald-600">{(file.size / 1024).toFixed(1)} KB · ready to upload</p>
                      </div>
                      <button type="button" onClick={e => { e.preventDefault(); setFile(null); }}
                        className="ml-3 text-slate-400 hover:text-red-500 transition p-1">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={30} className="text-slate-300" />
                      <p className="text-sm font-semibold text-slate-500">Click to browse or drag & drop</p>
                      <p className="text-xs text-slate-400">.xlsx or .xls</p>
                    </>
                  )}
                </label>
                {fileError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {fileError}
                  </p>
                )}

                {/* Format hint */}
                <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5"><Info size={12} /> Expected column layout:</p>
                  <p className="font-mono bg-white/60 rounded px-2 py-1 border border-amber-200 text-[11px]">
                    A: Plant (ignored) &nbsp;|&nbsp; B: FG Part No &nbsp;|&nbsp; C: FG Description &nbsp;|&nbsp; D onwards: dates (DD-MM-YYYY)
                  </p>
                  <p>Each part number is auto-matched to its Matrix configuration. Parts not in any Matrix will be flagged.</p>
                </div>
              </div>

              {/* Manpower per week */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-0.5">
                  Manpower Available
                  <span className="ml-2 text-xs font-normal text-slate-400">optional — per week</span>
                </label>
                <p className="text-xs text-slate-400 mb-2.5">Enter available headcount for each week if different from default</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {weekManpower.map((wm, i) => (
                    <div key={wm.weekLabel} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-blue-600 mb-1.5">{wm.weekLabel}</p>
                      <input
                        type="number" min={0}
                        value={wm.manpower || ''}
                        onChange={e => {
                          const u = [...weekManpower];
                          u[i].manpower = parseInt(e.target.value) || 0;
                          setWeekManpower(u);
                        }}
                        placeholder="—"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════ STEP 3 — Results ════ */}
          {step === 3 && result && (
            <div className="space-y-4 pt-1">

              {/* Top result banner */}
              <div className={`rounded-xl border p-4 flex items-start gap-3
                ${result.success ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
                {result.success
                  ? <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                  : <AlertCircle size={22} className="text-red-500    shrink-0 mt-0.5" />}
                <div>
                  <p className={`font-bold text-sm ${result.success ? 'text-emerald-800' : 'text-red-700'}`}>
                    {result.success ? 'Import Complete' : 'Import Failed'}
                  </p>
                  <p className={`text-xs mt-0.5 ${result.success ? 'text-emerald-700' : 'text-red-600'}`}>
                    {result.message}
                  </p>
                </div>
              </div>

              {result.success && result.summary && (
                <>
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Created', value: result.summary.created, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                      { label: 'Updated', value: result.summary.updated, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                      { label: 'Skipped', value: result.summary.skipped, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' },
                      { label: 'Not Found', value: result.summary.notFound?.length ?? 0, color: result.summary.notFound?.length > 0 ? 'text-red-600' : 'text-slate-400', bg: result.summary.notFound?.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200' },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} className={`${bg} border rounded-xl p-3 text-center`}>
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Not-found parts — shown prominently */}
                  {result.summary.notFound?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                        <AlertCircle size={16} />
                        {result.summary.notFound.length} part(s) not found in any Matrix configuration
                      </p>
                      <p className="text-xs text-red-600 mb-3">
                        These parts exist in your Excel file but have no matching Matrix entry.
                        Go to <strong>Masters → Matrix</strong> to add them, then re-upload.
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {result.summary.notFound.map((p: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-white border border-red-200 rounded-lg px-3 py-2 text-xs">
                            <span className="font-mono font-bold text-red-700 shrink-0">{p.partNumber}</span>
                            <span className="text-slate-600 truncate">{p.partName}</span>
                            <span className="ml-auto text-red-400 shrink-0">No Matrix match</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Split weeks notice */}
                  {result.summary.splitWeeks?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-amber-700 mb-1.5 flex items-center gap-2">
                        <Info size={16} /> {result.summary.splitWeeks.length} split week(s) — partially filled
                      </p>
                      <p className="text-xs text-amber-700 mb-2.5">
                        These weeks span two months. This upload has stored the days it contains.
                        When you upload the <strong>adjacent month</strong>, the remaining days will be
                        automatically merged in — existing actuals are never overwritten.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.summary.splitWeeks.map((w: string) => (
                          <span key={w} className="px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold">
                            {w} ⚡ partial
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Successfully processed parts */}
                  {result.summary.processed?.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                          Successfully Processed Parts ({result.summary.processed.length})
                        </p>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {result.summary.processed.map((p: any, i: number) => {
                          const pSplitSet = new Set<string>(p.splitWeeks ?? []);
                          return (
                            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 text-xs">
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              <span className="font-mono font-bold text-slate-700 shrink-0 w-24">{p.partNumber}</span>
                              <span className="text-slate-600 truncate grow">{p.partName}</span>
                              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                                {p.weeks?.map((w: string) => (
                                  <span key={w} title={pSplitSet.has(w) ? 'Split week — partial days from this month' : undefined}
                                    className={`px-1.5 py-0.5 rounded font-semibold ${pSplitSet.has(w) ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'}`}>
                                    {w}{pSplitSet.has(w) ? ' ⚡' : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Errors if any */}
                  {result.summary.errors?.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
                      <p className="font-bold mb-1">⚠️ {result.summary.errors.length} unexpected error(s):</p>
                      {result.summary.errors.map((e: any, i: number) => (
                        <p key={i} className="font-mono">{e.partNumber} · {e.week}: {e.error}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between shrink-0">
          {/* Left: back / cancel */}
          <button
            type="button"
            onClick={() => {
              if (step === 3 && result?.success) { onSuccess(); return; }
              if (step > 1) setStep((step - 1) as any);
              else onClose();
            }}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-100 transition"
          >
            {step === 1 ? 'Cancel' : step === 3 ? (result?.success ? 'View Plans' : '← Back') : '← Back'}
          </button>

          {/* Right: action */}
          {step === 1 && (
            <button type="button" onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition">
              Next →
            </button>
          )}
          {step === 2 && (
            <button type="button" disabled={!file || uploading} onClick={handleUpload}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading
                ? <><Loader2 className="animate-spin" size={16} /> Importing…</>
                : <><Upload size={16} /> Import Plans</>}
            </button>
          )}
          {step === 3 && result?.success && (
            <button type="button" onClick={onSuccess}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition">
              <CheckCircle2 size={16} /> Done — View Plans
            </button>
          )}
          {step === 3 && !result?.success && (
            <button type="button" onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition">
              ← Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionPlanningScheduler;