import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { getIndicators } from "./server/controllers/indicatorsController";
import { updateStock } from "./server/controllers/stockController";
import { getHistory } from "./server/controllers/historyController";

import { getNews } from "./server/controllers/newsController";
import { analyzeNews } from "./server/controllers/aiController";
import { getInvestidor10Data } from "./server/controllers/investidor10Controller";
import { updateAllStocks } from "./server/controllers/updateAllStocksController";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json()); // Add JSON body parser for POST requests

  // API Routes
  app.get("/api/indicators", getIndicators);
  app.get("/api/update-stock", updateStock);
  app.get("/api/history", getHistory);
  app.get("/api/news", getNews);
  app.post("/api/analyze-news", analyzeNews);
  app.get("/api/investidor10", getInvestidor10Data);
  app.get("/api/update-all-stocks", updateAllStocks);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
