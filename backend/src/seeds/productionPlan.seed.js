import mongoose from 'mongoose';
import ProductionPlan from '../models/productionPlan.model.js';
import dotenv from 'dotenv';

dotenv.config();

// Sample data for seeding
const sampleProductionPlans = [
  {
    week: 'W6',
    year: 2026,
    plant: {
      plantId: 'PLT002',
      plantName: 'Hisar'
    },
    assemblyLine: {
      assemblyLineId: 'ASL001',
      assemblyLineName: 'Line 1'
    },
    model: {
      modelId: 'MDL002',
      modelName: 'Model 2'
    },
    part: {
      partNumber: '40003140',
      partName: 'XBB FRONT POWER W/R - LH',
      price: 2000,
      childPartList: [
        { partCode: '50015625', description: 'XBB FRT PWD MOTOR - LH', qty: 1, unit: 'EA' },
        { partCode: '50015301', description: 'SELF TAPPING SCREW', qty: 3, unit: 'EA' },
        { partCode: '30019066', description: 'FRT LIFTING PLATE SUB ASSY - LH', qty: 1, unit: 'EA' }
      ]
    },
    capacity: 122,
    status: 'COMPLETED',
    notes: 'Production completed ahead of schedule'
  },
  {
    week: 'W7',
    year: 2026,
    plant: {
      plantId: 'PLT001',
      plantName: 'Rohtak'
    },
    assemblyLine: {
      assemblyLineId: 'ASL002',
      assemblyLineName: 'Line 2'
    },
    model: {
      modelId: 'MDL001',
      modelName: 'Model 1'
    },
    part: {
      partNumber: '40003141',
      partName: 'XBB REAR POWER W/R - RH',
      price: 1800,
      childPartList: [
        { partCode: '50015626', description: 'XBB REAR PWD MOTOR - RH', qty: 1, unit: 'EA' },
        { partCode: '50015302', description: 'BOLT M6x12', qty: 4, unit: 'EA' }
      ]
    },
    capacity: 150,
    status: 'IN_PROGRESS',
    notes: 'Currently in production phase'
  },
  {
    week: 'W7',
    year: 2026,
    plant: {
      plantId: 'PLT002',
      plantName: 'Hisar'
    },
    assemblyLine: {
      assemblyLineId: 'ASL001',
      assemblyLineName: 'Line 1'
    },
    model: {
      modelId: 'MDL003',
      modelName: 'Model 3'
    },
    part: {
      partNumber: '40003142',
      partName: 'DOOR HANDLE ASSEMBLY',
      price: 1200,
      childPartList: [
        { partCode: '50015627', description: 'HANDLE GRIP', qty: 1, unit: 'EA' },
        { partCode: '50015628', description: 'MOUNTING BRACKET', qty: 2, unit: 'EA' }
      ]
    },
    capacity: 200,
    status: 'IN_PROGRESS',
    notes: 'High priority order'
  },
  {
    week: 'W8',
    year: 2026,
    plant: {
      plantId: 'PLT001',
      plantName: 'Rohtak'
    },
    assemblyLine: {
      assemblyLineId: 'ASL003',
      assemblyLineName: 'Line 3'
    },
    model: {
      modelId: 'MDL002',
      modelName: 'Model 2'
    },
    part: {
      partNumber: '40003143',
      partName: 'SIDE MIRROR ASSEMBLY',
      price: 2500,
      childPartList: [
        { partCode: '50015629', description: 'MIRROR GLASS', qty: 1, unit: 'EA' },
        { partCode: '50015630', description: 'MOTOR ACTUATOR', qty: 1, unit: 'EA' }
      ]
    },
    capacity: 95,
    status: 'PLANNED',
    notes: 'Scheduled for next week'
  },
  {
    week: 'W8',
    year: 2026,
    plant: {
      plantId: 'PLT002',
      plantName: 'Hisar'
    },
    assemblyLine: {
      assemblyLineId: 'ASL002',
      assemblyLineName: 'Line 2'
    },
    model: {
      modelId: 'MDL001',
      modelName: 'Model 1'
    },
    part: {
      partNumber: '40003144',
      partName: 'DASHBOARD ASSEMBLY',
      price: 3500,
      childPartList: [
        { partCode: '50015631', description: 'DASHBOARD PANEL', qty: 1, unit: 'EA' },
        { partCode: '50015632', description: 'INSTRUMENT CLUSTER', qty: 1, unit: 'EA' },
        { partCode: '50015633', description: 'AIRBAG MODULE', qty: 1, unit: 'EA' }
      ]
    },
    capacity: 80,
    status: 'PLANNED'
  },
  {
    week: 'W9',
    year: 2026,
    plant: {
      plantId: 'PLT003',
      plantName: 'Goa'
    },
    assemblyLine: {
      assemblyLineId: 'ASL001',
      assemblyLineName: 'Line 1'
    },
    model: {
      modelId: 'MDL004',
      modelName: 'Model 4'
    },
    part: {
      partNumber: '40003145',
      partName: 'EXHAUST SYSTEM',
      price: 4200,
      childPartList: [
        { partCode: '50015634', description: 'EXHAUST MANIFOLD', qty: 1, unit: 'EA' },
        { partCode: '50015635', description: 'CATALYTIC CONVERTER', qty: 1, unit: 'EA' },
        { partCode: '50015636', description: 'MUFFLER', qty: 1, unit: 'EA' }
      ]
    },
    capacity: 110,
    status: 'PLANNED'
  },
  {
    week: 'W5',
    year: 2026,
    plant: {
      plantId: 'PLT001',
      plantName: 'Rohtak'
    },
    assemblyLine: {
      assemblyLineId: 'ASL001',
      assemblyLineName: 'Line 1'
    },
    model: {
      modelId: 'MDL002',
      modelName: 'Model 2'
    },
    part: {
      partNumber: '40003146',
      partName: 'TRANSMISSION ASSEMBLY',
      price: 8500,
      childPartList: [
        { partCode: '50015637', description: 'GEARBOX', qty: 1, unit: 'EA' },
        { partCode: '50015638', description: 'CLUTCH ASSEMBLY', qty: 1, unit: 'EA' }
      ]
    },
    capacity: 65,
    status: 'COMPLETED'
  },
  {
    week: 'W7',
    year: 2026,
    plant: {
      plantId: 'PLT003',
      plantName: 'Goa'
    },
    assemblyLine: {
      assemblyLineId: 'ASL002',
      assemblyLineName: 'Line 2'
    },
    model: {
      modelId: 'MDL003',
      modelName: 'Model 3'
    },
    part: {
      partNumber: '40003147',
      partName: 'FRONT BUMPER ASSEMBLY',
      price: 1600,
      childPartList: [
        { partCode: '50015639', description: 'BUMPER COVER', qty: 1, unit: 'EA' },
        { partCode: '50015640', description: 'FOG LAMP', qty: 2, unit: 'EA' }
      ]
    },
    capacity: 175,
    status: 'IN_PROGRESS'
  }
];

// Connect to MongoDB and seed data
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing production plans (optional - comment out if you want to keep existing data)
    await ProductionPlan.deleteMany({});
    console.log('🗑️  Cleared existing production plans');

    // Insert sample data
    const createdPlans = await ProductionPlan.insertMany(sampleProductionPlans);
    console.log(`✅ Successfully seeded ${createdPlans.length} production plans`);

    // Display summary
    console.log('\n📊 Seeded Data Summary:');
    console.log(`   Total Plans: ${createdPlans.length}`);
    console.log(`   Weeks Covered: W5, W6, W7, W8, W9`);
    console.log(`   Plants: Hisar, Rohtak, Goa`);
    console.log(`   Year: 2026`);

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();