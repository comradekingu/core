import { Handler, Response } from "express";

import { loginAs } from "~/routes/auth/util";
import { getHashedPassword } from "~/routes/login";
import { PrismaClient } from "~prisma_clients/client_dm";

const prisma = new PrismaClient();

export type postType = { token: string };
export const post: Handler = async (req, res: Response<postType>) => {
  const demoUser = await prisma.user.findFirst({ where: { username: "demo" } });
  if (!demoUser) {
    res.writeHead(500);
    res.end();
  } else {
    const token = await loginAs(
      demoUser,
      getHashedPassword(demoUser!.password)
    );

    return res.json({ token });
  }
};
