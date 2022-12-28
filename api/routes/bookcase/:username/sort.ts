import { Handler, Response } from "express";

import { PrismaClient } from "~prisma_clients/client_dm";

import { checkValidBookcaseUser } from "./index";

const prisma = new PrismaClient();

const getLastPublicationPosition = async (userId: number) =>
  (
    await prisma.bookcasePublicationOrder.aggregate({
      _max: { order: true },
      where: { userId },
    })
  )._max.order || -1;

export type getType = string[];
export const get: Handler = async (req, res: Response<getType>) => {
  const user = await checkValidBookcaseUser(req, res);
  if (user === null) {
    return;
  } else {
    const userId = user.id;
    let maxSort = await getLastPublicationPosition(userId);
    const userSortedPublicationcodes = (
      await prisma.bookcasePublicationOrder.findMany({
        select: { publicationcode: true },
        where: { userId },
      })
    ).map(({ publicationcode }) => publicationcode);
    const userPublicationcodes = await prisma.issue.findMany({
      select: {
        country: true,
        magazine: true,
      },
      distinct: ["country", "magazine"],
      where: { userId },
      orderBy: [{ country: "asc" }, { magazine: "asc" }],
    });
    const missingPublicationCodesInOrder = userPublicationcodes
      .map(({ country, magazine }) => `${country}/${magazine}`)
      .filter(
        (publicationcode) =>
          !userSortedPublicationcodes.includes(publicationcode)
      );

    const insertOperations = missingPublicationCodesInOrder.map(
      (publicationcode) =>
        prisma.bookcasePublicationOrder.create({
          data: {
            publicationcode,
            order: ++maxSort,
            userId,
          },
        })
    );
    await prisma.$transaction(insertOperations);

    return res.json(
      (
        await prisma.bookcasePublicationOrder.findMany({
          select: { publicationcode: true },
          where: { userId },
          orderBy: { order: "asc" },
        })
      ).map(({ publicationcode }) => publicationcode)
    );
  }
};
