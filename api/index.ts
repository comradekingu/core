import * as Sentry from "@sentry/node";
import { AxiosError } from "axios";
import busboy from "connect-busboy";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { router } from "express-file-routing";

import { call } from "./call-api";
import {
  authenticateToken,
  checkUserIsAdmin,
  checkUserIsEdgeCreatorEditor,
  injectTokenIfValid,
} from "./routes/login";

const port = 3000;

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

const app = express();
app.use(
  Sentry.Handlers.requestHandler({
    user: ["id", "username"],
  }) as express.RequestHandler
);
app.use(
  cors({
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);
app.use(cookieParser());
app.use(busboy({ immediate: true }));

app.all(/^.+$/, injectTokenIfValid);
app.all(
  /^\/(edgecreator\/(publish|edgesprites)|notifications)|(edges\/(wanted|published))|(\/demo\/reset)/,
  [checkUserIsAdmin]
);

app.all(/^\/edgecreator\/(.+)/, [
  authenticateToken,
  checkUserIsEdgeCreatorEditor,
]);

app.all(/^\/collection\/(.+)/, authenticateToken);
app.all("/global-stats/user/collection/rarity", authenticateToken);

app.all(/^\/coa\/list\/(.+)/, async (req, res) => {
  const path = req.params[0];
  try {
    const response = await call(
      `/coa/list/${path}`,
      "coa",
      req.body,
      req.method
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response.data));
  } catch (e: unknown) {
    const error = e as AxiosError;
    res.statusCode = error.response?.status || 500;
    console.error(error.message);
    res.end();
  }
});

app.use("/", router());

app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
