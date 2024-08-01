import type { Namespace, Server } from "socket.io";

import { prismaClient as prismaDm } from "~prisma-clients/schemas/dm";
import type { edgeModel } from "~prisma-clients/schemas/edgecreator";
import { prismaClient as prismaEdgeCreator } from "~prisma-clients/schemas/edgecreator";

import { augmentIssuesWithInducksData } from "../coa";
import type Events from "./types";
import { namespaceEndpoint } from "./types";

const getEdges = async (filters: {
  publicationcode?: string;
  issuecodes?: string[];
}) => {
  if (!filters.publicationcode || !filters.issuecodes) {
    throw new Error("Invalid filter");
  }
  const issuecode = filters.issuecodes
    ? {
        in: filters.issuecodes,
      }
    : undefined;
  const edgeModels: Record<string, edgeModel> = (
    await prismaEdgeCreator.edgeModel.findMany({
      where: {
        issuecode,
      },
    })
  ).reduce((acc, model) => ({ ...acc, [model.issuenumber]: model }), {});

  return (
    await prismaDm.edge.findMany({
      select: {
        id: true,
        issuecode: true,
      },
      where: {
        issuecode,
      },
    })
  ).reduce(
    (acc, edge) => ({
      ...acc,
      [edge.issuecode!]: {
        ...edge,
        modelId: edgeModels[edge.issuecode]?.id,
        v3: edgeModels[edge.issuecode] !== undefined,
      },
    }),
    {},
  );
};

export default (io: Server) => {
  (io.of(namespaceEndpoint) as Namespace<Events>).on("connection", (socket) => {
    console.log("connected to edges");

    socket.on("getWantedEdges", async (callback) =>
      prismaDm.$queryRaw<{ numberOfIssues: number; issuecode: string }[]>`
    SELECT Count(Numero) as numberOfIssues, issuecode
    FROM numeros AS issue
    WHERE NOT EXISTS(
      SELECT 1
      FROM tranches_pretes
      WHERE issue.issuecode = tranches_pretes.issuecode
      )
    GROUP BY issuecode
    ORDER BY numberOfIssues DESC, issuecode
    LIMIT 20
  `
        .then((issues) => issues.groupBy("issuecode"))
        .then((issues) => augmentIssuesWithInducksData(issues))
        .then(callback),
    );

    socket.on("getPublishedEdges", (callback) =>
      prismaDm.edge
        .findMany({
          select: { issuecode: true },
        })
        .then((issues) => issues.groupBy("issuecode"))
        .then((issues) => augmentIssuesWithInducksData(issues))
        .then(callback),
    );

    socket.on("getEdges", async (filters, callback) => {
      callback(await getEdges(filters));
    });
  });
};
