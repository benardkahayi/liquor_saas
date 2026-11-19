import "dotenv/config";
import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 4000;

const app = createApp();

const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`API running on http://localhost:${PORT}`);
});