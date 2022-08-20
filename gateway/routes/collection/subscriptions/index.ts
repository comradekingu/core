import bodyParser from "body-parser";
import { Handler, Request } from "express";

import {
  PrismaClient,
  subscription,
} from "../../../prisma/generated/client_dm";

const prisma = new PrismaClient();
const parseForm = bodyParser.json();

async function upsertSubscription(req: Request) {
  const publicationCodeParts = req.body.publicationCode.split("/");
  const dates = {
    startDate: new Date(Date.parse(req.body.startDate)),
    endDate: new Date(Date.parse(req.body.endDate)),
  };
  const id = parseInt(req.params.id);
  const userId = req.user.id;
  if (
    id &&
    !(await prisma.subscription.count({
      where: {
        id,
        users: {
          id: userId,
        },
      },
    }))
  ) {
    return null;
  }
  await prisma.subscription.upsert({
    update: dates,
    create: {
      country: publicationCodeParts[0],
      magazine: publicationCodeParts[1],
      users: {
        connect: { id: userId },
      },
      ...dates,
    },
    where: {
      id,
    },
  });
}

export const get: Handler = async (req, res) => {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      users: {
        id: req.user.id,
      },
    },
  });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify(
      subscriptions.map((subscription: subscription) => ({
        id: subscription.id,
        publicationCode: `${subscription.country}/${subscription.magazine}`,
        startDate: subscription.startDate.toISOString(),
        endDate: subscription.endDate.toISOString(),
      }))
    )
  );
};

export const put = [
  parseForm,
  (async (req, res) => {
    await upsertSubscription(req);
    res.writeHead(200);
    res.end();
  }) as Handler,
];
