import axios from "axios";
import https from "https";
import { Namespace, Server } from "socket.io";

import { prismaCoa, prismaCoverInfo } from "~/prisma";
import { SimilarImagesResult } from "~dm-types/CoverSearchResults";

import { getCoverUrls } from "../coa/issue-details";
import Events from "./types";

export default (io: Server) => {
  (io.of(Events.namespaceEndpoint) as Namespace<Events>).on(
    "connection",
    (socket) => {
      socket.on("searchFromCover", async ({ base64, url }, callback) => {
        const buffer = url
          ? (
              await axios.get(url, {
                responseType: "arraybuffer",
              })
            ).data
          : Buffer.from(base64!.split(";base64,").pop()!, "base64");

        const pastecResponse: SimilarImagesResult | null =
          await getSimilarImages(buffer);

        console.log("Cover ID search: processing done");

        if (!pastecResponse) {
          callback({ error: "Pastec returned NULL" });
          return;
        }
        if (!pastecResponse?.image_ids) {
          callback({
            error: "Pastec returned en error",
            errorDetails: JSON.stringify(pastecResponse),
          });
        }
        console.log(
          `Cover ID search: matched cover IDs ${pastecResponse?.image_ids}`,
        );
        console.log(
          `Cover ID search: scores=${JSON.stringify(pastecResponse.scores)}`,
        );

        const coverInfos = await getIssuesCodesFromCoverIds(
          pastecResponse.image_ids,
        )
          .then(async (covers) => {
            const coversIdsAndIssueCodes = covers.reduce<
              Record<string, number>
            >((acc, { id, issuecode }) => ({ ...acc, [issuecode]: id }), {});
            return getCoverUrls(Object.keys(coversIdsAndIssueCodes)).then(
              (coverUrls) =>
                coverUrls.map(({ issuecode, fullUrl }) => ({
                  issuecode,
                  fullUrl,
                  id: coversIdsAndIssueCodes[issuecode],
                })),
            );
          })
          .then((covers) =>
            covers.sort((cover1, cover2) =>
              Math.sign(
                pastecResponse.image_ids.indexOf(cover1.id) -
                  pastecResponse.image_ids.indexOf(cover2.id),
              ),
            ),
          );
        const foundIssueCodes = [
          ...new Set(coverInfos.map(({ issuecode }) => issuecode)),
        ];
        console.log(
          `Cover ID search: matched issue codes ${foundIssueCodes.join(",")}`,
        );

        const issues = await getIssuesFromIssueCodes(foundIssueCodes);
        console.log(`Cover ID search: matched ${coverInfos.length} issues`);

        callback({
          covers: coverInfos.map((cover) =>
            Object.assign(
              cover,
              issues.find(({ issuecode }) => cover.issuecode === issuecode)!,
            ),
          ),
        });
      });

      socket.on("downloadCover", async (coverId, callback) => {
        const cover = await prismaCoverInfo.cover.findUniqueOrThrow({
          where: {
            id: coverId,
          },
        });
        const remotePath = `${cover.sitecode}/${
          cover.sitecode === "webusers" ? "webusers" : ""
        }${cover.url}`;

        const data: Uint8Array[] = [];
        const externalRequest = https.request(
          {
            hostname: process.env.INDUCKS_COVERS_ROOT,
            path: remotePath,
          },
          (res) => {
            res
              .on("data", function (chunk) {
                data.push(chunk);
              })
              .on("end", function () {
                //at this point data is an array of Buffers so Buffer.concat() can make us a new Buffer of all of them together
                callback({ buffer: Buffer.concat(data) });
              });
          },
        );
        externalRequest.on("error", function (err) {
          console.error(err);
          callback({ error: "Error", errorDetails: err.message });
        });
        externalRequest.end();
      });
    },
  );
};

const getIssuesFromIssueCodes = async (foundIssueCodes: string[]) =>
  prismaCoa.inducks_issue.findMany({
    select: {
      issuecode: true,
      publicationcode: true,
      issuenumber: true,
    },
    where: {
      publicationcode: {
        not: null,
      },
      issuenumber: {
        not: null,
      },
      issuecode: {
        in: foundIssueCodes,
      },
    },
  }) as Promise<
    { publicationcode: string; issuenumber: string; issuecode: string }[]
  >;

const getIssuesCodesFromCoverIds = async (coverIds: number[]) =>
  await prismaCoverInfo.cover.findMany({
    where: {
      sitecode: "webusers",
      id: {
        in: coverIds,
      },
    },
  });

const getSimilarImages = async (
  cover: Buffer,
): Promise<SimilarImagesResult | null> =>
  axios
    .post(
      `http://${process.env.PASTEC_HOSTS!}:${
        process.env.PASTEC_PORT
      }/index/searcher`,
      cover,
      {
        headers: {
          "Content-Type": "application/octet-stream",
        },
      },
    )
    .then(({ data }) => data)
    .catch((e) => {
      console.error(e);
    });
