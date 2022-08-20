import { Handler, Request } from "express";

import { PrismaClient } from "../../../prisma/generated/client_dm";

const getUser = async (req: Request) =>
  await prisma.users.findUnique({
    where: { id: req.user.id },
  });

const prisma = new PrismaClient();
export const post: Handler = async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    res.writeHead(500);
    res.end("This user does not exist");
    return;
  }
  if (!user.lastAccess) {
    console.log(`"Initializing last access for user ${req.user.id}`);
  } else if (!user.previousAccess || user.lastAccess < user.previousAccess) {
    console.log(`"Updating last access for user ${req.user.id}`);
    user.previousAccess = user.lastAccess;
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        previousVisit: user.previousAccess || new Date(),
      })
    );
    return;
  }
  user.lastAccess = new Date();
  prisma.users.update({
    data: user,
    where: {
      id: req.user.id,
    },
  });

  res.writeHead(200);
  res.end();
};
