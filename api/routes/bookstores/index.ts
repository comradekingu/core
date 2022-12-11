import bodyParser from "body-parser";
import { Handler } from "express";

import BookstoreSuggested from "~/emails/bookstore-suggested";
import { bookstore, PrismaClient } from "~prisma_clients/client_dm";
import { SimpleBookstore } from "~types/SimpleBookstore";

const prisma = new PrismaClient();

const parseForm = bodyParser.json();

export const get: Handler = async (req, res) =>
  res.json(
    (await prisma.bookstore.findMany({
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
    })) as SimpleBookstore[]
  );

export const put = [
  parseForm,
  (async (req, res) => {
    const { bookstore, newBookstoreComment: comment } = req.body;
    const {
      name,
      address,
      coordX: coordXParam,
      coordY: coordYParam,
    } = bookstore;
    const id = parseInt(req.body.id);
    const coordX = parseFloat(coordXParam);
    const coordY = parseFloat(coordYParam);
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
    await prisma.bookstoreComment.create({
      data: {
        bookstoreId: dbBookstore.id,
        isActive: false,
        userId: user?.id,
        comment,
      },
    });

    new BookstoreSuggested({ user });
  }) as Handler,
];
