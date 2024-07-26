import type { Socket } from "socket.io";

import type { SimpleIssueWithPartInfo } from "~dm-types/SimpleIssue";
import { prismaCoa } from "~prisma-clients";

import type Events from "../types";
export default (socket: Socket<Events>) => {
  socket.on("getStoryDetails", (storycode, callback) =>
    prismaCoa.inducks_story
      .findUniqueOrThrow({
        where: {
          storycode,
        },
      })
      .then((results) => {
        callback({ data: results });
      })
      .catch((e) => {
        callback({ error: "Error", errorDetails: e });
      }),
  );

  socket.on("getStoryversionDetails", (storyversioncode, callback) =>
    prismaCoa.inducks_storyversion
      .findUniqueOrThrow({
        where: {
          storyversioncode,
        },
      })
      .then((results) => {
        callback({ data: results });
      })
      .catch((e) => {
        callback({ error: "Error", errorDetails: e });
      }),
  );

  socket.on("getStoryjobs", (storyversioncode, callback) =>
    prismaCoa.inducks_storyjob
      .findMany({
        where: {
          storyversioncode,
        },
      })
      .then((results) => {
        callback({ data: results });
      })
      .catch((e) => {
        callback({ error: "Error", errorDetails: e });
      }),
  );

  socket.on("searchStory", async (keywords, withIssues, callback) => {
    const limit = 10;
    const joinedKeywords = keywords.join(" ");
    let results = await prismaCoa.$queryRaw<Parameters<typeof callback>[0]["results"]>`
      SELECT inducks_storyversion.storycode,
             inducks_storyversion.entirepages,
             inducks_entry.title                         AS title,
             MATCH (inducks_entry.title) AGAINST (${joinedKeywords}) /
             (IF(inducks_storyversion.kind = 'n', 1, 2)) AS score
      FROM inducks_entry
               INNER JOIN inducks_storyversion ON inducks_entry.storyversioncode = inducks_storyversion.storyversioncode
      WHERE inducks_storyversion.storycode <> ''
        AND MATCH (inducks_entry.title) AGAINST (${joinedKeywords})
      GROUP BY inducks_storyversion.storycode
      ORDER BY score DESC, inducks_entry.title
      LIMIT ${limit + 1}
  `;

    const hasMore = results.length > limit;
    results = results.slice(0, limit);

    if (withIssues) {
      for (const idx of results.keys()) {
        results[idx].issues = await listIssuesFromStoryCode(
          results[idx].storycode,
        );
      }
    }

    callback({
      results,
      hasMore,
    });
  });
};

const listIssuesFromStoryCode = async (storycode: string) =>
  prismaCoa.$queryRaw<SimpleIssueWithPartInfo[]>`
    SELECT i.publicationcode,
           i.short_issuenumber AS shortIssuenumber,
           i.short_issuecode AS shortIssuecode,
           e.storyversioncode,
           e.part,
           sv.estimatedpanels,
           sv_o.estimatedpanels AS total_estimatedpanels
    FROM inducks_issue i
      INNER JOIN inducks_entry e USING (short_issuecode)
      INNER JOIN inducks_storyversion sv USING (storyversioncode)
      INNER JOIN inducks_storyversion sv_o ON sv.storycode = sv_o.storyversioncode
    WHERE sv.storycode = ${storycode}
    GROUP BY i.publicationcode, i.short_issuenumber
    ORDER BY i.publicationcode, i.short_issuenumber
  `;
