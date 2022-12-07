import { Handler } from "express";

import { checkValidBookcaseUser } from "./index";

export const get: Handler = async (req, res) => {
  const user = await checkValidBookcaseUser(req, res);
  if (user !== null) {
    return res.json({
      textures: {
        bookcase: `${user.bookcaseTexture1}/${user.bookcaseSubTexture1}`,
        bookshelf: `${user.bookcaseTexture2}/${user.bookcaseSubTexture2}`,
      },
      showAllCopies: user.showDuplicatesInBookcase,
    });
  }
};
