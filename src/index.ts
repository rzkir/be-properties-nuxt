import { createApp } from "@/app.js";

const { app, env } = createApp(process.env);

app.listen(env.PORT, () => {
  console.log(`[BE] listening on http://localhost:${env.PORT}`);
});