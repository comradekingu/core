import { Email } from "~emails/email";
import { user } from "~prisma_clients/client_dm";

export default class extends Email {
  data: {
    user: user | null;
  };
  templatePath = __dirname;

  constructor(data: { user: user | null }) {
    super();
    this.data = data;
  }

  getTo = () => process.env.SMTP_USERNAME!;
  getToName = () => process.env.SMTP_FRIENDLYNAME!;
  getFrom = () => this.data.user?.email || "anonymous@duckmanager.net";
  getFromName = () => this.data.user?.username || "Anonymous";
  getSubject = () => "Bookstore suggestion";
}
