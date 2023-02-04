import https from "https";

import { PrismaClient } from "~prisma_clients/client_cover_info";
import { ExpressCall } from "~routes/_express-call";

const prisma = new PrismaClient();

export const get = async (
  ...[req, res]: ExpressCall<undefined, { coverId: string }>
) => {
  const id = parseInt(req.params.coverId);
  const cover = await prisma.cover.findUniqueOrThrow({
    where: {
      id,
    },
  });
  const remotePath = `${cover.sitecode}/${
    cover.sitecode === "webusers" ? "webusers" : ""
  }${cover.url}`;

  const externalRequest = https.request(
    {
      hostname: process.env.INDUCKS_COVERS_ROOT,
      path: remotePath,
    },
    (externalRes) => {
      res.setHeader("content-disposition", "attachment; filename=cover.jpg");
      externalRes.pipe(res);
    }
  );
  externalRequest.end();
};
