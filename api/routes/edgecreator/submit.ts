import bodyParser from "body-parser";

import { PrismaClient } from "~/dist/prisma/client_dm";
import EdgeModelReady from "~emails/edge-model-ready";
import { ExpressCall } from "~routes/_express-call";

const prisma = new PrismaClient();
const parseForm = bodyParser.json();
export const put = [
  parseForm,
  async (
    ...[req, res]: ExpressCall<{
      resBody: {
        edgeModel: { url: string };
      };
      reqBody: {
        publicationcode: string;
        issuenumber: string;
      };
    }>
  ) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
    });
    const { publicationcode, issuenumber } = req.body;
    const email = new EdgeModelReady({
      user,
      publicationcode,
      issuenumber,
    });
    const edgeUrl = email.data.ecLink;
    await email.send();

    return res.json({ edgeModel: { url: edgeUrl } });
  },
];
