import { prismaCoa } from "~/prisma";
import { Prisma } from "~prisma-clients/client_coa";
import { ExpressCall } from "~routes/_express-call";
import { IssueCoverDetails } from "~types/IssueCoverDetails";

export const get = async (
  ...[req, res]: ExpressCall<{
    resBody: { [_issuenumber: string]: IssueCoverDetails[] };
    query: { publicationCodes: string };
  }>
) => {
  const publicationCodes = req.query.publicationCodes?.split(",") || [];
  if (publicationCodes.length > 10) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end();
    return;
  }
  return res.json(
    (
      (await prismaCoa.$queryRaw`
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
      )})`) as IssueCoverDetails[]
    ).reduce(
      (acc, row) => ({
        ...row,
        issuenumber: row.issuenumber.replace(/ +/g, " "),
      }),
      {}
    )
  );
};
