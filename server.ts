import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://campo:UuUDq590PJvNwn14@iepe.bkgwmcp.mongodb.net/?appName=IEPE";

async function startServer() {
  const app = express();
  app.use(express.json());

  // MongoDB Client
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  let db: any;
  let seatsCollection: any;

  // API Endpoints
  app.get("/api/seats", async (req, res) => {
    try {
      if (!seatsCollection) {
        // Try to reconnect if not connected yet or failed
        if (!db) {
           return res.status(503).json({ error: "Database connecting... please retry" });
        }
      }
      const seats = await seatsCollection.find({}).toArray();
      res.json(seats);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/seats/toggle", async (req, res) => {
    const { tableId, seatId, occupied, name } = req.body;
    try {
      if (!seatsCollection) return res.status(503).json({ error: "Database not connected" });
      await seatsCollection.updateOne(
        { tableId, seatId },
        { $set: { tableId, seatId, occupied, name, updatedAt: new Date() } },
        { upsert: true }
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/seats/reset", async (req, res) => {
    try {
      if (!seatsCollection) return res.status(503).json({ error: "Database not connected" });
      await seatsCollection.deleteMany({});
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", dbConnected: !!seatsCollection });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    
    // Connect to MongoDB AFTER starting to listen
    client.connect().then(() => {
      db = client.db("campo_de_dios");
      seatsCollection = db.collection("active_session_seats");
      console.log("Connected to MongoDB - using active_session_seats collection");
    }).catch(err => {
      console.error("Failed to connect to MongoDB", err);
    });
  });
}

startServer();
