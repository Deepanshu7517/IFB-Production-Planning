/**
 * seedDailyEntries.mongo.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Run this directly in MongoDB Compass (open a Mongosh tab) OR via terminal:
 *
 *   mongosh "mongodb://localhost:27017/" seedDailyEntries.mongo.js
 *
 * This is the SIMPLEST option — no Node.js setup needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Config ────────────────────────────────────────────────────────────────────
const DB_NAME = 'ifb';         // ← change if your DB name is different
const RESET   = true;                    // ← set true to wipe existing entries first

// ── Helpers ───────────────────────────────────────────────────────────────────
function getMondayOfWeek(weekNum, year) {
  const jan1 = new Date(year, 0, 1);
  const dow = jan1.getDay();
  const monday = new Date(jan1);
  monday.setDate(jan1.getDate() + (weekNum - 1) * 7 + (dow <= 1 ? 1 - dow : 8 - dow));
  return monday;
}

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function generateActual(planned) {
  const r = Math.random();
  let pct;
  if (r < 0.25)      pct = 1.00 + Math.random() * 0.15;  // Ahead
  else if (r < 0.85) pct = 0.90 + Math.random() * 0.10;  // On-track
  else               pct = 0.75 + Math.random() * 0.14;  // Behind
  return Math.round(planned * pct);
}

const NOTES = [
  '', '', '', '', '',
  'Line running normally',
  'Machine downtime 45 min',
  'Overtime shift — target met',
  'Quality hold — 10 units reworked',
  'Material shortage — 1hr wait',
  'Minor conveyor adjustment',
];
function randomNote() { return NOTES[Math.floor(Math.random() * NOTES.length)]; }

// ── Main ──────────────────────────────────────────────────────────────────────
const db = db.getSiblingDB(DB_NAME);

if (RESET) {
  const r = db.dailyentries.deleteMany({});
  print(`🗑️  Reset: deleted ${r.deletedCount} entries`);
}

const plans = db.productionplans.find({}).toArray();
print(`\n📋 Found ${plans.length} production plan(s)`);

const today = new Date(); today.setHours(0,0,0,0);
let inserted = 0, skipped = 0;

for (const plan of plans) {
  const workingDays = plan.workingDays || 6;
  const weekNum     = parseInt(plan.week.replace('W', ''));
  const monday      = getMondayOfWeek(weekNum, plan.year);
  const base        = Math.floor(plan.capacity / workingDays);
  const remainder   = plan.capacity % workingDays;

  print(`\n📦 ${plan.week} | ${plan.plant.plantName} | ${plan.assemblyLine.assemblyLineName} | ${plan.part.partNumber}`);
  print(`   Capacity: ${plan.capacity} ÷ ${workingDays} = ${base}/day`);

  for (let i = 0; i < workingDays; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(0,0,0,0);
    const dateStr = toDateStr(d);
    const planned = (i === workingDays - 1) ? base + remainder : base;
    const dayName = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i];

    if (d >= today) {
      print(`   ⏭  ${dateStr} (${dayName}) — future, skipping`);
      skipped++;
      continue;
    }

    const actual = generateActual(planned);
    const notes  = randomNote();
    const pct    = ((actual / planned) * 100).toFixed(0);
    const icon   = actual >= planned ? '🟢' : actual >= planned * 0.9 ? '🔵' : '🔴';

    const result = db.dailyentries.updateOne(
      { planId: plan._id, date: dateStr },
      {
        $set: {
          planId:   plan._id,
          date:     dateStr,
          week:     plan.week,
          year:     plan.year,
          planned,
          actual,
          notes,
          shift:    'day',
          plant:        { plantId: plan.plant.plantId, plantName: plan.plant.plantName },
          assemblyLine: { assemblyLineId: plan.assemblyLine.assemblyLineId, assemblyLineName: plan.assemblyLine.assemblyLineName },
          model:        { modelId: plan.model.modelId, modelName: plan.model.modelName },
          part:         { partNumber: plan.part.partNumber, partName: plan.part.partName },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0 || result.modifiedCount > 0) {
      print(`   ${icon} ${dateStr} (${dayName}) — ${planned} planned → ${actual} actual (${pct}%)${notes ? ` | "${notes}"` : ''}`);
      inserted++;
    } else {
      print(`   ⏭  ${dateStr} — already exists`);
      skipped++;
    }
  }
}

print(`\n${'─'.repeat(50)}`);
print(`✅ Done! Inserted/Updated: ${inserted} | Skipped: ${skipped}`);
print(`\nOpen Production Calendar → plans will now show dummy actuals for past days.`);