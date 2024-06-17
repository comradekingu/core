import type { Namespace, Server } from "socket.io";

import { RequiredAuthMiddleware } from "../auth/util";
import edgePublication from "./edge-publication";
import edgeSprites from "./edge-sprites";
import models from "./models";
import multipleEdgePhotos from "./multiple-edge-photos";
import type Events from "./types";
import { namespaceEndpoint } from "./types";
export default (io: Server) => {
  (io.of(namespaceEndpoint) as Namespace<Events>)
    .use(RequiredAuthMiddleware)
    // .use(UserIsAdminMiddleware)
    .on("connection", (socket) => {
      console.log("connected to edgecreator as editor");

      models(socket);
      edgeSprites(socket);
      edgePublication(socket);
      multipleEdgePhotos(socket);
    });
};
