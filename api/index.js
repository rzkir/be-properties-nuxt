import serverless from "serverless-http";

import { createApp } from "../dist/app.js";

const { app } = createApp(process.env);

export default serverless(app);

