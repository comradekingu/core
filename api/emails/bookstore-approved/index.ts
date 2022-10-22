import { user } from "~/dist/prisma/client_dm";
import { Email, i18n } from "~/emails";

export default class extends Email {
  data: {
    user: user;
    locale: string;
    newMedalLevel: number | null;
  };
  templatePath = __dirname;

  constructor(data: {
    user: user;
    locale: string;
    newMedalLevel: number | null;
  }) {
    super();
    this.data = data;
  }

  getFrom = () => process.env.SMTP_USERNAME!;
  getFromName = () => process.env.SMTP_FRIENDLYNAME!;
  getTo = () => this.data.user.email;
  getToName = () => this.data.user.username;
  getSubject = () => i18n.__("Votre revue de bouquinerie a été approuvée !");
  getTextBody = () => "";
}
