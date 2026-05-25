/**
 * seedDailyEntries.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates dummy actual production entries for every production plan in DB.
 *
 * HOW TO RUN:
 *   node seedDailyEntries.js
 *
 * PLACE THIS FILE in your project root (same level as package.json).
 *
 * WHAT IT DOES:
 *   1. Connects to your MongoDB (reads MONGODB_URI from .env)
 *   2. Fetches every production plan
 *   3. For each plan, divides capacity by workingDays → daily target
 *   4. Generates realistic dummy actuals (±15% variation) for PAST days only
 *   5. Leaves today and future days empty (actual = null) so you can enter them
 *   6. Upserts into DailyEntries collection
 *
 * DUMMY VARIATION LOGIC:
 *   - 60% chance: on-track  (90–100% of planned)
 *   - 25% chance: ahead     (100–115% of planned)
 *   - 15% chance: behind    (<90%, down to 75%)
 *   - Sprinkles realistic notes on some entries
 *
 * RE-RUNNING:
 *   Safe to run multiple times — uses upsert so no duplicates.
 *   Pass --reset flag to clear all entries first: node seedDailyEntries.js --reset
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ifb';

// If your app uses a separate localhost connection (localhostConn), change this:
const DB_URI = process.env.LOCALHOST_MONGODB_URI || MONGODB_URI;

const RESET = process.argv.includes('--reset');

// ─── Schemas (inline so script is self-contained) ─────────────────────────────
const childPartSchema = new mongoose.Schema({
  partCode: String, description: String, qty: Number, unit: String
}, { _id: true });

const productionPlanSchema = new mongoose.Schema({
  week: String,
  year: Number,
  plant: { plantId: String, plantName: String },
  assemblyLine: { assemblyLineId: String, assemblyLineName: String },
  model: { modelId: String, modelName: String },
  part: {
    partNumber: String, partName: String, price: Number,
    childPartList: [childPartSchema]
  },
  capacity: Number,
  workingDays: { type: Number, default: 6 },
  status: String,
  notes: String,
}, { timestamps: true });

const dailyEntrySchema = new mongoose.Schema({
  planId:       { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionPlan', required: true },
  date:         { type: String, required: true },
  week:         String,
  year:         Number,
  planned:      Number,
  actual:       { type: Number, default: null },
  notes:        { type: String, default: '' },
  shift:        { type: String, default: 'day' },
  plant:        { plantId: String, plantName: String },
  assemblyLine: { assemblyLineId: String, assemblyLineName: String },
  model:        { modelId: String, modelName: String },
  part:         { partNumber: String, partName: String },
}, { timestamps: true });

dailyEntrySchema.index({ planId: 1, date: 1 }, { unique: true });

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMondayOfWeek(weekNum, year) {
  const jan1 = new Date(year, 0, 1);
  const dow = jan1.getDay();
  const monday = new Date(jan1);
  monday.setDate(jan1.getDate() + (weekNum - 1) * 7 + (dow <= 1 ? 1 - dow : 8 - dow));
  return monday;
}

function computeDaySlots(plan) {
  const weekNum = parseInt(plan.week.replace('W', ''));
  const monday = getMondayOfWeek(weekNum, plan.year);
  const base = Math.floor(plan.capacity / plan.workingDays);
  const remainder = plan.capacity % plan.workingDays;

  return Array.from({ length: plan.workingDays }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      planned: i === plan.workingDays - 1 ? base + remainder : base,
      dayIndex: i,
    };
  });
}

// Dummy note pool
const NOTES_POOL = [
  'Line running normally',
  'Minor stoppage — conveyor belt adjusted',
  'Overtime shift added to meet target',
  'Machine downtime 45 min — motor issue',
  'Quality hold — 12 units reworked',
  'New operator training — slight delay',
  'Material shortage — 1hr wait',
  'Maintenance window 30 min',
  'Extra shift — demand spike',
  '',  // many entries have no notes
  '', '', '', '', '',  // weight towards no notes
];

function randomNote() {
  return NOTES_POOL[Math.floor(Math.random() * NOTES_POOL.length)];
}

function generateActual(planned) {
  const rand = Math.random();
  let pct;
  if (rand < 0.25) {
    // Ahead: 100–115%
    pct = 1.0 + Math.random() * 0.15;
  } else if (rand < 0.85) {
    // On-track: 90–100%
    pct = 0.9 + Math.random() * 0.10;
  } else {
    // Behind: 75–89%
    pct = 0.75 + Math.random() * 0.14;
  }
  return Math.round(planned * pct);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🌱 Production Calendar — Seed Script');
  console.log('─'.repeat(50));
  console.log(`📡 Connecting to: ${DB_URI.replace(/:\/\/.*@/, '://***@')}`);

  await mongoose.connect(DB_URI);
  console.log('✅ MongoDB connected\n');

  const ProductionPlan = mongoose.models.ProductionPlan
    || mongoose.model('ProductionPlan', productionPlanSchema);

  const DailyEntry = mongoose.models.DailyEntry
    || mongoose.model('DailyEntry', dailyEntrySchema);

  // Optional reset
  if (RESET) {
    const deleted = await DailyEntry.deleteMany({});
    console.log(`🗑️  Reset: deleted ${deleted.deletedCount} existing entries\n`);
  }

  // Load all production plans
  const plans = await ProductionPlan.find({}).lean();
  console.log(`📋 Found ${plans.length} production plan(s)\n`);

  if (plans.length === 0) {
    console.log('⚠️  No plans found! Create some weekly plans first, then re-run this script.');
    await mongoose.disconnect();
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const plan of plans) {
    const workingDays = plan.workingDays || 6;
    const slots = computeDaySlots({ ...plan, workingDays });

    console.log(`\n📦 Plan: ${plan.week} | ${plan.plant.plantName} | ${plan.assemblyLine.assemblyLineName}`);
    console.log(`   Part: ${plan.part.partNumber} — ${plan.part.partName}`);
    console.log(`   Capacity: ${plan.capacity} ÷ ${workingDays} days = ${Math.floor(plan.capacity / workingDays)}/day`);

    for (const slot of slots) {
      const slotDate = new Date(slot.date + 'T00:00:00');

      // Only seed PAST days — leave today and future empty for real entry
      // const isPast = slotDate < today;
      const isPast = true;
      // if (!isPast) {
      //   console.log(`   ⏭  ${slot.date} (${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][slot.dayIndex]}) — future, skipping`);
      //   totalSkipped++;
      //   continue;
      // }

      const actual = generateActual(slot.planned);
      const notes = randomNote();
      const pct = ((actual / slot.planned) * 100).toFixed(0);
      const status = actual >= slot.planned ? '🟢' : actual >= slot.planned * 0.9 ? '🔵' : '🔴';

      try {
        await DailyEntry.findOneAndUpdate(
          { planId: plan._id, date: slot.date },
          {
            $set: {
              planId: plan._id,
              date: slot.date,
              week: plan.week,
              year: plan.year,
              planned: slot.planned,
              actual,
              notes,
              shift: 'day',
              plant: { plantId: plan.plant.plantId, plantName: plan.plant.plantName },
              assemblyLine: { assemblyLineId: plan.assemblyLine.assemblyLineId, assemblyLineName: plan.assemblyLine.assemblyLineName },
              model: { modelId: plan.model.modelId, modelName: plan.model.modelName },
              part: { partNumber: plan.part.partNumber, partName: plan.part.partName },
            }
          },
          { upsert: true, new: true }
        );

        const dayName = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][slot.dayIndex];
        console.log(`   ${status} ${slot.date} (${dayName}) — planned: ${slot.planned}, actual: ${actual} (${pct}%)${notes ? ` — "${notes}"` : ''}`);
        totalInserted++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`   ⏭  ${slot.date} — already exists, skipping (use --reset to overwrite)`);
          totalSkipped++;
        } else {
          console.error(`   ❌ ${slot.date} — ${err.message}`);
        }
      }
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Seeding complete!`);
  console.log(`   📥 Inserted/Updated: ${totalInserted} entries`);
  console.log(`   ⏭  Skipped:          ${totalSkipped} entries (future or existing)`);
  console.log('\n💡 Tip: Run with --reset to clear and re-generate all entries');
  console.log('   node seedDailyEntries.js --reset\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});