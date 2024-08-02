import { inducks_issue } from "~prisma-clients/schemas/coa";

export const getSvgPath = async (isExport: boolean, issuecode: string) => {
  const issue = await inducks_issue.findFirstOrThrow({
    where: { issuecode },
    select: { publicationcode: true, issuenumber: true },
  });
  const [countrycode, magazinecode] = issue.publicationcode.split("/");
  `${process.cwd()}/../${process.env.EDGES_PATH!}/${countrycode}/gen/${
    isExport ? "" : "_"
  }${magazinecode}.${issue.issuenumber}.svg`;
};
