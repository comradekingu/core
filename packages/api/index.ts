import "module-alias/register";

import * as Sentry from "@sentry/node";
import dotenv from "dotenv";

import auth from "./services/auth";
import { OptionalAuthMiddleware } from "./services/auth/util";
import bookcase from "./services/bookcase";
import bookstores from "./services/bookstores";
import coa from "./services/coa";
import collection from "./services/collection";
import coverId from "./services/cover-id";
import demo from "./services/demo";
import edgecreator from "./services/edgecreator";
import events from "./services/events";
import feedback from "./services/feedback";
import globalStats from "./services/global-stats";
import login from "./services/login";
import notifications from "./services/notifications";
import presentationText from "./services/presentation-text";
import publicCollection from "./services/public-collection";
import stats from "./services/stats";
import status from "./services/status";
import { ServerWithUser } from "./services/types-server";

dotenv.config({
  path: "./.env",
});

Sentry.init({
  dsn: process.env.SENTRY_DSN,
});

(async () => {
  // app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

  const io = new ServerWithUser({
    cors: {
      origin: process.env.WEBSITE_ROOT,
    },
  });
  io.listen(4000);
  io.use(OptionalAuthMiddleware);
  io.use((socket, next) => {
    next();

    // app.all(
    //   /^\/(edgecreator\/(publish|edgesprites)|notifications)|(edges\/(published))|(\/demo\/reset)|(\/notification\/send)|(bookstores\/(approve|refuse))|(presentation-text\/(approve|refuse))/,
    //   [checkUserIsAdmin]
    // );

    // app.all(/^\/edgecreator\/(.+)/, [
    //   authenticateToken,
    //   checkUserIsEdgeCreatorEditor,
    // ]);

    // app.all(/^\/global-stats\/user\/list$/, [
    //   authenticateToken,
    //   checkUserIsEdgeCreatorEditor,
    // ]);

    // app.all(/^\/collection\/(.+)/, authenticateToken);
    // app.all("/global-stats/user/collection/rarity", authenticateToken);
  });

  auth(io);
  bookcase(io);
  bookstores(io);
  coa(io);
  collection(io);
  coverId(io);
  demo(io);
  edgecreator(io);
  events(io);
  feedback(io);
  globalStats(io);
  login(io);
  notifications(io);
  presentationText(io);
  publicCollection(io);
  stats(io);
  status(io);
})();
