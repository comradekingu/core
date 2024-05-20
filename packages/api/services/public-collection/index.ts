import type { Namespace, Server } from "socket.io";

import { prismaDm } from "~prisma-clients";
import type { user } from "~prisma-clients/client_dm";

import type Events from "./types";
import { namespaceEndpoint } from "./types";

export default (io: Server) => {
  (io.of(namespaceEndpoint) as Namespace<Events>).on("connection", (socket) => {
    console.log("connected to public-collection");

    socket.on("getPublicCollection", async (username, callback) => {
      let user: user;
      try {
        user = await prismaDm.user.findFirstOrThrow({
          where: { username },
        });
      } catch (e) {
        callback({ error: "User not found" });
        return;
      }
      if (!user.allowSharing) {
        callback({ error: "This user does not allow sharing" });
        return;
      }
      callback({
        issues: await prismaDm.issue.findMany({
          where: {
            userId: user.id,
          },
        }),
      });
    });
  });
};
