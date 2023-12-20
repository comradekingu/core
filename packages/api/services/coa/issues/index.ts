import { prismaCoa } from "~/prisma";
import { Socket } from "~/services/coa/types";
import { SimpleIssue } from "~dm-types/SimpleIssue";

export default (socket: Socket) => {
  socket.on("decompose", (issueCodes, callback) =>
    prismaCoa.inducks_issue
      .findMany({
        where: {
          issuecode: {
            in: issueCodes,
          },
        },
      })
      .then((data) =>
        data.reduce(
          (acc, value) => ({
            ...acc,
            [value.issuecode]: value,
          }),
          {},
        ),
      )
      .then(callback),
  );

  socket.on(
    "getIssuesByPublicationCodes",
    async (publicationCodes, callback) => {
      if (publicationCodes.length > 50) {
        throw new Error("400");
      }
      callback(
        (
          await prismaCoa.inducks_issue.findMany({
            select: {
              publicationcode: true,
              issuenumber: true,
            },
            where: {
              publicationcode: {
                in: publicationCodes,
              },
            },
          })
        ).map(({ publicationcode, issuenumber }) => ({
          code: "",
          publicationcode: publicationcode!,
          issuenumber: issuenumber!.replace(/ +/g, " "),
        })),
      );
    },
  );

  socket.on("getPublicationsByStorycode", async (storycode, callback) =>
    prismaCoa.$queryRaw`
        SELECT issuecode as code,
               publicationcode,
               issuenumber
        FROM inducks_issue issue
                 INNER JOIN inducks_entry entry using (issuecode)
                 INNER JOIN inducks_storyversion sv using (storyversioncode)
        WHERE sv.storycode = ${storycode}
        GROUP BY publicationcode, issuenumber
        ORDER BY publicationcode`.then((data) => {
      callback(data as SimpleIssue[]);
    }),
  );

  socket.on("getCountByPublicationcode", async (callback) =>
    prismaCoa.inducks_issue
      .groupBy({
        _count: {
          issuenumber: true,
        },
        by: ["publicationcode"],
      })
      .then((data) => {
        callback(
          data.reduce(
            (acc, { publicationcode, _count }) => ({
              ...acc,
              [publicationcode!]: _count.issuenumber,
            }),
            {} as { [publicationcode: string]: number },
          ),
        );
      }),
  );

  socket.on("getRecentIssues", (callback) =>
    prismaCoa.inducks_issue
      .findMany({
        where: {
          oldestdate: {
            lte: new Date().toISOString().split("T")[0],
          },
        },
        orderBy: [{ oldestdate: "desc" }],
        take: 50,
      })
      .then(callback),
  );
};
