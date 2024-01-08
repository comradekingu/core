import { CacheOptions } from "axios-cache-interceptor";
import dayjs from "dayjs";
import { io, Socket } from "socket.io-client";
import { AllButLast } from "socket.io-client/build/esm/socket";

import AuthServices from "~services/auth/types";
import BookcaseServices from "~services/bookcase/types";
import BookstoreServices from "~services/bookstores/types";
import CoaServices from "~services/coa/types";
import SubscriptionServices from "~services/collection/types";
import CollectionServices from "~services/collection/types";
import DemoServices from "~services/demo/types";
import EdgeCreatorServices from "~services/edgecreator/types";
import EdgesServices from "~services/edges/types";
import EventsServices from "~services/events/types";
import GlobalStatsServices from "~services/global-stats/types";
import LoginServices from "~services/login/types";
import PresentationTextServices from "~services/presentation-text/types";
import PublicCollectionServices from "~services/public-collection/types";
import StatsServices from "~services/stats/types";
import { EventReturnTypeIncludingError } from "~services/types";
type SocketCacheOptions = Pick<CacheOptions, "ttl"> & { cached: boolean };

interface EventsMap {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [event: string]: any;
}

type StringKeyOf<T> = keyof T & string;

type EventCalls<S extends EventsMap> = {
  [EventName in StringKeyOf<S>]: (
    ...args: AllButLast<Parameters<S[EventName]>>
  ) => Promise<EventReturnTypeIncludingError<S[EventName]>>;
};

export const getTokenFn = ref((): Promise<string | undefined> => {
  throw new Error("getTokenFn must be defined");
});

export const clearSessionFn = ref((): Promise<void> => {
  throw new Error("clearSessionFn must be defined");
});

export const cacheStorage = ref(
  undefined as CacheOptions["storage"] | undefined,
);

const useSocket = <Services extends EventsMap>(
  namespaceName: string,
  cacheOptions?: Required<SocketCacheOptions>,
) => {
  const socket = io(import.meta.env.VITE_SOCKET_URL + namespaceName, {
    auth: (cb) => {
      cb({
        token: getTokenFn.value(),
      });
    },
  });

  let storage: CacheOptions["storage"] | undefined;
  if (cacheOptions?.cached) {
    if (!storage) {
      throw new Error("storage must be defined");
    }
  }

  return new Proxy<EventCalls<Services>>({} as EventCalls<Services>, {
    get:
      <EventName extends StringKeyOf<Services>>(_: never, event: EventName) =>
      async (
        ...args: AllButLast<Parameters<Services[EventName]>>
      ): Promise<EventReturnTypeIncludingError<Services[EventName]>> => {
        let data;
        if (cacheOptions) {
          const cacheKey = `${event} ${JSON.stringify(args)}`;
          const cacheData = await storage!.get(cacheKey);
          if (cacheData !== undefined) {
            return cacheData as Awaited<ReturnType<Socket["emitWithAck"]>>;
          }
          data = await socket.emitWithAck(event, ...args);
          storage!.set(cacheKey, data);
        } else {
          data = await socket.emitWithAck(event, ...args);
        }
        return data;
      },
  });
};

const oneHour = () => dayjs().add(1, "hour").diff(dayjs());
const until4am = () => {
  const now = dayjs();
  let coaCacheExpiration = dayjs();
  if (now.get("hour") >= 4) {
    coaCacheExpiration = coaCacheExpiration.add(1, "day");
  }
  return coaCacheExpiration
    .set("hour", 4)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0)
    .diff(now);
};

export const publicCollectionServices = useSocket<PublicCollectionServices>(
  PublicCollectionServices.namespaceEndpoint,
);
export const loginServices = useSocket<LoginServices>(
  LoginServices.namespaceEndpoint,
);

export const bookcaseServices = useSocket<BookcaseServices>(
  BookcaseServices.namespaceEndpoint,
);
export const demoServices = useSocket<DemoServices>(
  DemoServices.namespaceEndpoint,
);
export const statsServices = useSocket<StatsServices>(
  StatsServices.namespaceEndpoint,
);

export const authServices = useSocket<AuthServices>(
  AuthServices.namespaceEndpoint,
);
export const edgeCreatorServices = useSocket<EdgeCreatorServices>(
  EdgeCreatorServices.namespaceEndpoint,
);

export const presentationTextServices = useSocket<PresentationTextServices>(
  PresentationTextServices.namespaceEndpoint,
);
export const edgesServices = useSocket<EdgesServices>(
  EdgesServices.namespaceEndpoint,
);

export const coaServices = useSocket<CoaServices>(
  CoaServices.namespaceEndpoint,
  {
    cached: true,
    ttl: until4am(),
  },
);
export const globalStatsServices = useSocket<GlobalStatsServices>(
  GlobalStatsServices.namespaceEndpoint,
  {
    cached: true,
    ttl: oneHour(),
  },
);
export const eventsServices = useSocket<EventsServices>(
  EventsServices.namespaceEndpoint,
);
export const bookstoreServices = useSocket<BookstoreServices>(
  BookcaseServices.namespaceEndpoint,
);
export const collectionServices = useSocket<CollectionServices>(
  CollectionServices.namespaceEndpoint,
);

export const subscriptionServices = useSocket<SubscriptionServices>(
  SubscriptionServices.namespaceEndpoint,
);
