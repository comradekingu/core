import { Email, i18n } from "~emails/email";
import type { user } from "~prisma-clients/extended/dm.extends";

type InputData = {
  user: user;
  publicationcode: string;
  issuenumber: string;
};
type Data = InputData & {
  ecLink: string;
  shortIssuecode: string;
};
export default class extends Email {
  data: Data;
  templatePath = __dirname;

  constructor(data: InputData) {
    super();
    const shortIssuecode = `${data.publicationcode} ${data.issuenumber}`;
    this.data = {
      ...data,
      ecLink: `${process.env.EDGECREATOR_ROOT}/edit/${shortIssuecode}`,
      shortIssuecode,
    };
  }

  getFrom = () => this.data.user.email!;
  getFromName = () => this.data.user.username;
  getTo = () => process.env.SMTP_USERNAME!;
  getToName = () => process.env.SMTP_FRIENDLYNAME!;
  getSubject = () =>
    i18n.__("User {{username}} submitted the model of edge {{shortIssuecode}}", {
      username: this.data.user.username,
      shortIssuecode: this.data.shortIssuecode,
    });
}
