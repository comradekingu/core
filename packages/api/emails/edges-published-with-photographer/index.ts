import { Email, i18n } from "~emails/email";
import type { user } from "~prisma-clients/extended/dm.extends";

export default class extends Email {
  data: {
    user: user;
    locale: string;
    extraEdges: number;
    extraPhotographerPoints: number;
    newMedalLevel: number | null;
  };
  templatePath = __dirname;

  constructor(data: {
    user: user;
    locale: string;
    extraEdges: number;
    extraPhotographerPoints: number;
    newMedalLevel: number | null;
  }) {
    super();
    this.data = data;
  }

  getFrom = () => process.env.SMTP_USERNAME!;
  getFromName = () => process.env.SMTP_FRIENDLYNAME!;
  getTo = () => this.data.user.email;
  getToName = () => this.data.user.username;
  getSubject = () =>
    this.data.extraEdges > 1
      ? i18n.__("Vos tranches ont été publiées sur DucksManager !")
      : i18n.__("Votre tranche a été publiée sur DucksManager !");
}
