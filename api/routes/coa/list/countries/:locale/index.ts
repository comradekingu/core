import { Handler, Response } from "express";

import { getCountryNames } from "~/routes/coa/list/countries/:locale/:countryCodes";
import { Prisma } from "~prisma_clients/client_coa";

export type getType = Prisma.PromiseReturnType<typeof getCountryNames>;
export const get: Handler = async (req, res: Response<getType>) => {
  const { locale } = req.params;

  return res.json(await getCountryNames(locale));
};
