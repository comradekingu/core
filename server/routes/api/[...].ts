import { fetch } from "~/server/fetch";

export default defineEventHandler(
  async (event) =>
    (
      await fetch({
        path: `/${event.context.params._}`,
        role: "ducksmanager",
        method: event.context.method,
        user: event.context.user,
      })
    ).data
);
