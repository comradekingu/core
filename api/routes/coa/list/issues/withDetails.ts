import { Handler, Response } from "express";

import { Prisma, PrismaClient } from "~prisma_clients/client_coa";

const prisma = new PrismaClient();

type issueDetails = {
  publicationcode: string;
  issuenumber: string;
  title: string;
  coverUrl: string;
};

export type getType = { [issuenumber: string]: issueDetails[] };
export const get: Handler = async (req, res: Response<getType>) => {
  const publicationCodes =
    (req.query as { [key: string]: string }).publicationCodes?.split(",") || [];
  if (publicationCodes.length > 10) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end();
    return;
  }
  return res.json(
    (
      (await prisma.$queryRaw`
      SELECT publicationcode,
             issuenumber,
             title,
             (SELECT CONCAT(IF(sitecode = 'thumbnails', 'webusers', sitecode), '/', url) AS coverUrl
              FROM inducks_entry
                       INNER JOIN inducks_entryurl ON inducks_entry.entrycode = inducks_entryurl.entrycode
              WHERE inducks_entry.issuecode = inducks_issue.issuecode
                AND SUBSTR(inducks_entry.position, 0, 1) <> 'p'
              LIMIT 1) AS coverUrl
      FROM inducks_issue
      WHERE inducks_issue.publicationcode IN(${Prisma.join(
        publicationCodes
      )})`) as issueDetails[]
    ).reduce(
      (acc, row) => ({
        ...row,
        issuenumber: row.issuenumber.replace(/ +/g, " "),
      }),
      {}
    )
  );
};
