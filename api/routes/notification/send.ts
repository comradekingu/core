import PushNotifications from "@pusher/push-notifications-server";
import dayjs from "dayjs";
import { Handler } from "express";

import { i18n } from "~/emails";
import {
  COUNTRY_CODE_OPTION,
  getSuggestions,
} from "~/routes/collection/stats/suggestedissues/:countrycode/:sincePreviousVisit/:sort/:limit";
import {
  PrismaClient as PrismaClientDm,
  user,
} from "~prisma_clients/client_dm";

const pusher = new PushNotifications({
  instanceId: process.env.PUSHER_INSTANCE_ID!,
  secretKey: process.env.PUSHER_SECRET_KEY!,
});

const prisma = new PrismaClientDm();

const sendSuggestedIssueNotification = async (
  issuecode: string,
  issueTitle: string,
  storyCountPerAuthor: { [p: string]: number },
  userToNotify: user
) => {
  const notificationContent = {
    title: i18n.__("{{issueTitle}} est sorti !", {
      issueTitle,
    }),
    body: Object.keys(storyCountPerAuthor)
      .map((authorName) =>
        i18n.__(
          storyCountPerAuthor[authorName] === 1
            ? "• 1 nouvelle histoire de {{authorName}}"
            : "• {{newStoriesNumber}} nouvelles histoires de {{authorName}}",
          {
            authorName,
            newStoriesNumber: `${storyCountPerAuthor[authorName]}`,
          }
        )
      )
      .join(""),
  };
  await pusher.publishToUsers([userToNotify.username], {
    fcm: {
      notification: notificationContent,
    },
    apns: {
      aps: {
        alert: notificationContent,
      },
    },
  });
  console.log(
    `Notification sent to user ${userToNotify.username} concerning the release of issue ${issueTitle}`
  );
  await prisma.userSuggestionNotification.create({
    data: {
      issuecode,
      text: issueTitle,
      userId: userToNotify.id,
      date: new Date(),
    },
  });
};

export const post: Handler = async (req, res) => {
  const suggestionsSince = dayjs().add(-7, "days");
  let notificationsSent = 0;

  const { suggestionsPerUser, authors, publicationTitles } =
    await getSuggestions(
      suggestionsSince.toDate(),
      COUNTRY_CODE_OPTION.countries_to_notify,
      "score",
      null,
      null,
      false
    );

  const usersById = (await prisma.user.findMany()).reduce(
    (acc, user) => ({ ...acc, [user.id]: user }),
    {} as { [key: number]: user }
  );

  const allSuggestedIssues = [
    ...new Set(
      Object.values(suggestionsPerUser).reduce(
        (acc, suggestion) => [
          ...acc,
          ...Object.values(suggestion.issues).map((issue) => issue.issuecode),
        ],
        [] as string[]
      )
    ),
  ];

  const alreadySentNotificationsPerUser = (
    await prisma.userSuggestionNotification.findMany({
      where: {
        issuecode: {
          in: allSuggestedIssues,
        },
      },
    })
  ).reduce(
    (acc, notification) => ({
      [notification.userId]: [
        ...new Set(...(acc[notification.userId] || []), notification.issuecode),
      ],
    }),
    {} as { [key: number]: string[] }
  );

  for (const [userId, suggestionsForUser] of Object.entries(
    suggestionsPerUser
  )) {
    const userIdNumber = parseInt(userId);
    const pendingNotificationsForUser = Object.values(
      suggestionsForUser.issues
    ).filter(
      (suggestion) =>
        !alreadySentNotificationsPerUser[userIdNumber] ||
        !alreadySentNotificationsPerUser[userIdNumber].includes(
          suggestion.issuecode
        )
    );

    console.log(
      `${pendingNotificationsForUser.length} new issue(s) will be suggested to user ${userId}`
    );
    console.log(
      `${
        Object.values(suggestionsForUser.issues).length -
        pendingNotificationsForUser.length
      } issue(s) have already been suggested to user ${userId}`
    );

    for (const suggestedIssue of pendingNotificationsForUser) {
      const issueTitle = `${
        publicationTitles[suggestedIssue.publicationcode]
      } ${suggestedIssue.issuenumber}`;

      const storyCountPerAuthor = Object.keys(suggestedIssue.stories).reduce(
        (acc, personcode) => ({
          ...acc,
          [authors[personcode]]: suggestedIssue.stories[personcode].length,
        }),
        {}
      );
      try {
        await sendSuggestedIssueNotification(
          suggestedIssue.issuecode,
          issueTitle,
          storyCountPerAuthor,
          usersById[userIdNumber]
        );
        notificationsSent++;
      } catch (e) {
        console.log(e);
      }
    }
  }
  console.log(`${notificationsSent} notification(s) sent.`);
  res.writeHead(200);
  res.end(`${notificationsSent} notification(s) sent.`);
};
