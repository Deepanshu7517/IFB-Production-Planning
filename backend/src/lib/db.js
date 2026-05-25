import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host} for chat`);
  } catch (error) {
    console.log("MongoDB connection error:", error);
  }
};

export const connectLocalhostDB = () => {
  try {
    const uri = process.env.LOCAL_DB || process.env.localhost_database || 'mongodb://127.0.0.1:27017/ifb';

    const localhostConn = mongoose.createConnection(uri);

    localhostConn.on("connected", () => {
      console.log(`MongoDB connected: Localhost for application`);
    });

    localhostConn.on("error", (err) => {
      console.log("Localhost MongoDB connection error:", err);
    });

    return localhostConn;
  } catch (error) {
    console.log("Localhost setup error:", error);
    // Return a dummy connection object so models don't crash
    return null;
  }
};

export const localhostConn = connectLocalhostDB();