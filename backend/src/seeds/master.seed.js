import { Plant, AssemblyLine, Part, Model, AppUser } from "../models/master.model.js";
import { localhostConn } from "../lib/db.js";

const mastersData = [
  {
    title: "Plant",
    model: Plant,
    data: [
      { plantId: "1", plantName: "IFB gujarat" },
      { plantId: "2", plantName: "IFB palwal" },
      { plantId: "3", plantName: "IFB Haryana" },
    ],
  },
  {
    title: "Assembly Line",
    model: AssemblyLine,
    data: [
      { assemblyLineId: "1", assemblyLineName: "Line 1" },
      { assemblyLineId: "2", assemblyLineName: "Line 2" },
      { assemblyLineId: "3", assemblyLineName: "Line 3" },
    ],
  },
  {
    title: "Parts",
    model: Part,
    data: [
      {
        partNumber: "1",
        partName: "Compressor",
        childPartList: [
          { partCode: "1", description: "Nut bolt", qty: 2 },
          { partCode: "2", description: "Pipes", qty: 3 },
          { partCode: "3", description: "Bearings", qty: 2 },
        ],
      },
      {
        partNumber: "2",
        partName: "Microwave",
        childPartList: [
          { partCode: "4", description: "Wire", qty: 3 },
          { partCode: "5", description: "PCB", qty: 1 },
          { partCode: "6", description: "0", qty: 2 },
        ],
      },
    ],
  },
  {
    title: "Model",
    model: Model,
    data: [
      { mdelId: "1", modelName: "Model 1" },
      { mdelId: "2", modelName: "Model 2" },
      { mdelId: "3", modelName: "Model 3" },
    ],
  },
  {
    title: "Users",
    model: AppUser,
    data: [
      { email: "depudagar90@gmail.com", password: "deepudagar50" },
      { email: "admin@gmail.com", password: "admin" },
      { email: "user@gmail.com", password: "user" },
    ],
  },
];

export const seedMasters = async () => {
  try {
    console.log("Starting Master Data Seeding...");

    for (const master of mastersData) {
      // 1. Clear existing data in the local collection
      await master.model.deleteMany({});
      
      // 2. Insert the new masterTable data
      await master.model.insertMany(master.data);
      
      console.log(`✅ Seeded ${master.title} successfully.`);
    }

    console.log("Master Data Seeding Completed!");
  } catch (error) {
    console.error("Error seeding master data:", error);
  }
};