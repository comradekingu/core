import { v2 as cloudinaryV2 } from "cloudinary";
import { Handler } from "express";

import { edge, PrismaClient } from "~prisma_clients/client_dm";

const prisma = new PrismaClient();

const SPRITE_SIZES = [10, 20, 50, 100, "full"];
const MAX_SPRITE_SIZE = 100;

const getSpriteName = (publicationcode: string, suffix: string) =>
  `edges-${publicationcode.replace("/", "-")}-${suffix}`;

const getSpriteRange = (issueNumber: string, rangeWidth: number) => {
  const issueNumberAsNumber = isNaN(parseInt(issueNumber))
    ? 0
    : parseInt(issueNumber);
  return [
    issueNumberAsNumber - ((issueNumberAsNumber - 1) % rangeWidth),
    issueNumberAsNumber -
      ((issueNumberAsNumber - 1) % rangeWidth) +
      rangeWidth -
      1,
  ].join("-");
};

interface Tag {
  slugs: string[];
  spriteSize: number;
}

const updateTags = async (edges: edge[]) => {
  await prisma.edgeSprite.deleteMany({
    where: {
      id: {
        in: edges.map(({ id }) => id),
      },
    },
  });

  const tagsToAdd: { [key: string]: Tag } = {};
  const insertOperations = [];

  for (const edge of edges) {
    for (const spriteSize of SPRITE_SIZES) {
      const { publicationcode } = edge;
      const spriteName = getSpriteName(
        publicationcode,
        spriteSize === "full"
          ? "full"
          : getSpriteRange(edge.issuenumber, spriteSize as number)
      );

      let actualSpriteSize;
      if (spriteSize === "full") {
        actualSpriteSize = await prisma.edge.count({
          where: { publicationcode },
        });
        if (actualSpriteSize > MAX_SPRITE_SIZE) {
          console.log(
            `Not creating a full sprite for publication ${publicationcode} : sprite size is too big (${spriteSize})`
          );
          continue;
        }
      } else {
        actualSpriteSize =
          (await prisma.edgeSprite.count({
            where: { spriteName },
          })) + 1;
      }
      console.log(`Adding tag ${spriteName} on ${edge.slug}`);
      if (!tagsToAdd[spriteName]) {
        tagsToAdd[spriteName] = { slugs: [], spriteSize: actualSpriteSize };
      }
      tagsToAdd[spriteName].slugs.push(edge.slug!);
      insertOperations.push(
        prisma.edgeSprite.create({
          data: {
            edgeId: edge.id,
            spriteName,
            spriteSize: actualSpriteSize,
          },
        })
      );
    }
  }
  await prisma.$transaction(insertOperations);

  const updateOperations = [];
  for (const [spriteName, { slugs, spriteSize }] of Object.entries(tagsToAdd)) {
    await cloudinaryV2.uploader.add_tag(spriteName, slugs);

    updateOperations.push(
      prisma.edgeSprite.updateMany({
        data: { spriteSize },
        where: { spriteName },
      })
    );
  }
  await prisma.$transaction(updateOperations);
};

const generateSprites = async () => {
  const spritesWithNoUrl = (
    (await prisma.$queryRaw`
    select distinct Sprite_name AS spriteName
    from tranches_pretes_sprites
    where Sprite_name not in (select sprite_name from tranches_pretes_sprites_urls)
      and Sprite_size < 100
  `) as { spriteName: string }[]
  ).map(({ spriteName }) => spriteName);

  const insertOperations = [];
  for (const spriteName of spritesWithNoUrl) {
    const { version } = await cloudinaryV2.uploader.generate_sprite(spriteName);
    insertOperations.push(
      prisma.edgeSpriteUrl.create({
        data: {
          version,
          spriteName,
        },
      })
    );
  }
  await prisma.$transaction(insertOperations);
};

export const put: Handler = async () => {
  const edgeIdsWithSprites = (
    await prisma.edgeSprite.findMany({
      select: { id: true },
    })
  ).map(({ id }) => id);

  const edgesWithoutSprites = await prisma.edge.findMany({
    where: {
      id: {
        notIn: edgeIdsWithSprites,
      },
    },
  });

  await updateTags(edgesWithoutSprites);
  await generateSprites();
};
