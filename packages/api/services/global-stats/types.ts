import { BookcaseContributor } from "~dm-types/BookcaseContributor";
import { MedalPointsPerUser } from "~dm-types/MedalPointsPerUser";
import { QuickStatsPerUser } from "~dm-types/QuickStatsPerUser";
import { user } from "~prisma-clients/client_dm";
import { Errorable } from "~socket.io-services/types";

export default abstract class {
  static namespaceEndpoint = "/global-stats";

  abstract getBookcaseContributors: (
    callback: (value: BookcaseContributor[]) => void
  ) => void;
  abstract getUserList: (
    callback: (value: Pick<user, "id" | "username">[]) => void
  ) => void;
  abstract getUserCount: (callback: (count: number) => void) => void;
  abstract getUsersPointsAndStats: (
    userIds: number[],
    callback: (value: Errorable<{
      points: MedalPointsPerUser;
      stats: QuickStatsPerUser;
    }, 'Bad request'>) => void
  ) => void;
  abstract getUsersCollectionRarity: (
    callback: (value: {
      userScores: { userId: number; averageRarity: number }[];
      myScore: number;
    }) => void
  ) => void;
}
