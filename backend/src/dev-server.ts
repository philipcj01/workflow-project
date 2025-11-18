import { startDashboard } from "./dashboard/server";

// Start dashboard in development mode
const port = parseInt(process.env.PORT || "3000");
const dbPath = process.env.DB_PATH || "./workflows.db";

console.log(
  `Starting dashboard server on port ${port} with database ${dbPath}`
);
startDashboard(port, dbPath).catch((error) => {
  console.error("Failed to start dashboard:", error);
  process.exit(1);
});
