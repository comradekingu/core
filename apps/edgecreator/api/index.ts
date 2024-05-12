import * as Sentry from "@sentry/node";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { router } from "express-file-routing";

const parseForm = bodyParser.json();
import {
  authenticateToken,
  checkUserIsAdminForExportOrIsEditorForSaveOrIsFirstFileForModel,
  checkUserIsAdminOrEditor,
  injectTokenIfValid,
} from "~routes/_auth";

dotenv.config({
  path: "../.env",
});

const port = 3001;

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

const app = express();

app.use(
  Sentry.Handlers.requestHandler({
    user: ["id", "username"],
  }) as express.RequestHandler,
);
app.use(
  cors({
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  }),
);
app.use(cookieParser());

app.all(/^.+$/, injectTokenIfValid);
app.all(/^\/fs\/save$/, [
  authenticateToken,
  parseForm,
  checkUserIsAdminForExportOrIsEditorForSaveOrIsFirstFileForModel,
]);
app.all(/^\/fs\/(text|upload|upload-base64)$/, [
  authenticateToken,
  checkUserIsAdminOrEditor,
]);

app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

(async () => {
  app.use("/", await router({ directory: `${process.cwd()}/routes` }));
  app.listen(port, () =>
    console.log(`EdgeCreator API listening on port ${port}`),
  );
})();
