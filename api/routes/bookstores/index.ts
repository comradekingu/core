import bodyParser from "body-parser";
import { Handler, Response } from "express";

import {
  bookstore,
  bookstoreComment,
  PrismaClient,
} from "~prisma_clients/client_dm";
import { SimpleBookstore } from "~types/SimpleBookstore";

const prisma = new PrismaClient();

const parseForm = bodyParser.json();

export type getType = SimpleBookstore[];
export const get: Handler = async (req, res: Response<getType>) =>
  res.json(await getActiveBookstores());

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

export type putType = bookstoreComment;
export const put = [
  parseForm,
  (async (req, res: Response<putType>) => {
    const { bookstore }: { bookstore: SimpleBookstore } = req.body;
    const {
      name,
      address,
      coordX: coordXParam,
      coordY: coordYParam,
      comments,
    } = bookstore;
    const id = parseInt(req.body.id);
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
          where: { id },
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
  }) as Handler,
];
