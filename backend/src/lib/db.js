import mongoose from "mongoose";

export const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn("MongoDB connection skipped: MONGODB_URI is not configured.");
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB connected: ${conn.connection.host} for chat`);
    return conn.connection;
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    return null;
  }
};

let localConnection = null;

export const connectLocalhostDB = () => {
  if (localConnection) {
    return localConnection;
  }

  try {
    const uri = process.env.LOCAL_DB || process.env.localhost_database || 'mongodb://127.0.0.1:27017/ifb';

    localConnection = mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    localConnection.on("connected", () => {
      console.log(`MongoDB connected: Localhost for application`);
    });

    localConnection.on("error", (err) => {
      console.error("Localhost MongoDB connection error:", err.message);
    });

    localConnection.on("disconnected", () => {
      console.warn("Localhost MongoDB disconnected. Mongoose will retry operations when it reconnects.");
    });

    return localConnection;
  } catch (error) {
    console.error("Localhost setup error:", error.message);
    return null;
  }
};

export const waitForLocalhostDB = async (timeoutMs = 15000) => {
  const conn = connectLocalhostDB();
  if (!conn) return false;
  if (conn.readyState === 1) return true;

  return new Promise((resolve) => {
    const finish = (ready) => {
      clearTimeout(timer);
      conn.off("connected", onConnected);
      conn.off("error", onError);
      resolve(ready);
    };
    const onConnected = () => finish(true);
    const onError = () => finish(false);
    const timer = setTimeout(() => finish(conn.readyState === 1), timeoutMs);

    conn.once("connected", onConnected);
    conn.once("error", onError);
  });
};

export const localhostConn = connectLocalhostDB();
