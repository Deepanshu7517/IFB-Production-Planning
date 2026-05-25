import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  CalendarDays,
  Calendar,
  Factory,
  TrendingUp,
  TrendingDown,
  X,
  Save,
  Loader2,
  BarChart3,
  AlertTriangle,
  Package,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
  Upload,
  Info,
} from "lucide-react";

let currentHost = window.location.hostname;

if (currentHost === "tauri.localhost") {
  currentHost = "localhost";
}

const API_BASE = `http://${currentHost}:5001/api`;
const API_BASE_URL = API_BASE;
// =============================================================================
// TYPES
// =============================================================================
interface ChildPart {
  partCode: string;
  description: string;
  qty: number;
  unit: string;
}

interface PlanModel {
  modelId: string;
  modelName: string;
  assemblyLine: {
    assemblyLineId: string;
    assemblyLineName: string;
    capacity: number;
    plant: { plantId: string; plantName: string };
  };
}

interface PlanBom {
  partNumber: string;
  partName: string;
  price: number;
  childPartList: ChildPart[];
}

interface DailyEntry {
  date: string;
  planned: number;
  actual: number | null;
  notes: string;
  shift: string;
}

interface ProductionPlan {
  _id: string;
  week: string;
  year: number;
  model: PlanModel;
  bom: PlanBom;
  capacity: number;
  workingDays: number;
  status: string;
  notes: string;
  createdAt: string;
  dailyEntries: DailyEntry[];
  shift?: string;
}

interface DisplayEntry extends DailyEntry {
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}
// =============================================================================
// MONTHLY UPLOAD MODAL
// =============================================================================

interface MonthlyUploadModalProps {
  currentYear: number;
  currentWeekNumber: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface WeekManpower {
  weekLabel: string;
  manpower: number;
}
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
function getSplitWeeks(
  month: number,
  year: number,
): { week: string; note: string }[] {
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
    split.push({
      week: firstWk,
      note: `Starts in ${prevMonthName} — remaining days added when ${prevMonthName} is uploaded`,
    });
  }
  if (lastDay.getDay() !== 0 && lastWk !== firstWk) {
    split.push({
      week: lastWk,
      note: `Ends in ${nextMonthName} — remaining days added when ${nextMonthName} is uploaded`,
    });
  } else if (lastDay.getDay() !== 0 && lastWk === firstWk) {
    const existing = split.find((s) => s.week === lastWk);
    if (!existing) {
      split.push({
        week: lastWk,
        note: `Spans ${prevMonthName}–${nextMonthName} — days from both months merged automatically`,
      });
    }
  }

  return split;
}
const MonthlyUploadModal: React.FC<MonthlyUploadModalProps> = ({
  currentYear,
  currentWeekNumber,
  onClose,
  onSuccess,
}: {
  currentYear: any;
  currentWeekNumber: any;
  onClose: any;
  onSuccess: any;
}) => {
  console.log(currentWeekNumber);
  const today = new Date();
  const currentMonth = today.getMonth();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const availableMonths = Array.from({ length: 13 }, (_, i) => {
    const totalMonth = currentMonth + i;
    return {
      month: totalMonth % 12,
      year: currentYear + Math.floor(totalMonth / 12),
    };
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
    setWeekManpower(weeks.map((w) => ({ weekLabel: w, manpower: 0 })));
  }, [selectedMonth, selectedYear]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setFileError("Please upload an .xlsx or .xls file");
      setFile(null);
      e.target.value = "";
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
      weekManpower.forEach((w) => {
        if (w.manpower > 0) manpowerObj[w.weekLabel] = w.manpower;
      });

      const fd = new FormData();
      fd.append("file", file);
      fd.append("year", String(selectedYear));
      fd.append("manpower", JSON.stringify(manpowerObj));

      const res = await fetch(
        `${API_BASE_URL}/production-plans/upload-monthly-excel`,
        {
          method: "POST",
          body: fd,
        },
      );
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

  const stepLabels = ["Select Month", "Upload & Manpower", "Results"];

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
              <h2 className="text-lg font-bold text-slate-900">
                Upload Monthly Production Plan
              </h2>
              <p className="text-xs text-slate-500">
                Auto-matches parts to Matrix configurations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
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
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition
                    ${current ? "bg-blue-600 text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
                  >
                    {done ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <span className="w-3.5 text-center">{s}</span>
                    )}
                    {label}
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 rounded ${done ? "bg-emerald-400" : "bg-slate-200"}`}
                    />
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
              <p className="text-sm font-semibold text-slate-700">
                Select the planning month
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {availableMonths.map((mo, i) => {
                  const selected =
                    mo.month === selectedMonth && mo.year === selectedYear;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(mo.month);
                        setSelectedYear(mo.year);
                      }}
                      className={`py-2.5 px-2 rounded-xl text-xs font-semibold border text-center transition
                        ${
                          selected
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                    >
                      {MONTH_NAMES[mo.month].slice(0, 3)}
                      {mo.year !== currentYear && (
                        <span className="block text-[10px] opacity-70">
                          {mo.year}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {(() => {
                const splitInfo = getSplitWeeks(selectedMonth, selectedYear);
                const splitSet = new Set(splitInfo.map((s) => s.week));
                return (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                      <p className="text-xs font-semibold text-blue-700 mb-2">
                        📅 {selectedMonthLabel} spans:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {weeksInMonth.map((w) => (
                          <span
                            key={w}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border
                            ${
                              splitSet.has(w)
                                ? "bg-amber-100 border-amber-300 text-amber-700"
                                : "bg-white border-blue-200 text-blue-600"
                            }`}
                          >
                            {w}
                            {splitSet.has(w) ? " ⚡" : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                    {splitInfo.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                        <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                          <Info size={13} /> {splitInfo.length} split week
                          {splitInfo.length > 1 ? "s" : ""} detected
                        </p>
                        {splitInfo.map((s) => (
                          <div
                            key={s.week}
                            className="flex items-start gap-2 text-xs text-amber-700"
                          >
                            <span className="font-bold shrink-0">
                              {s.week}:
                            </span>
                            <span>{s.note}</span>
                          </div>
                        ))}
                        <p className="text-[11px] text-amber-600 border-t border-amber-200 pt-2 mt-1">
                          Split weeks are handled automatically — this upload
                          stores the days it has. The adjacent month's upload
                          merges in the remaining days without overwriting
                          actuals.
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
                Planning month:{" "}
                <strong className="text-slate-800">{selectedMonthLabel}</strong>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500 text-xs">
                  {weeksInMonth.join(", ")}
                </span>
              </div>

              {/* Excel upload zone */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Excel File <span className="text-red-500">*</span>
                </label>
                <label
                  className={`relative flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-7 cursor-pointer transition
                  ${file ? "border-emerald-400 bg-emerald-50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/20"}`}
                >
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2
                        size={24}
                        className="text-emerald-500 shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-emerald-700">
                          {file.name}
                        </p>
                        <p className="text-xs text-emerald-600">
                          {(file.size / 1024).toFixed(1)} KB · ready to upload
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFile(null);
                        }}
                        className="ml-3 text-slate-400 hover:text-red-500 transition p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={30} className="text-slate-300" />
                      <p className="text-sm font-semibold text-slate-500">
                        Click to browse or drag & drop
                      </p>
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
                  <p className="font-semibold flex items-center gap-1.5">
                    <Info size={12} /> Expected column layout:
                  </p>
                  <p className="font-mono bg-white/60 rounded px-2 py-1 border border-amber-200 text-[11px]">
                    A: Plant (ignored) &nbsp;|&nbsp; B: FG Part No &nbsp;|&nbsp;
                    C: FG Description &nbsp;|&nbsp; D onwards: dates
                    (DD-MM-YYYY)
                  </p>
                  <p>
                    Each part number is auto-matched to its Matrix
                    configuration. Parts not in any Matrix will be flagged.
                  </p>
                </div>
              </div>

              {/* Manpower per week */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-0.5">
                  Manpower Available
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    optional — per week
                  </span>
                </label>
                <p className="text-xs text-slate-400 mb-2.5">
                  Enter available headcount for each week if different from
                  default
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {weekManpower.map((wm, i) => (
                    <div
                      key={wm.weekLabel}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                    >
                      <p className="text-xs font-bold text-blue-600 mb-1.5">
                        {wm.weekLabel}
                      </p>
                      <input
                        type="number"
                        min={0}
                        value={wm.manpower || ""}
                        onChange={(e) => {
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
              <div
                className={`rounded-xl border p-4 flex items-start gap-3
                ${result.success ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300"}`}
              >
                {result.success ? (
                  <CheckCircle2
                    size={22}
                    className="text-emerald-600 shrink-0 mt-0.5"
                  />
                ) : (
                  <AlertCircle
                    size={22}
                    className="text-red-500    shrink-0 mt-0.5"
                  />
                )}
                <div>
                  <p
                    className={`font-bold text-sm ${result.success ? "text-emerald-800" : "text-red-700"}`}
                  >
                    {result.success ? "Import Complete" : "Import Failed"}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${result.success ? "text-emerald-700" : "text-red-600"}`}
                  >
                    {result.message}
                  </p>
                </div>
              </div>

              {result.success && result.summary && (
                <>
                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        label: "Created",
                        value: result.summary.created,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50 border-emerald-200",
                      },
                      {
                        label: "Updated",
                        value: result.summary.updated,
                        color: "text-blue-600",
                        bg: "bg-blue-50 border-blue-200",
                      },
                      {
                        label: "Skipped",
                        value: result.summary.skipped,
                        color: "text-slate-500",
                        bg: "bg-slate-50 border-slate-200",
                      },
                      {
                        label: "Not Found",
                        value: result.summary.notFound?.length ?? 0,
                        color:
                          result.summary.notFound?.length > 0
                            ? "text-red-600"
                            : "text-slate-400",
                        bg:
                          result.summary.notFound?.length > 0
                            ? "bg-red-50 border-red-200"
                            : "bg-slate-50 border-slate-200",
                      },
                    ].map(({ label, value, color, bg }) => (
                      <div
                        key={label}
                        className={`${bg} border rounded-xl p-3 text-center`}
                      >
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Not-found parts — shown prominently */}
                  {result.summary.notFound?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                        <AlertCircle size={16} />
                        {result.summary.notFound.length} part(s) not found in
                        any Matrix configuration
                      </p>
                      <p className="text-xs text-red-600 mb-3">
                        These parts exist in your Excel file but have no
                        matching Matrix entry. Go to{" "}
                        <strong>Masters → Matrix</strong> to add them, then
                        re-upload.
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {result.summary.notFound.map((p: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 bg-white border border-red-200 rounded-lg px-3 py-2 text-xs"
                          >
                            <span className="font-mono font-bold text-red-700 shrink-0">
                              {p.partNumber}
                            </span>
                            <span className="text-slate-600 truncate">
                              {p.partName}
                            </span>
                            <span className="ml-auto text-red-400 shrink-0">
                              No Matrix match
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Split weeks notice */}
                  {result.summary.splitWeeks?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-amber-700 mb-1.5 flex items-center gap-2">
                        <Info size={16} /> {result.summary.splitWeeks.length}{" "}
                        split week(s) — partially filled
                      </p>
                      <p className="text-xs text-amber-700 mb-2.5">
                        These weeks span two months. This upload has stored the
                        days it contains. When you upload the{" "}
                        <strong>adjacent month</strong>, the remaining days will
                        be automatically merged in — existing actuals are never
                        overwritten.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.summary.splitWeeks.map((w: string) => (
                          <span
                            key={w}
                            className="px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold"
                          >
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
                          Successfully Processed Parts (
                          {result.summary.processed.length})
                        </p>
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {result.summary.processed.map((p: any, i: number) => {
                          const pSplitSet = new Set<string>(p.splitWeeks ?? []);
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 text-xs"
                            >
                              <CheckCircle2
                                size={14}
                                className="text-emerald-500 shrink-0"
                              />
                              <span className="font-mono font-bold text-slate-700 shrink-0 w-24">
                                {p.partNumber}
                              </span>
                              <span className="text-slate-600 truncate grow">
                                {p.partName}
                              </span>
                              <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                                {p.weeks?.map((w: string) => (
                                  <span
                                    key={w}
                                    title={
                                      pSplitSet.has(w)
                                        ? "Split week — partial days from this month"
                                        : undefined
                                    }
                                    className={`px-1.5 py-0.5 rounded font-semibold ${pSplitSet.has(w) ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-600"}`}
                                  >
                                    {w}
                                    {pSplitSet.has(w) ? " ⚡" : ""}
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
                      <p className="font-bold mb-1">
                        ⚠️ {result.summary.errors.length} unexpected error(s):
                      </p>
                      {result.summary.errors.map((e: any, i: number) => (
                        <p key={i} className="font-mono">
                          {e.partNumber} · {e.week}: {e.error}
                        </p>
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
              if (step === 3 && result?.success) {
                onSuccess();
                return;
              }
              if (step > 1) setStep((step - 1) as any);
              else onClose();
            }}
            className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-100 transition"
          >
            {step === 1
              ? "Cancel"
              : step === 3
                ? result?.success
                  ? "View Plans"
                  : "← Back"
                : "← Back"}
          </button>

          {/* Right: action */}
          {step === 1 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
            >
              Next →
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              disabled={!file || uploading}
              onClick={handleUpload}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Importing…
                </>
              ) : (
                <>
                  <Upload size={16} /> Import Plans
                </>
              )}
            </button>
          )}
          {step === 3 && result?.success && (
            <button
              type="button"
              onClick={onSuccess}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition"
            >
              <CheckCircle2 size={16} /> Done — View Plans
            </button>
          )}
          {step === 3 && !result?.success && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition"
            >
              ← Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
// =============================================================================
// HELPERS
// =============================================================================
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getCustomWeekInfo(date: Date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const weekYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );

  return {
    weekNumber: weekNum,
    weekLabel: `W${weekNum}`,
    weekYear,
  };
}

function getCustomWeek(date: Date) {
  return getCustomWeekInfo(date).weekNumber;
}

function getCurrentWeekInfo() {
  const today = new Date();
  const { weekNumber, weekLabel, weekYear } = getCustomWeekInfo(today);

  return {
    weekNumber,
    weekLabel,
    weekYear,
    year: today.getFullYear(),
    month: today.toLocaleDateString("en-US", { month: "long" }),
  };
}

function getWeeksInYear(year: number) {
  return getCustomWeek(new Date(year, 11, 28));
}

function getWeeksInMonth(year: number, monthIndex: number): string[] {
  const weeks = new Set<string>();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const { weekNumber } = getCustomWeekInfo(new Date(year, monthIndex, day));
    weeks.add(`W${weekNumber}`);
  }

  return Array.from(weeks).sort(
    (a, b) =>
      parseInt(a.replace("W", ""), 10) - parseInt(b.replace("W", ""), 10),
  );
}

function enrichEntries(plan: ProductionPlan): DisplayEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entries = (plan.dailyEntries ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  return entries.map((entry, i) => {
    const d = new Date(entry.date + "T00:00:00");
    const dMid = new Date(d);
    dMid.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    const dayIdx = dow === 0 ? 6 : dow - 1;
    return {
      ...entry,
      dayLabel: DAY_NAMES[dayIdx] ?? `D${i + 1}`,
      dateLabel: d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      isToday: dMid.getTime() === today.getTime(),
      isPast: dMid < today,
      isFuture: dMid > today,
    };
  });
}

type DayStatus = "ahead" | "on-track" | "behind" | "pending" | "upcoming";
function getDayStatus(e: DisplayEntry): DayStatus {
  if (e.actual !== null) {
    if (e.actual >= e.planned) return "ahead";
    if (e.actual >= e.planned * 0.9) return "on-track";
    return "behind";
  }
  return e.isFuture && !e.isToday ? "upcoming" : "pending";
}

const SS: Record<
  DayStatus,
  {
    border: string;
    bg: string;
    badge: string;
    badgeTxt: string;
    bar: string;
    label: string;
    numColor: string;
  }
> = {
  ahead: {
    border: "#6ee7b7",
    bg: "#f0fdf4",
    badge: "#10b981",
    badgeTxt: "#fff",
    bar: "#10b981",
    label: "AHEAD",
    numColor: "#059669",
  },
  "on-track": {
    border: "#93c5fd",
    bg: "#eff6ff",
    badge: "#3b82f6",
    badgeTxt: "#fff",
    bar: "#3b82f6",
    label: "ON TRACK",
    numColor: "#2563eb",
  },
  behind: {
    border: "#fca5a5",
    bg: "#fff1f2",
    badge: "#ef4444",
    badgeTxt: "#fff",
    bar: "#ef4444",
    label: "BEHIND",
    numColor: "#dc2626",
  },
  pending: {
    border: "#fcd34d",
    bg: "#fffbeb",
    badge: "#f59e0b",
    badgeTxt: "#fff",
    bar: "#f59e0b",
    label: "PENDING",
    numColor: "#374151",
  },
  upcoming: {
    border: "#e2e8f0",
    bg: "#f8fafc",
    badge: "#cbd5e1",
    badgeTxt: "#64748b",
    bar: "#e2e8f0",
    label: "UPCOMING",
    numColor: "#94a3b8",
  },
};

const g = {
  plant: (p: ProductionPlan) =>
    p?.model?.assemblyLine?.plant ?? { plantId: "", plantName: "—" },
  line: (p: ProductionPlan) =>
    p?.model?.assemblyLine ?? {
      assemblyLineId: "",
      assemblyLineName: "—",
      capacity: 0,
      plant: { plantId: "", plantName: "" },
    },
  model: (p: ProductionPlan) => p?.model ?? { modelId: "", modelName: "—" },
  bom: (p: ProductionPlan) =>
    p?.bom ?? { partNumber: "—", partName: "—", price: 0, childPartList: [] },
  children: (p: ProductionPlan) => p?.bom?.childPartList ?? [],
};

// =============================================================================
// ENTRY MODAL
// =============================================================================
const EntryModal = ({
  entry,
  plan,
  onSave,
  onClose,
}: {
  entry: DisplayEntry;
  plan: ProductionPlan;
  onSave: (
    date: string,
    actual: number | null,
    notes: string,
    redistribution?: { date: string; addedPlanned: number }[],
  ) => Promise<void>;
  onClose: () => void;
}) => {
  const [actual, setActual] = useState(entry.actual?.toString() ?? "");
  const [notes, setNotes] = useState(entry.notes);
  const [saving, setSaving] = useState(false);

  // Redistribution State
  const [distMode, setDistMode] = useState<"even" | "custom" | null>("even");
  const [customDist, setCustomDist] = useState<Record<string, string>>({});

  const parsed = actual !== "" ? parseInt(actual) : null;
  const diff = parsed !== null ? parsed - entry.planned : null; // +ve = surplus, -ve = shortfall
  const bom = g.bom(plan);

  // Variance Logic
  const varianceType = diff !== null && diff > 0 ? "surplus" : "shortfall";
  const varianceAmount = diff !== null ? Math.abs(diff) : 0;

  // Find remaining days in the week after the current entry date
  const futureDays = useMemo(() => {
    return enrichEntries(plan).filter((e) => e.date > entry.date);
  }, [plan, entry.date]);

  // Calculate Even Distribution Preview
  const evenSplit = useMemo(() => {
    if (futureDays.length === 0 || varianceAmount <= 0) return [];
    const base = Math.floor(varianceAmount / futureDays.length);
    let remainder = varianceAmount % futureDays.length;

    return futureDays.map((fd) => {
      const val = base + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      return {
        date: fd.date,
        label: fd.dayLabel,
        val,
        originalPlanned: fd.planned,
      };
    });
  }, [futureDays, varianceAmount]);

  // Calculate Custom Distribution Total
  const customTotal = Object.values(customDist).reduce(
    (sum, val) => sum + (parseInt(val) || 0),
    0,
  );
  const customRemaining = varianceAmount - customTotal;

  // Validation
  const isInvalidActual = actual !== "" && parsed !== null && parsed < 0;
  const isClearing = actual === "";
  const needsRedistribution = varianceAmount > 0 && futureDays.length > 0;

  // Surplus constraints: prevent deducting more than a day's target
  const evenInvalid =
    distMode === "even" &&
    varianceType === "surplus" &&
    evenSplit.some((s) => s.val > s.originalPlanned);
  const customInvalid =
    distMode === "custom" &&
    varianceType === "surplus" &&
    futureDays.some((fd) => (parseInt(customDist[fd.date]) || 0) > fd.planned);

  const canSaveRedistribution =
    !needsRedistribution ||
    (distMode === "even" && !evenInvalid) ||
    (distMode === "custom" && customTotal === varianceAmount && !customInvalid);

  const handleSave = async () => {
    if (parsed === null && !isClearing) return;
    setSaving(true);

    let redistributionPayload: { date: string; addedPlanned: number }[] = [];

    if (needsRedistribution) {
      if (distMode === "even") {
        redistributionPayload = evenSplit.map((s) => ({
          date: s.date,
          // Negative value subtracts from future target (surplus), positive adds (shortfall)
          addedPlanned:
            varianceType === "surplus" ? -Math.abs(s.val) : Math.abs(s.val),
        }));
      } else if (distMode === "custom") {
        redistributionPayload = Object.entries(customDist)
          .filter(([_, val]) => parseInt(val) > 0)
          .map(([date, val]) => ({
            date,
            addedPlanned:
              varianceType === "surplus" ? -parseInt(val) : parseInt(val),
          }));
      }
    }

    await onSave(
      entry.date,
      parsed,
      notes,
      redistributionPayload.length > 0 ? redistributionPayload : undefined,
    );
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header Section */}
        <div
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
            padding: "20px 24px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span
              style={{
                color: "#94a3b8",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {plan.week} · {g.plant(plan).plantName} ·{" "}
              {g.line(plan).assemblyLineName}
            </span>
            <button
              onClick={onClose}
              style={{
                color: "#64748b",
                background: "rgba(255,255,255,0.08)",
                border: "none",
                borderRadius: 8,
                width: 28,
                height: 28,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={13} />
            </button>
          </div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>
            {entry.dayLabel}, {entry.dateLabel}
          </div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
            {bom.partNumber} · {bom.partName}
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div
          style={{
            padding: 24,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Daily Target
              </div>
              <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 2 }}>
                backlog-adjusted from server
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a" }}>
              {entry.planned.toLocaleString()}
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#374151",
                display: "block",
                marginBottom: 6,
              }}
            >
              Actual Production <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="number"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              autoFocus
              min="0"
              placeholder="Clear entry"
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: 22,
                fontWeight: 900,
                border: "2px solid #e2e8f0",
                borderRadius: 12,
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {!needsRedistribution && diff !== null && parsed !== null && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 13,
                  fontWeight: 700,
                  color: diff >= 0 ? "#059669" : "#dc2626",
                  marginTop: 6,
                }}
              >
                {diff >= 0 ? (
                  <TrendingUp size={13} />
                ) : (
                  <TrendingDown size={13} />
                )}
                {diff >= 0 ? `+${diff}` : diff} vs target ·{" "}
                {((parsed / Math.max(entry.planned, 1)) * 100).toFixed(1)}%
              </div>
            )}
          </div>

          {/* REDISTRIBUTION UI */}
          {needsRedistribution && (
            <div
              style={{
                background:
                  varianceType === "shortfall" ? "#fff7ed" : "#f0fdf4",
                border: `1px solid ${varianceType === "shortfall" ? "#fed7aa" : "#bbf7d0"}`,
                borderRadius: 12,
                padding: 16,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {varianceType === "shortfall" ? (
                  <AlertTriangle size={16} style={{ color: "#ea580c" }} />
                ) : (
                  <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                )}
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: varianceType === "shortfall" ? "#9a3412" : "#166534",
                  }}
                >
                  {varianceType === "shortfall" ? "Shortfall" : "Surplus"} of{" "}
                  {varianceAmount} units
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: varianceType === "shortfall" ? "#c2410c" : "#15803d",
                  marginBottom: 14,
                  fontWeight: 600,
                }}
              >
                {varianceType === "shortfall"
                  ? "You must redistribute this backlog to future days before saving."
                  : "You must deduct this surplus from future days before saving."}
              </p>

              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button
                  onClick={() => setDistMode("even")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    cursor: "pointer",
                    border:
                      distMode === "even"
                        ? varianceType === "shortfall"
                          ? "2px solid #f97316"
                          : "2px solid #22c55e"
                        : varianceType === "shortfall"
                          ? "1px solid #fdba74"
                          : "1px solid #bbf7d0",
                    background:
                      distMode === "even"
                        ? "#fff"
                        : varianceType === "shortfall"
                          ? "#ffedd5"
                          : "#dcfce7",
                    color:
                      distMode === "even"
                        ? varianceType === "shortfall"
                          ? "#ea580c"
                          : "#16a34a"
                        : varianceType === "shortfall"
                          ? "#c2410c"
                          : "#15803d",
                  }}
                >
                  Evenly Across Week
                </button>
                <button
                  onClick={() => setDistMode("custom")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 8,
                    cursor: "pointer",
                    border:
                      distMode === "custom"
                        ? varianceType === "shortfall"
                          ? "2px solid #f97316"
                          : "2px solid #22c55e"
                        : varianceType === "shortfall"
                          ? "1px solid #fdba74"
                          : "1px solid #bbf7d0",
                    background:
                      distMode === "custom"
                        ? "#fff"
                        : varianceType === "shortfall"
                          ? "#ffedd5"
                          : "#dcfce7",
                    color:
                      distMode === "custom"
                        ? varianceType === "shortfall"
                          ? "#ea580c"
                          : "#16a34a"
                        : varianceType === "shortfall"
                          ? "#c2410c"
                          : "#15803d",
                  }}
                >
                  Custom Allocation
                </button>
              </div>

              {distMode === "even" && (
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {evenSplit.map((s) => (
                      <div
                        key={s.date}
                        style={{
                          background: "#fff",
                          border: `1px solid ${varianceType === "shortfall" ? "#fed7aa" : "#bbf7d0"}`,
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 11,
                          fontWeight: 700,
                          color:
                            varianceType === "shortfall"
                              ? "#9a3412"
                              : "#166534",
                        }}
                      >
                        {s.label}: {varianceType === "shortfall" ? "+" : "-"}
                        {s.val}
                      </div>
                    ))}
                  </div>
                  {evenInvalid && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 11,
                        color: "#dc2626",
                        fontWeight: 600,
                      }}
                    >
                      ⚠️ Even deduction drops one or more days below 0. Please
                      use Custom Allocation.
                    </div>
                  )}
                </div>
              )}

              {distMode === "custom" && (
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(80px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {futureDays.map((fd) => (
                      <div key={fd.date}>
                        <label
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color:
                              varianceType === "shortfall"
                                ? "#9a3412"
                                : "#166534",
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 2,
                          }}
                        >
                          {fd.dayLabel}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={
                            varianceType === "surplus" ? fd.planned : undefined
                          }
                          value={customDist[fd.date] || ""}
                          onChange={(e) =>
                            setCustomDist((p) => ({
                              ...p,
                              [fd.date]: e.target.value,
                            }))
                          }
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            fontSize: 13,
                            fontWeight: 700,
                            border: `1px solid ${varianceType === "shortfall" ? "#fdba74" : "#86efac"}`,
                            borderRadius: 6,
                            outline: "none",
                          }}
                        />
                        {varianceType === "surplus" && (
                          <div
                            style={{
                              fontSize: 9,
                              color: "#6b7280",
                              marginTop: 2,
                            }}
                          >
                            Max deduct: {fd.planned}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 12,
                      fontWeight: 700,
                      color:
                        customRemaining === 0
                          ? "#16a34a"
                          : varianceType === "shortfall"
                            ? "#ea580c"
                            : "#15803d",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      Total{" "}
                      {varianceType === "shortfall" ? "Added" : "Deducted"}:{" "}
                      {customTotal}
                    </span>
                    <span>Remaining: {customRemaining}</span>
                  </div>
                  {customInvalid && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: "#dc2626",
                        fontWeight: 600,
                      }}
                    >
                      ⚠️ You cannot deduct more than a day's planned target.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {varianceAmount > 0 && futureDays.length === 0 && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12,
                color: "#b91c1c",
                fontWeight: 600,
              }}
            >
              This is the last day of the week. The {varianceType} of{" "}
              {varianceAmount} units cannot be redistributed and will
              permanently affect the weekly total.
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#374151",
                display: "block",
                marginBottom: 6,
              }}
            >
              Remarks{" "}
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Delays, stoppages, overtime..."
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: 13,
                border: "2px solid #e2e8f0",
                borderRadius: 12,
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f1f5f9",
            background: "#fafafa",
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "11px 0",
              border: "2px solid #e2e8f0",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: "#fff",
              color: "#374151",
            }}
          >
            Cancel
          </button>
          <button
            disabled={isInvalidActual || saving || !canSaveRedistribution}
            onClick={handleSave}
            style={{
              flex: 1,
              padding: "11px 0",
              border: "none",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              background: isClearing ? "#ef4444" : "#1d4ed8",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              opacity:
                isInvalidActual || saving || !canSaveRedistribution ? 0.4 : 1,
            }}
          >
            {saving ? (
              <Loader2 className="animate-spin" size={13} />
            ) : isClearing ? (
              <Trash2 size={13} />
            ) : (
              <Save size={13} />
            )}
            {saving ? "Saving..." : isClearing ? "Clear Entry" : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// ADD PLAN MODAL
// =============================================================================
const AddPlanModal = ({
  onClose,
  onSave,
  currentYear,
  currentWeekNumber,
}: {
  onClose: () => void;
  onSave: (d: any) => Promise<void>;
  currentYear: number;
  currentWeekNumber: number;
}) => {
  const [form, setForm] = useState<any>({
    week: `W${currentWeekNumber}`,
    year: currentYear,
    workingDays: 6,
    capacity: 0,
    status: "PLANNED",
    notes: "",
  });
  const [matrices, setMatrices] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [partFilter, setPartFilter] = useState("");
  const [selectedMatrixId, setSelectedMatrixId] = useState("");
  const [loadingCfg, setLoadingCfg] = useState(true);
  const [saving, setSaving] = useState(false);
  const totalWeeksInYear = getWeeksInYear(currentYear);
  const allWeeks = Array.from(
    { length: totalWeeksInYear },
    (_, i) => `W${i + 1}`,
  );

  useEffect(() => {
    fetch(`${API_BASE}/masters/matrix`)
      .then((r) => r.json())
      .then((d) => {
        const a = Array.isArray(d) ? d : (d?.data ?? []);
        setMatrices(a);
        setFiltered(a);
      })
      .catch(() => {
        setMatrices([]);
        setFiltered([]);
      })
      .finally(() => setLoadingCfg(false));
  }, []);

  useEffect(() => {
    if (!partFilter.trim()) {
      setFiltered(matrices);
      return;
    }
    const f = partFilter.toLowerCase().replace(/\s/g, "");
    setFiltered(
      matrices.filter(
        (m) =>
          (m.bom?.partNumber ?? "")
            .toLowerCase()
            .replace(/\s/g, "")
            .includes(f) ||
          (m.bom?.partName ?? "")
            .toLowerCase()
            .includes(partFilter.toLowerCase()),
      ),
    );
  }, [partFilter, matrices]);

  const selectMatrix = (id: string) => {
    setSelectedMatrixId(id);
    const m = matrices.find((x) => x._id === id);
    if (m)
      setForm((p: any) => ({
        ...p,
        capacity: m.model?.assemblyLine?.capacity ?? 0,
      }));
  };

  const selectedMatrix = matrices.find((m) => m._id === selectedMatrixId);
  const dailyPreview =
    form.capacity > 0
      ? Math.floor(form.capacity / Math.max(form.workingDays, 1))
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wn = parseInt((form.week || "").replace("W", ""));
    if (wn < currentWeekNumber) {
      alert("Cannot create plans for past weeks!");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        matrixId: selectedMatrixId,
        week: form.week,
        year: form.year,
        workingDays: form.workingDays,
        capacity: form.capacity,
        status: form.status,
        notes: form.notes,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 25px 60px rgba(0,0,0,0.2)",
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            background: "#fff",
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
            New Production Plan
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#94a3b8",
            }}
          >
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {loadingCfg ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "48px 0",
              }}
            >
              <Loader2
                className="animate-spin"
                size={24}
                style={{ color: "#3b82f6" }}
              />
              <span style={{ color: "#64748b", fontWeight: 600 }}>
                Loading configurations...
              </span>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Week *
                  </label>
                  <select
                    value={form.week}
                    onChange={(e) =>
                      setForm((p: any) => ({ ...p, week: e.target.value }))
                    }
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 10,
                      fontSize: 13,
                      outline: "none",
                    }}
                    required
                  >
                    {allWeeks.map((w) => {
                      const wn = parseInt(w.replace("W", ""));
                      return (
                        <option
                          key={w}
                          value={w}
                          disabled={wn < currentWeekNumber}
                        >
                          {w}
                          {wn === currentWeekNumber
                            ? " (Current)"
                            : wn < currentWeekNumber
                              ? " (Past)"
                              : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Working Days
                  </label>
                  <select
                    value={form.workingDays}
                    onChange={(e) =>
                      setForm((p: any) => ({
                        ...p,
                        workingDays: parseInt(e.target.value),
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 10,
                      fontSize: 13,
                      outline: "none",
                    }}
                  >
                    <option value={5}>5 Days (Mon–Fri)</option>
                    <option value={6}>6 Days (Mon–Sat)</option>
                    <option value={7}>7 Days (Mon–Sun)</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#1e40af",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Filter by Part Number
                </label>
                <input
                  value={partFilter}
                  onChange={(e) => setPartFilter(e.target.value)}
                  placeholder="Type part number or name..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #bfdbfe",
                    borderRadius: 8,
                    fontSize: 13,
                    outline: "none",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  {filtered.length} configuration(s)
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Configuration *
                </label>
                <select
                  value={selectedMatrixId}
                  onChange={(e) => selectMatrix(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 13,
                    outline: "none",
                  }}
                  required
                >
                  <option value="">— Choose a configuration —</option>
                  {filtered.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.model?.assemblyLine?.plant?.plantName} ·{" "}
                      {m.model?.assemblyLine?.assemblyLineName} ·{" "}
                      {m.model?.modelName} · {m.bom?.partNumber}
                    </option>
                  ))}
                </select>
              </div>

              {selectedMatrix && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {[
                    [
                      "Plant",
                      selectedMatrix.model?.assemblyLine?.plant?.plantName,
                    ],
                    [
                      "Line",
                      selectedMatrix.model?.assemblyLine?.assemblyLineName,
                    ],
                    ["Model", selectedMatrix.model?.modelName],
                    ["Part No.", selectedMatrix.bom?.partNumber],
                    ["Part", selectedMatrix.bom?.partName],
                    [
                      "Price",
                      selectedMatrix.bom?.price
                        ? `₹${Number(selectedMatrix.bom.price).toLocaleString()}`
                        : "—",
                    ],
                  ].map(([l, v]) => (
                    <div key={l as string}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        {l}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {v ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Capacity (units / week)
                </label>
                <input
                  type="number"
                  value={form.capacity}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      capacity: parseInt(e.target.value) || 0,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  min="0"
                />
                {dailyPreview > 0 && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    Daily target preview: ~{dailyPreview} units ({form.capacity}{" "}
                    ÷ {form.workingDays} days)
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((p: any) => ({ ...p, status: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  {["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    background: "#fff",
                    color: "#374151",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedMatrixId || form.capacity <= 0}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    border: "none",
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    background: "#1d4ed8",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    opacity:
                      saving || !selectedMatrixId || form.capacity <= 0
                        ? 0.5
                        : 1,
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={13} /> Creating...
                    </>
                  ) : (
                    <>
                      <Save size={13} /> Create Plan
                    </>
                  )}
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
// MAIN DASHBOARD
// =============================================================================
const ProductionDashboard: React.FC = () => {
  const cwi = useMemo(() => getCurrentWeekInfo(), []);

  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(cwi.weekLabel);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(
    new Date().getMonth(),
  );
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DisplayEntry | null>(null);
  const [plantFilter, setPlantFilter] = useState("");
  const [lineFilter, setLineFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [partFilter, setPartFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `${API_BASE}/production-plans?year=${cwi.year}&limit=500`,
      );
      const j = await r.json();
      if (j.success) {
        const data: ProductionPlan[] = j.data ?? [];
        setPlans(data);
        setSelectedPlanId((prev) => {
          if (prev && data.find((p) => p._id === prev)) return prev;
          const cur = data.filter((p) => p.week === cwi.weekLabel);
          return cur.length > 0
            ? cur[0]._id
            : data.length > 0
              ? data[0]._id
              : "";
        });
      } else {
        setError(j.message || "Failed to load");
      }
    } catch {
      setError(
        "Cannot connect to backend (port 5001). Check server is running.",
      );
    } finally {
      setLoading(false);
    }
  }, [cwi.year, cwi.weekLabel]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Auto-select first plan on week tab change
  useEffect(() => {
    const wp = plans.filter((p) => p.week === selectedWeek);
    setSelectedPlanId((prev) => {
      if (prev && wp.find((p) => p._id === prev)) return prev;
      return wp.length > 0 ? wp[0]._id : "";
    });
  }, [selectedWeek, plans]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSaveEntry = useCallback(
    async (
      date: string,
      actual: number | null,
      notes: string,
      redistribution?: { date: string; addedPlanned: number }[],
    ) => {
      if (!selectedPlanId) return;
      try {
        await fetch(
          `${API_BASE}/production-plans/${selectedPlanId}/daily-entries/${date}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actual, notes, redistribution }),
          },
        );
      } catch (e) {
        console.warn("Save error:", e);
      }
      setEditingEntry(null);
      await fetchPlans();
    },
    [selectedPlanId, fetchPlans],
  );

  const handleSavePlan = useCallback(
    async (planData: any) => {
      const r = await fetch(`${API_BASE}/production-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });
      const j = await r.json();
      if (j.success) {
        setShowAddModal(false);
        await fetchPlans();
        if (j.data?._id) setSelectedPlanId(j.data._id);
      } else alert(j.message || "Failed to create plan");
    },
    [fetchPlans],
  );

  const handleDeletePlan = useCallback(
    async (id: string, week: string) => {
      const wn = parseInt(week.replace("W", ""));
      if (wn < cwi.weekNumber) {
        alert("Cannot delete past week plans!");
        return;
      }
      if (!confirm("Delete this production plan? This cannot be undone."))
        return;
      const r = await fetch(`${API_BASE}/production-plans/${id}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (j.success) fetchPlans();
      else alert(j.message || "Delete failed");
    },
    [cwi.weekNumber, fetchPlans],
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const visibleWeeks = useMemo(() => {
    return getWeeksInMonth(cwi.year, selectedMonthIndex);
  }, [cwi.year, selectedMonthIndex]);

  // Auto-select the first week of the newly selected month if current selection is invalid
  useEffect(() => {
    if (visibleWeeks.length > 0 && !visibleWeeks.includes(selectedWeek)) {
      setSelectedWeek(visibleWeeks[0]);
    }
  }, [visibleWeeks, selectedWeek]);

  // const weekPlans = useMemo(
  //   () => plans.filter((p) => p.week === selectedWeek),
  //   [plans, selectedWeek],
  // );
  // const selectedPlan = useMemo(
  //   () => plans.find((p) => p._id === selectedPlanId) ?? null,
  //   [plans, selectedPlanId],
  // );
  // const entries = useMemo(
  //   () => (selectedPlan ? enrichEntries(selectedPlan) : []),
  //   [selectedPlan],
  // );

  // const filteredWeekPlans = useMemo(
  //   () =>
  //     weekPlans.filter(
  //       (p) =>
  //         (!plantFilter ||
  //           g
  //             .plant(p)
  //             .plantName.toLowerCase()
  //             .includes(plantFilter.toLowerCase())) &&
  //         (!lineFilter ||
  //           g
  //             .line(p)
  //             .assemblyLineName.toLowerCase()
  //             .includes(lineFilter.toLowerCase())),
  //     ),
  //   [weekPlans, plantFilter, lineFilter],
  // );
  const weekPlans = useMemo(
    () => plans.filter((p) => p.week === selectedWeek),
    [plans, selectedWeek],
  );

  const uniqueOptions = (items: { id: string; label: string }[]) =>
    Array.from(
      new Map(
        items.filter((x) => x.id && x.label).map((x) => [x.id, x]),
      ).values(),
    );

  const filterOptions = useMemo(
    () => ({
      plants: uniqueOptions(
        weekPlans.map((p) => ({
          id: g.plant(p).plantId,
          label: g.plant(p).plantName,
        })),
      ),
      lines: uniqueOptions(
        weekPlans
          .filter((p) => !plantFilter || g.plant(p).plantId === plantFilter)
          .map((p) => ({
            id: g.line(p).assemblyLineId,
            label: g.line(p).assemblyLineName,
          })),
      ),
      models: uniqueOptions(
        weekPlans
          .filter(
            (p) =>
              (!plantFilter || g.plant(p).plantId === plantFilter) &&
              (!lineFilter || g.line(p).assemblyLineId === lineFilter),
          )
          .map((p) => ({
            id: g.model(p).modelId,
            label: g.model(p).modelName,
          })),
      ),
      parts: uniqueOptions(
        weekPlans.map((p) => ({
          id: g.bom(p).partNumber,
          label: `${g.bom(p).partNumber} — ${g.bom(p).partName}`,
        })),
      ),
      statuses: Array.from(
        new Set(weekPlans.map((p) => p.status).filter(Boolean)),
      ),
      shifts: Array.from(
        new Set(weekPlans.map((p) => p.shift).filter(Boolean)),
      ),
    }),
    [weekPlans, plantFilter, lineFilter],
  );

  const filteredWeekPlans = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();

    return weekPlans.filter((p) => {
      const plant = g.plant(p);
      const line = g.line(p);
      const model = g.model(p);
      const bom = g.bom(p);

      return (
        (!plantFilter || plant.plantId === plantFilter) &&
        (!lineFilter || line.assemblyLineId === lineFilter) &&
        (!modelFilter || model.modelId === modelFilter) &&
        (!partFilter || bom.partNumber === partFilter) &&
        (!statusFilter || p.status === statusFilter) &&
        (!shiftFilter || p.shift === shiftFilter) &&
        (!q ||
          [
            plant.plantName,
            line.assemblyLineName,
            model.modelName,
            bom.partNumber,
            bom.partName,
            p.status,
            p.shift,
          ].some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(q),
          ))
      );
    });
  }, [
    weekPlans,
    plantFilter,
    lineFilter,
    modelFilter,
    partFilter,
    statusFilter,
    shiftFilter,
    searchFilter,
  ]);

  useEffect(() => {
    setSelectedPlanId((prev) => {
      if (prev && filteredWeekPlans.some((p) => p._id === prev)) return prev;
      return filteredWeekPlans[0]?._id ?? "";
    });
  }, [filteredWeekPlans]);

  const selectedPlan = useMemo(
    () => filteredWeekPlans.find((p) => p._id === selectedPlanId) ?? null,
    [filteredWeekPlans, selectedPlanId],
  );

  const entries = useMemo(
    () => (selectedPlan ? enrichEntries(selectedPlan) : []),
    [selectedPlan],
  );
  const stats = useMemo(() => {
    if (!selectedPlan || entries.length === 0) return null;
    const entd = entries.filter((e) => e.actual !== null);
    const ta = entd.reduce((s, e) => s + (e.actual ?? 0), 0);
    const tp = entd.reduce((s, e) => s + e.planned, 0);
    return {
      capacity: selectedPlan.capacity,
      dailyTarget:
        selectedPlan.workingDays > 0
          ? Math.floor(selectedPlan.capacity / selectedPlan.workingDays)
          : 0,
      totalActual: ta,
      backlog: tp - ta,
      weekPct:
        selectedPlan.capacity > 0
          ? ((ta / selectedPlan.capacity) * 100).toFixed(1)
          : "0",
      entered: entd.length,
      remaining: entries.filter((e) => e.actual === null).length,
      ahead: entd.filter((e) => (e.actual ?? 0) >= e.planned).length,
      behind: entd.filter((e) => (e.actual ?? 0) < e.planned * 0.9).length,
    };
  }, [entries, selectedPlan]);

  const sparkMax = useMemo(
    () =>
      entries.length > 0
        ? Math.max(...entries.map((e) => Math.max(e.planned, e.actual ?? 0, 1)))
        : 1,
    [entries],
  );

  const tableRows = useMemo(
    () =>
      filteredWeekPlans.map((plan) => {
        const es = enrichEntries(plan);
        const entd = es.filter((e) => e.actual !== null);
        const pl = es.reduce((s, e) => s + e.planned, 0);
        const ac = entd.reduce((s, e) => s + (e.actual ?? 0), 0);
        const bal = ac - pl;
        const adh = entd.length > 0 && pl > 0 ? (ac / pl) * 100 : 0;
        const kids = g.children(plan);
        const chShortage =
          kids.length > 0 && entd.length > 0 && bal < 0 ? Math.abs(bal) : 0;
        return {
          plan,
          planned: pl,
          actual: ac,
          balance: bal,
          adherence: adh,
          childShortage: chShortage,
          entered: entd.length,
        };
      }),
    [filteredWeekPlans],
  );

  const totalWeekBacklog = stats ? Math.max(stats.backlog, 0) : 0;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f0f4f8",
        fontFamily: "'DM Sans', 'Nunito', system-ui, sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e2e8f0",
          position: "sticky",
          top: 0,
          zIndex: 40,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        {/* <button
          onClick={() => setShowUploadModal(true)}
          style={{
            background: "#059669",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "9px 14px",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <FileSpreadsheet size={15} /> Add Production Planning
        </button>
        {showUploadModal && (
          <MonthlyUploadModal
            currentYear={cwi.year}
            currentWeekNumber={cwi.weekNumber}
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              fetchPlans();
            }}
          />
        )} */}
        <div
          style={{
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: -0.3,
              }}
            >
              Production Planning
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
              Weekly schedules · backlog-adjusted daily targets
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                background: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "9px 14px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FileSpreadsheet size={15} /> Add Production Planning
            </button>
            {showUploadModal && (
              <MonthlyUploadModal
                currentYear={cwi.year}
                currentWeekNumber={cwi.weekNumber}
                onClose={() => setShowUploadModal(false)}
                onSuccess={() => {
                  setShowUploadModal(false);
                  fetchPlans();
                }}
              />
            )}
            <button
              onClick={fetchPlans}
              style={{
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                borderRadius: 10,
                padding: "7px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <RefreshCw
                size={14}
                style={{ color: "#94a3b8" }}
                className={loading ? "animate-spin" : ""}
              />
            </button>
            {/* <button onClick={() => setShowAddModal(true)}
              style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(29,78,216,0.25)' }}>
              <Plus size={15} /> Add Production Plan
            </button> */}
          </div>
        </div>
      </header>

      <div
        style={{
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#fff1f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertTriangle
              size={15}
              style={{ color: "#ef4444", flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#b91c1c",
                flex: 1,
              }}
            >
              {error}
            </span>
            <button
              onClick={fetchPlans}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#dc2626",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── SECTION 1: MONTH FILTER & WEEK CARDS ─────────────────────────────────────── */}
        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            padding: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Calendar size={14} style={{ color: "#1d4ed8" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
                Current Period: {cwi.month} ({cwi.weekLabel})
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                View Month:
              </span>
              <select
                value={selectedMonthIndex}
                onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                style={{
                  padding: "6px 12px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  outline: "none",
                  background: "#fff",
                  cursor: "pointer",
                  color: "#0f172a",
                }}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${visibleWeeks.length || 5}, 1fr)`,
              gap: 12,
            }}
          >
            {visibleWeeks.map((wk) => {
              const wkPlans = plans.filter((p) => p.week === wk);
              const totalCap = wkPlans.reduce((s, p) => s + p.capacity, 0);
              const isNow = wk === cwi.weekLabel;
              const isSel = wk === selectedWeek;
              const wn = parseInt(wk.replace("W", ""));
              const isPast = wn < cwi.weekNumber;
              return (
                <button
                  key={wk}
                  onClick={() => setSelectedWeek(wk)}
                  style={{
                    position: "relative",
                    textAlign: "left",
                    padding: "16px 18px",
                    borderRadius: 14,
                    border: isSel ? "2px solid #1d4ed8" : "1.5px solid #e2e8f0",
                    background: isSel ? "#eff6ff" : "#fafafa",
                    cursor: "pointer",
                    boxShadow: isSel
                      ? "0 4px 12px rgba(29,78,216,0.12)"
                      : "none",
                    transition: "all .15s",
                  }}
                >
                  {isNow && (
                    <span
                      style={{
                        position: "absolute",
                        top: -10,
                        right: -8,
                        background: "#1d4ed8",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 20,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      NOW
                    </span>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: isSel
                          ? "#1d4ed8"
                          : isPast
                            ? "#94a3b8"
                            : "#0f172a",
                      }}
                    >
                      {wk}
                    </span>
                    <Factory
                      size={15}
                      style={{ color: isSel ? "#60a5fa" : "#cbd5e1" }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      marginBottom: 10,
                    }}
                  >
                    Week {wk.replace("W", "")}
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        Plans:
                      </span>
                      <span
                        style={{
                          fontWeight: 900,
                          fontSize: 14,
                          color: wkPlans.length > 0 ? "#1d4ed8" : "#cbd5e1",
                        }}
                      >
                        {wkPlans.length}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        Capacity:
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: totalCap > 0 ? "#059669" : "#cbd5e1",
                        }}
                      >
                        {totalCap.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Filter size={13} style={{ color: "#94a3b8" }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Filters
            </span>
            <span style={{ fontSize: 11, color: "#cbd5e1", marginLeft: 4 }}>
              — {selectedWeek} · {filteredWeekPlans.length} of{" "}
              {weekPlans.length} plan(s)
            </span>
          </div>

          <div
            style={{
              padding: "14px 20px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 10,
            }}
          >
            <select
              value={plantFilter}
              onChange={(e) => {
                setPlantFilter(e.target.value);
                setLineFilter("");
                setModelFilter("");
              }}
              style={{
                padding: 8,
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
              }}
            >
              <option value="">All Plants</option>
              {filterOptions.plants.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>

            <select
              value={lineFilter}
              onChange={(e) => {
                setLineFilter(e.target.value);
                setModelFilter("");
              }}
              style={{
                padding: 8,
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
              }}
            >
              <option value="">All Lines</option>
              {filterOptions.lines.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>

            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              style={{
                padding: 8,
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
              }}
            >
              <option value="">All Models</option>
              {filterOptions.models.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>

            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
              style={{
                padding: 8,
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
              }}
            >
              <option value="">All Parts</option>
              {filterOptions.parts.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: 8,
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
              }}
            >
              <option value="">All Status</option>
              {filterOptions.statuses.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>

            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              style={{
                padding: 8,
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
              }}
            >
              <option value="">All Shifts</option>
              {filterOptions.shifts.map((x) => (
                <option key={x} value={x}>
                  Shift {x}
                </option>
              ))}
            </select>

            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search anything..."
              style={{
                padding: 8,
                border: "1.5px solid #e2e8f0",
                borderRadius: 9,
              }}
            />

            <button
              onClick={() => {
                setPlantFilter("");
                setLineFilter("");
                setModelFilter("");
                setPartFilter("");
                setStatusFilter("");
                setShiftFilter("");
                setSearchFilter("");
              }}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 9,
                background: "#fff",
                color: "#64748b",
                fontWeight: 700,
              }}
            >
              Clear
            </button>
          </div>
        </section>
        {/* ── SECTION 2: CONTEXT STRIP + DAY CARDS ───────────────────────── */}
        {filteredWeekPlans.length > 0 && selectedPlan && (
          <section
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                borderBottom: "1px solid #f1f5f9",
                padding: "10px 20px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#94a3b8",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {selectedPlan.week} · {g.plant(selectedPlan).plantName} ·{" "}
                {g.line(selectedPlan).assemblyLineName} ·{" "}
                {selectedPlan.workingDays} Days
              </span>

              {filteredWeekPlans.length > 1 && (
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "4px 8px",
                    outline: "none",
                    fontWeight: 600,
                    color: "#334155",
                    background: "#fff",
                  }}
                >
                  {weekPlans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {g.plant(p).plantName} · {g.line(p).assemblyLineName} ·{" "}
                      {g.bom(p).partNumber}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {totalWeekBacklog > 0 && (
              <div
                style={{
                  background: "#fff7ed",
                  borderBottom: "1px solid #fed7aa",
                  padding: "8px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle
                  size={13}
                  style={{ color: "#f97316", flexShrink: 0 }}
                />
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: "#c2410c" }}
                >
                  ⚡ {totalWeekBacklog} units backlog
                </span>
              </div>
            )}

            {/* NEW: WEEKLY OVERALL PROGRESS BAR */}
            {stats && (
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #f1f5f9",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                      }}
                    >
                      Weekly Completion
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#0f172a",
                        marginTop: 2,
                      }}
                    >
                      Overall Planned vs Actual
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: "#0f172a",
                        lineHeight: 1,
                      }}
                    >
                      {stats.totalActual.toLocaleString()}
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#94a3b8",
                        margin: "0 6px",
                      }}
                    >
                      /
                    </span>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#64748b",
                      }}
                    >
                      {stats.capacity.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 8,
                    background: "#f1f5f9",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      borderRadius: 8,
                      background:
                        stats.totalActual >= stats.capacity
                          ? "#10b981"
                          : "#3b82f6",
                      width: `${Math.min((stats.totalActual / Math.max(stats.capacity, 1)) * 100, 100)}%`,
                      transition: "width 0.8s ease-out",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}
                  >
                    0%
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color:
                        stats.totalActual >= stats.capacity
                          ? "#059669"
                          : "#2563eb",
                    }}
                  >
                    {(
                      (stats.totalActual / Math.max(stats.capacity, 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            )}

            <div
              style={{
                padding: 16,
                display: "grid",
                gap: 10,
                gridTemplateColumns: `repeat(${Math.max(entries.length, 1)}, 1fr)`,
              }}
            >
              {entries.map((e) => {
                const st = getDayStatus(e);
                const s = SS[st];
                const diff = e.actual !== null ? e.actual - e.planned : null;
                const canEnter = !e.isFuture || e.isToday;
                return (
                  <div
                    key={e.date}
                    onClick={canEnter ? () => setEditingEntry(e) : undefined}
                    onMouseEnter={
                      canEnter
                        ? (ev) => {
                            (
                              ev.currentTarget as HTMLDivElement
                            ).style.transform = "translateY(-2px)";
                          }
                        : undefined
                    }
                    onMouseLeave={
                      canEnter
                        ? (ev) => {
                            (
                              ev.currentTarget as HTMLDivElement
                            ).style.transform = "";
                          }
                        : undefined
                    }
                    style={{
                      position: "relative",
                      borderRadius: 14,
                      border: `2px solid ${e.isToday ? "#0f172a" : s.border}`,
                      background: s.bg,
                      padding: "14px 14px 12px",
                      cursor: canEnter ? "pointer" : "default",
                      opacity: !canEnter ? 0.55 : 1,
                      boxShadow: e.isToday
                        ? "0 4px 16px rgba(0,0,0,0.12)"
                        : "none",
                      transition: "transform .15s, box-shadow .15s",
                    }}
                  >
                    {e.isToday && (
                      <div
                        style={{
                          position: "absolute",
                          top: -11,
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "#0f172a",
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "3px 9px",
                          borderRadius: 20,
                          letterSpacing: 1.5,
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        TODAY
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: "#475569",
                            textTransform: "uppercase",
                            letterSpacing: 1.5,
                          }}
                        >
                          {e.dayLabel}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#94a3b8",
                            marginTop: 1,
                          }}
                        >
                          {e.dateLabel}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "3px 7px",
                          borderRadius: 20,
                          background: s.badge,
                          color: s.badgeTxt,
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        PLANNED
                      </div>
                      <div
                        style={{
                          fontSize: 24,
                          fontWeight: 900,
                          color: "#334155",
                          lineHeight: 1.1,
                          marginTop: 2,
                        }}
                      >
                        {e.planned.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: 1,
                        }}
                      >
                        ACTUAL
                      </div>
                      {e.actual !== null ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 5,
                            marginTop: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 24,
                              fontWeight: 900,
                              color: s.numColor,
                              lineHeight: 1.1,
                            }}
                          >
                            {e.actual.toLocaleString()}
                          </span>
                          {diff !== null && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: diff >= 0 ? "#059669" : "#dc2626",
                              }}
                            >
                              {diff >= 0 ? `+${diff}` : diff}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#94a3b8",
                            fontStyle: "italic",
                            marginTop: 4,
                          }}
                        >
                          {canEnter ? "↓ tap to enter" : "— scheduled"}
                        </div>
                      )}
                    </div>
                    {e.notes && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 10,
                          color: "#64748b",
                          background: "rgba(255,255,255,0.7)",
                          borderRadius: 6,
                          padding: "4px 7px",
                          border: "1px solid rgba(0,0,0,0.05)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        💬 {e.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── SECTION 3: 8 STAT PILLS ─────────────────────────────────────── */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 10,
            }}
          >
            {[
              {
                label: "WEEK CAPACITY",
                value: stats.capacity.toLocaleString(),
                sub: "total units",
                color: "#0f172a",
              },
              {
                label: "DAILY TARGET",
                value: stats.dailyTarget.toLocaleString(),
                sub: `${selectedPlan?.workingDays} days`,
                color: "#0f172a",
              },
              {
                label: "ACTUAL SO FAR",
                value: stats.totalActual.toLocaleString(),
                sub: `${stats.weekPct}% of week`,
                color: parseFloat(stats.weekPct) >= 90 ? "#059669" : "#dc2626",
              },
              {
                label: "BACKLOG",
                value:
                  stats.backlog > 0 ? `+${stats.backlog}` : `${stats.backlog}`,
                sub: "units deficit",
                color: stats.backlog > 0 ? "#dc2626" : "#059669",
              },
              {
                label: "DAYS ENTERED",
                value: stats.entered.toString(),
                sub: `of ${selectedPlan?.workingDays}`,
                color: "#0f172a",
              },
              {
                label: "DAYS LEFT",
                value: stats.remaining.toString(),
                sub: "to enter",
                color: "#d97706",
              },
              {
                label: "DAYS AHEAD",
                value: stats.ahead.toString(),
                sub: "≥100%",
                color: "#059669",
              },
              {
                label: "DAYS BEHIND",
                value: stats.behind.toString(),
                sub: "<90%",
                color: stats.behind > 0 ? "#dc2626" : "#94a3b8",
              },
            ].map(({ label, value, sub, color }) => (
              <div
                key={label}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: "1px solid #e8ecf0",
                  padding: "14px 16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: 1.5,
                    marginBottom: 4,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color,
                    lineHeight: 1,
                    marginBottom: 3,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}
                >
                  {sub}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── SECTION 4: GROUPED BAR CHART WITH BACKLOG LABELS ───────────── */}
        {entries.length > 0 && (
          <section
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              padding: "16px 20px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 2,
              }}
            >
              <BarChart3 size={13} style={{ color: "#94a3b8" }} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 2,
                }}
              >
                Daily Progress Overview
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#cbd5e1", marginBottom: 14 }}>
              Planned vs Actual · backlog/surplus labels above each day
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
              {entries.map((e, i) => {
                const st = getDayStatus(e);
                const s = SS[st];
                const CHART_H = 80;
                const ph = Math.max((e.planned / sparkMax) * CHART_H, 3);
                const ah =
                  e.actual !== null
                    ? Math.max((e.actual / sparkMax) * CHART_H, 3)
                    : 0;
                const blv = e.actual !== null ? e.planned - e.actual : null;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        height: 18,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        width: "100%",
                        marginBottom: 3,
                      }}
                    >
                      {blv !== null && blv > 0 && (
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 800,
                            color: "#dc2626",
                            background: "#fee2e2",
                            borderRadius: 4,
                            padding: "1px 4px",
                            lineHeight: 1.5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          -{blv}
                        </span>
                      )}
                      {blv !== null && blv < 0 && (
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 800,
                            color: "#059669",
                            background: "#dcfce7",
                            borderRadius: 4,
                            padding: "1px 4px",
                            lineHeight: 1.5,
                            whiteSpace: "nowrap",
                          }}
                        >
                          +{Math.abs(blv)}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "flex-end",
                        gap: 2,
                        height: CHART_H,
                      }}
                    >
                      <div
                        title={`Planned: ${e.planned}`}
                        style={{
                          flex: 1,
                          height: ph,
                          background: "#f1f5f9",
                          borderRadius: "3px 3px 0 0",
                          border: "1px solid #e2e8f0",
                          borderBottom: "none",
                        }}
                      />
                      {e.actual !== null ? (
                        <div
                          title={`Actual: ${e.actual}`}
                          style={{
                            flex: 1,
                            height: ah,
                            background: s.bar,
                            borderRadius: "3px 3px 0 0",
                            opacity: 0.9,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            flex: 1,
                            height: 3,
                            background: "#e2e8f0",
                            borderRadius: "3px 3px 0 0",
                          }}
                        />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: e.isToday ? "#0f172a" : "#cbd5e1",
                        letterSpacing: 0.5,
                        marginTop: 4,
                      }}
                    >
                      {e.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px 16px",
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #f1f5f9",
              }}
            >
              {[
                {
                  bg: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  label: "Planned",
                  tc: "#94a3b8",
                },
                {
                  bg: "#10b981",
                  border: "none",
                  label: "Ahead",
                  tc: "#94a3b8",
                },
                {
                  bg: "#3b82f6",
                  border: "none",
                  label: "On Track",
                  tc: "#94a3b8",
                },
                {
                  bg: "#ef4444",
                  border: "none",
                  label: "Behind",
                  tc: "#94a3b8",
                },
                {
                  bg: "#f59e0b",
                  border: "none",
                  label: "Pending",
                  tc: "#94a3b8",
                },
                {
                  bg: "#fee2e2",
                  border: "1px solid #fca5a5",
                  label: "-n Backlog",
                  tc: "#dc2626",
                },
                {
                  bg: "#dcfce7",
                  border: "1px solid #6ee7b7",
                  label: "+n Surplus",
                  tc: "#059669",
                },
              ].map((x) => (
                <span
                  key={x.label}
                  style={{ display: "flex", alignItems: "center", gap: 5 }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: x.bg,
                      border: x.border,
                      flexShrink: 0,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: 10, color: x.tc, fontWeight: 600 }}>
                    {x.label}
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── SECTION 5: FILTERS ──────────────────────────────────────────── */}
        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Filter size={13} style={{ color: "#94a3b8" }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Filters
            </span>
            <span style={{ fontSize: 11, color: "#cbd5e1", marginLeft: 4 }}>
              — {selectedWeek} · {filteredWeekPlans.length} plan(s)
            </span>
          </div>
          <div
            style={{
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "Plant",
                val: plantFilter,
                set: setPlantFilter,
                ph: "Filter by plant...",
              },
              {
                label: "Assembly Line",
                val: lineFilter,
                set: setLineFilter,
                ph: "Filter by line...",
              },
            ].map(({ label, val, set, ph }) => (
              <div
                key={label}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}:
                </span>
                <div style={{ position: "relative" }}>
                  <Search
                    size={11}
                    style={{
                      position: "absolute",
                      left: 9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#94a3b8",
                    }}
                  />
                  <input
                    value={val}
                    onChange={(ev) => set(ev.target.value)}
                    placeholder={ph}
                    style={{
                      paddingLeft: 26,
                      paddingRight: 10,
                      paddingTop: 7,
                      paddingBottom: 7,
                      fontSize: 12,
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 9,
                      outline: "none",
                      width: 180,
                    }}
                  />
                </div>
              </div>
            ))}
            {(plantFilter || lineFilter) && (
              <button
                onClick={() => {
                  setPlantFilter("");
                  setLineFilter("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "#64748b",
                  background: "none",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </section>

        {/* ── SECTION 6: TABLE ────────────────────────────────────────────── */}
        <section
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid #f1f5f9",
              background: "#fafafa",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {selectedWeek} — Production Summary
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    borderBottom: "1px solid #e8ecf0",
                  }}
                >
                  {[
                    "Model",
                    "Part",
                    "Capacity",
                    "Planned",
                    "Actual",
                    "Balance",
                    "Adherence",
                    "Backlog",
                    "Child Parts",
                    "Plant · Line",
                    "Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 9,
                        fontWeight: 800,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: 1.5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.length > 0 ? (
                  tableRows.map(
                    (
                      {
                        plan,
                        planned,
                        actual,
                        balance,
                        adherence,
                        childShortage,
                        entered,
                      },
                      idx,
                    ) => {
                      const bom = g.bom(plan);
                      const mdl = g.model(plan);
                      const plt = g.plant(plan);
                      const line = g.line(plan);
                      const kids = g.children(plan);
                      const backlogUnits = Math.max(-balance, 0);

                      return (
                        <tr
                          key={plan._id}
                          onClick={() => {
                            setSelectedPlanId(plan._id);
                            setSelectedWeek(plan.week);
                          }}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            cursor: "pointer",
                            background:
                              plan._id === selectedPlanId
                                ? "#eff6ff"
                                : idx % 2 === 1
                                  ? "#fafafa"
                                  : "#fff",
                            transition: "background .1s",
                          }}
                          onMouseEnter={(ev) => {
                            if (plan._id !== selectedPlanId)
                              (
                                ev.currentTarget as HTMLTableRowElement
                              ).style.background = "#f8fafc";
                          }}
                          onMouseLeave={(ev) => {
                            (
                              ev.currentTarget as HTMLTableRowElement
                            ).style.background =
                              plan._id === selectedPlanId
                                ? "#eff6ff"
                                : idx % 2 === 1
                                  ? "#fafafa"
                                  : "#fff";
                          }}
                        >
                          <td style={{ padding: "11px 14px" }}>
                            <span
                              style={{
                                background: "#ede9fe",
                                color: "#7c3aed",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 20,
                              }}
                            >
                              {mdl.modelName}
                            </span>
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#0f172a",
                              }}
                            >
                              {bom.partNumber}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#94a3b8",
                                maxWidth: 140,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {bom.partName}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontWeight: 700,
                              fontSize: 13,
                              color: "#475569",
                            }}
                          >
                            {plan.capacity.toLocaleString()}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontWeight: 900,
                              fontSize: 14,
                              color: "#0f172a",
                            }}
                          >
                            {planned.toLocaleString()}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontWeight: 900,
                              fontSize: 14,
                              color: entered > 0 ? "#0f172a" : "#e2e8f0",
                            }}
                          >
                            {entered > 0 ? actual.toLocaleString() : "—"}
                          </td>
                          <td
                            style={{
                              padding: "11px 14px",
                              fontWeight: 900,
                              fontSize: 14,
                              color:
                                entered > 0
                                  ? balance >= 0
                                    ? "#059669"
                                    : "#dc2626"
                                  : "#e2e8f0",
                            }}
                          >
                            {entered > 0
                              ? balance >= 0
                                ? `+${balance}`
                                : balance
                              : "—"}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            {entered > 0 ? (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 7,
                                }}
                              >
                                <div
                                  style={{
                                    width: 52,
                                    height: 5,
                                    background: "#f1f5f9",
                                    borderRadius: 3,
                                    overflow: "hidden",
                                  }}
                                >
                                  <div
                                    style={{
                                      height: "100%",
                                      borderRadius: 3,
                                      background:
                                        adherence >= 100
                                          ? "#10b981"
                                          : adherence >= 90
                                            ? "#3b82f6"
                                            : "#ef4444",
                                      width: `${Math.min(adherence, 100)}%`,
                                    }}
                                  />
                                </div>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "#475569",
                                  }}
                                >
                                  {adherence.toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: "#e2e8f0", fontSize: 12 }}>
                                —
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            {backlogUnits > 0 ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#dc2626",
                                  background: "#fff1f2",
                                  padding: "3px 8px",
                                  borderRadius: 20,
                                }}
                              >
                                <AlertCircle size={10} /> {backlogUnits}
                              </span>
                            ) : entered > 0 ? (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: "#94a3b8",
                                }}
                              >
                                —
                              </span>
                            ) : (
                              <span style={{ color: "#e2e8f0" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            {kids.length > 0 ? (
                              childShortage > 0 ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "#dc2626",
                                    background: "#fff1f2",
                                    padding: "3px 8px",
                                    borderRadius: 20,
                                  }}
                                >
                                  <AlertCircle size={10} /> {kids.length} ·
                                  shortage
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "#059669",
                                    background: "#f0fdf4",
                                    padding: "3px 8px",
                                    borderRadius: 20,
                                  }}
                                >
                                  <CheckCircle2 size={10} /> {kids.length} parts
                                </span>
                              )
                            ) : (
                              <span style={{ color: "#e2e8f0", fontSize: 12 }}>
                                —
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#334155",
                              }}
                            >
                              {plt.plantName}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: "#94a3b8",
                                marginTop: 1,
                              }}
                            >
                              {line.assemblyLineName}
                            </div>
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            {(() => {
                              const sc: Record<
                                string,
                                { bg: string; color: string }
                              > = {
                                PLANNED: { bg: "#dbeafe", color: "#1d4ed8" },
                                IN_PROGRESS: {
                                  bg: "#fef3c7",
                                  color: "#d97706",
                                },
                                COMPLETED: { bg: "#d1fae5", color: "#059669" },
                                CANCELLED: { bg: "#fee2e2", color: "#dc2626" },
                              };
                              const c = sc[plan.status] || {
                                bg: "#f1f5f9",
                                color: "#64748b",
                              };
                              return (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 800,
                                    padding: "3px 8px",
                                    borderRadius: 20,
                                    background: c.bg,
                                    color: c.color,
                                  }}
                                >
                                  {plan.status}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleDeletePlan(plan._id, plan.week);
                              }}
                              style={{
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "#fca5a5",
                                padding: 4,
                                borderRadius: 6,
                              }}
                              title="Delete plan"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={12}
                      style={{ padding: "48px 0", textAlign: "center" }}
                    >
                      <Package
                        size={36}
                        style={{
                          color: "#e2e8f0",
                          margin: "0 auto 8px",
                          display: "block",
                        }}
                      />
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#94a3b8",
                        }}
                      >
                        No plans for {selectedWeek}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}
                      >
                        Click "+ Add Production Plan" to create one
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {tableRows.length > 0 && (
                <tfoot>
                  <tr
                    style={{
                      background: "#f8fafc",
                      borderTop: "2px solid #e2e8f0",
                    }}
                  >
                    <td
                      colSpan={3}
                      style={{
                        padding: "10px 14px",
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Totals
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 900,
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    >
                      {tableRows
                        .reduce((s, r) => s + r.planned, 0)
                        .toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 900,
                        fontSize: 14,
                        color: "#0f172a",
                      }}
                    >
                      {tableRows.some((r) => r.entered > 0)
                        ? tableRows
                            .reduce((s, r) => s + r.actual, 0)
                            .toLocaleString()
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 900,
                        fontSize: 14,
                      }}
                    >
                      {(() => {
                        if (!tableRows.some((r) => r.entered > 0))
                          return <span style={{ color: "#e2e8f0" }}>—</span>;
                        const b = tableRows.reduce((s, r) => s + r.balance, 0);
                        return (
                          <span
                            style={{ color: b >= 0 ? "#059669" : "#dc2626" }}
                          >
                            {b >= 0 ? `+${b}` : b}
                          </span>
                        );
                      })()}
                    </td>
                    <td colSpan={6} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        {loading && plans.length === 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "64px 0",
            }}
          >
            <Loader2
              className="animate-spin"
              size={32}
              style={{ color: "#cbd5e1" }}
            />
          </div>
        )}
      </div>

      {/* MODALS */}
      {editingEntry && selectedPlan && (
        <EntryModal
          entry={editingEntry}
          plan={selectedPlan}
          onSave={handleSaveEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}
      {showAddModal && (
        <AddPlanModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSavePlan}
          currentYear={cwi.year}
          currentWeekNumber={cwi.weekNumber}
        />
      )}
    </div>
  );
};

export default ProductionDashboard;
