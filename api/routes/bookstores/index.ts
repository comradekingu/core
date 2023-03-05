import bodyParser from "body-parser";

import {
  bookstore,
  bookstoreComment,
  PrismaClient,
} from "~prisma_clients/client_dm";
import { ExpressCall } from "~routes/_express-call";
import { SimpleBookstore } from "~types/SimpleBookstore";

const prisma = new PrismaClient();

const parseForm = bodyParser.json();

export const get = async (
  ...[, res]: ExpressCall<{ resBody: SimpleBookstore[] }>
) => res.json(await getActiveBookstores());

const getActiveBookstores = async () =>
  await prisma.bookstore.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      coordX: true,
      coordY: true,
      comments: {
        where: {
          isActive: true,
        },
      },
    },
    where: {
      comments: {
        some: {
          isActive: true,
        },
      },
    },
  });

export const put = [
  parseForm,
  async (
    ...[req, res]: ExpressCall<{
      resBody: bookstoreComment;
      reqBody: { id?: string; bookstore: SimpleBookstore };
    }>
  ) => {
    const { bookstore } = req.body;
    const {
      name,
      address,
      coordX: coordXParam,
      coordY: coordYParam,
      comments,
    } = bookstore;
    const id = req.body.id;
    const coordX = coordXParam;
    const coordY = coordYParam;
    if (!id && !name) {
      res.writeHead(400);
      res.end("No bookstore ID or name was provided");
      return;
    }
    let dbBookstore: bookstore;
    if (id) {
      try {
        dbBookstore = await prisma.bookstore.findUniqueOrThrow({
          where: { id: parseInt(id) },
        });
      } catch (e) {
        res.writeHead(400);
        res.end(`No bookstore exists with ID ${id}`);
        return;
      }
    } else {
      dbBookstore = await prisma.bookstore.create({
        data: {
          name,
          address,
          coordX,
          coordY,
        },
      });
    }
    const user = req.user
      ? await prisma.user.findUnique({
          where: {
            id: req.user.id,
          },
        })
      : null;
    const createdComment = await prisma.bookstoreComment.create({
      data: {
        bookstoreId: dbBookstore.id,
        isActive: false,
        userId: user?.id,
        comment: comments[comments.length - 1].comment,
      },
    });

    return res.json(createdComment);
  },
];
