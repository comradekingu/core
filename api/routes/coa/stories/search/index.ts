import bodyParser from "body-parser";
import { Handler } from "express";

import { Prisma, PrismaClient } from "~prisma_clients/client_coa";

const prisma = new PrismaClient();

const parseForm = bodyParser.json();

interface simple_issue {
  code: string;
  publicationcode: string;
  issuenumber: string;
}

interface simple_story {
  storycode: string;
  title: string;
  score: number;
  issues: simple_issue[] | null;
}

const listIssuesFromStoryCode = async (storycode: string) =>
  prisma.$queryRaw<simple_issue[]>`
      SELECT inducks_issue.issuecode AS code, inducks_issue.publicationcode, inducks_issue.issuenumber
      FROM inducks_issue
               INNER JOIN inducks_entry ON inducks_entry.issuecode = inducks_issue.issuecode
               INNER JOIN inducks_storyversion ON inducks_storyversion.storyversioncode = inducks_entry.storyversioncode
      WHERE inducks_storyversion.storycode = ${storycode}
      GROUP BY inducks_issue.publicationcode, inducks_issue.issuenumber
      ORDER BY inducks_issue.publicationcode, inducks_issue.issuenumber
  `;

export const getStoriesByKeywords = async (
  keywords: string[],
  withIssues = false
) => {
  const limit = 10;

  let results = await prisma.$queryRaw<simple_story[]>`
      SELECT inducks_storyversion.storycode,
             inducks_entry.title                         AS title,
             MATCH (inducks_entry.title) AGAINST (${Prisma.join(keywords)}) /
             (IF(inducks_storyversion.kind = 'n', 1, 2)) AS score
      FROM inducks_entry
               INNER JOIN inducks_storyversion ON inducks_entry.storyversioncode = inducks_storyversion.storyversioncode
      WHERE inducks_storyversion.storycode <> ''
        AND MATCH (inducks_entry.title) AGAINST (${Prisma.join(keywords)})
      GROUP BY inducks_storyversion.storycode
      ORDER BY score DESC, inducks_entry.title
      LIMIT ${limit + 1}
  `;

  const hasMore = results.length > limit;
  results = results.slice(0, limit);

  if (withIssues) {
    for (const idx of results.keys()) {
      results[idx].issues = await listIssuesFromStoryCode(
        results[idx].storycode
      );
    }
  }

  return {
    results,
    hasMore,
  };
};

export const post = [
  parseForm,
  (async (req, res) => {
    if (!req.body.keywords) {
      res.writeHead(400);
      res.end();
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(await getStoriesByKeywords(req.body.keywords.split(",")))
      );
    }
  }) as Handler,
];
