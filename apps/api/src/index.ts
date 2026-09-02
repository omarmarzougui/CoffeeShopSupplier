import { config } from "dotenv";

config({ path: "../../.env" });
config({ path: ".env", override: true });

import { buildApp } from "./app.js";
import { db } from "./lib/db.js";

const app = await buildApp();
app.log.info("api starting");

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await db.$disconnect();
    process.exit(0);
  });
}

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
