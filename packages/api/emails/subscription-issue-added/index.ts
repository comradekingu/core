import { Email } from "~emails/email";
import { user } from "~prisma-clients/client_dm";

export default class extends Email {
  data: { user: user; publicationName: string; issuenumber: string };
  templatePath = __dirname;

  constructor(data: {
    user: user;
    publicationName: string;
    issuenumber: string;
  }) {
    super();
    this.data = data;
  }

  getFrom = () => process.env.SMTP_USERNAME!;
  getFromName = () => process.env.SMTP_FRIENDLYNAME!;
  getTo = () => this.data.user.email;
  getToName = () => this.data.user.username;
  getSubject = () =>
    Email.i18n.__(
      "{{publicationName}} {{issuenumber}} a été ajouté à votre collection !",
      {
        publicationName: this.data.publicationName,
        issuenumber: this.data.issuenumber,
      }
    );
}
