import { PrismaClient } from "~prisma_clients/client_dm";
import { ExpressCall } from "~routes/_express-call";
import { AbstractEvent, AbstractEventRaw } from "~types/events/AbstractEvent";
import { BookstoreCommentEvent } from "~types/events/BookstoreCommentEvent";
import {
  CollectionSubscriptionAdditionEvent,
  CollectionSubscriptionAdditionEventRaw,
} from "~types/events/CollectionSubscriptionAdditionEvent";
import {
  CollectionUpdateEvent,
  CollectionUpdateEventRaw,
} from "~types/events/CollectionUpdateEvent";
import {
  EdgeCreationEvent,
  EdgeCreationEventRaw,
} from "~types/events/EdgeCreationEvent";
import { Event } from "~types/events/Event";
import { MedalEvent } from "~types/events/MedalEvent";
import { SignupEvent } from "~types/events/SignupEvent";

const prisma = new PrismaClient();

export const get = async (...[, res]: ExpressCall<Event[]>) =>
  res.json(await getEvents());

const getEvents = async (): Promise<Event[]> => [
  ...(await retrieveSignups()),
  ...(await retrieveCollectionUpdates()),
  ...(await retrieveCollectionSubscriptionAdditions()),
  ...(await retrieveBookstoreCreations()),
  ...(await retrieveEdgeCreations()),
  ...(await retrieveNewMedals()),
];

const MEDAL_LEVELS = {
  edge_photographer: { 1: 50, 2: 150, 3: 600 },
  edge_designer: { 1: 20, 2: 70, 3: 150 },
  duckhunter: { 1: 1, 2: 3, 3: 5 },
};

const mapUsers = <T extends AbstractEvent>(event: AbstractEventRaw): T =>
  ({
    ...event,
    users:
      event.users?.split(",")?.map((userId) => parseInt(userId)) ||
      (event.userId && [event.userId]) ||
      [],
  } as T);

const retrieveSignups = async (): Promise<SignupEvent[]> =>
  (
    (await prisma.$queryRaw`
        SELECT 'signup' as type, users.ID as userId, UNIX_TIMESTAMP(DateInscription) AS timestamp
        FROM dm.users
        WHERE EXISTS(
                SELECT 1 FROM dm.numeros WHERE users.ID = numeros.ID_Utilisateur
            )
          AND DateInscription > date_add(now(), interval -1 month)
          AND users.username NOT LIKE 'test%'
    `) as AbstractEventRaw[]
  ).map(mapUsers<SignupEvent>);

const retrieveCollectionUpdates = async (): Promise<CollectionUpdateEvent[]> =>
  (
    (await prisma.$queryRaw`
        SELECT 'collection_update'       as type,
               users.ID                  AS userId,
               UNIX_TIMESTAMP(DateAjout) AS timestamp,
               COUNT(Numero)             AS numberOfIssues,
               (SELECT CONCAT(Pays, '/', Magazine, '/', Numero)
                FROM dm.numeros n
                WHERE n.ID = numeros.ID
                LIMIT 1)                 AS exampleIssue
        FROM dm.numeros
                 INNER JOIN dm.users ON numeros.ID_Utilisateur = users.ID
        WHERE DateAjout > DATE_ADD(NOW(), INTERVAL -1 MONTH)
          AND users.username <> 'demo'
          AND users.username NOT LIKE 'test%'
          AND numeros.Abonnement = 0
        GROUP BY users.ID, DATE(DateAjout)
        HAVING COUNT(Numero) > 0
    `) as CollectionUpdateEventRaw[]
  ).map((event) => {
    const [publicationcode, issuenumber] =
      event.exampleIssue.split(/\/(?=[^/]+$)/);
    return {
      ...mapUsers<CollectionUpdateEvent>(event),
      numberOfIssues: event.numberOfIssues,
      publicationcode: publicationcode || "",
      issuenumber: issuenumber || "",
    } as CollectionUpdateEvent;
  });

const retrieveCollectionSubscriptionAdditions = async (): Promise<
  CollectionSubscriptionAdditionEvent[]
> =>
  (
    (await prisma.$queryRaw`
        SELECT 'subscription_additions'                    as type,
               CONCAT(numeros.Pays, '/', numeros.Magazine) AS publicationcode,
               numeros.Numero                              AS issuenumber,
               GROUP_CONCAT(numeros.ID_Utilisateur)        AS users,
               UNIX_TIMESTAMP(DateAjout)                   AS timestamp
        FROM dm.numeros
        WHERE DateAjout > DATE_ADD(NOW(), INTERVAL -1 MONTH)
          AND numeros.Abonnement = 1
        GROUP BY DATE(DateAjout), numeros.Pays, numeros.Magazine, numeros.Numero
    `) as CollectionSubscriptionAdditionEventRaw[]
  ).map(mapUsers<CollectionSubscriptionAdditionEvent>);

const retrieveBookstoreCreations = async (): Promise<BookstoreCommentEvent[]> =>
  (
    (await prisma.$queryRaw`
        SELECT 'bookstore_comment'                                 as type,
               uc.ID_user                                          AS userId,
               bouquineries.Nom                                    AS name,
               UNIX_TIMESTAMP(bouquineries_commentaires.DateAjout) AS timestamp
        FROM dm.bouquineries_commentaires
                 INNER JOIN dm.bouquineries ON bouquineries_commentaires.ID_Bouquinerie = bouquineries.ID
                 INNER JOIN dm.users_contributions uc ON bouquineries_commentaires.ID = uc.ID_bookstore_comment
        WHERE bouquineries_commentaires.Actif = 1
          AND bouquineries_commentaires.DateAjout > date_add(now(), interval -1 month)
    `) as AbstractEventRaw[]
  ).map(mapUsers<BookstoreCommentEvent>);

const retrieveEdgeCreations = async (): Promise<EdgeCreationEvent[]> =>
  (
    (await prisma.$queryRaw`
        select 'edge'                       as type,
               CONCAT('[', GROUP_CONCAT(json_object(
                       'publicationcode',
                       publicationcode,
                       'issuenumber',
                       issuenumber
                   )), ']')                 AS edges,
               UNIX_TIMESTAMP(creationDate) AS timestamp,
               users
        from (SELECT tp.publicationcode,
                     tp.issuenumber,
                     tp.dateajout                       AS creationDate,
                     GROUP_CONCAT(DISTINCT tpc.ID_user) AS users
              FROM dm.tranches_pretes tp
                       INNER JOIN dm.users_contributions tpc ON tpc.ID_tranche = tp.ID
              WHERE tp.dateajout > DATE_ADD(NOW(), INTERVAL -1 MONTH)
                AND NOT (tp.publicationcode = 'fr/JM' AND tp.issuenumber REGEXP '^[0-9]+$')
                AND NOT (tp.publicationcode = 'be/MMN')
                AND NOT (tp.publicationcode = 'it/TL')
              GROUP BY tp.ID) as edges_and_collaborators
        group by DATE_FORMAT(creationDate, '%Y-%m-%d %H:00:00'), edges_and_collaborators.users
    `) as EdgeCreationEventRaw[]
  ).map((event) => ({
    ...mapUsers<EdgeCreationEvent>(event),
    edges: JSON.parse(event.edges),
  }));

const retrieveNewMedals = async (): Promise<MedalEvent[]> =>
  (
    (await prisma.$queryRawUnsafe(
      Object.entries(MEDAL_LEVELS)
        .map(([medalType, levels]) =>
          Object.values(levels)
            .map(
              (level: number) => `
              select 'medal'                   as type,
                     ID_User                   AS userId,
                     contribution,
                     ${level}                 as level,
                     UNIX_TIMESTAMP(date) - 60 AS timestamp
              from dm.users_contributions
              where contribution = '${medalType.toLowerCase()}'
                and points_total >= ${level}
                and points_total - points_new < ${level}
                and date > DATE_ADD(NOW(), INTERVAL -1 MONTH)`
            )
            .join(" UNION ")
        )
        .join(" UNION ")
    )) as AbstractEventRaw[]
  ).map(mapUsers<MedalEvent>);
