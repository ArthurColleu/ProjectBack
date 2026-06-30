import { createApp } from "./app.js";
import { createPool } from "./db/pool.js";
import { runMigrations } from "./db/migrate.js";
import { seed } from "./db/seed.js";
import { env } from "./config/env.js";

const db = createPool(env.DATABASE_URL);
await runMigrations(db);
await seed(db);
const app = createApp(db);
app.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});
