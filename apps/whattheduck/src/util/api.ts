import axios from "axios";
import type {
  CacheRequestConfig} from "axios-cache-interceptor";
import {
  buildWebStorage,
  setupCache,
} from "axios-cache-interceptor";
import dayjs from "dayjs";

import { addUrlParamsRequestInterceptor } from "~/axios-helper";

const customStorage = buildWebStorage(sessionStorage);

const now = dayjs();
const inAnHour = dayjs().add(1, "hour");

let coaCacheExpiration = dayjs();
if (now.get("hour") >= 4) {
  coaCacheExpiration = coaCacheExpiration.add(1, "day");
}
coaCacheExpiration = coaCacheExpiration
  .set("hour", 4)
  .set("minute", 0)
  .set("second", 0)
  .set("millisecond", 0);

const commonCacheOptions = {
  etag: false,
  modifiedSince: false,
  interpretHeader: false,
  generateKey: (options: CacheRequestConfig) =>
    `${options.url}${
      options.params ? `?${new URLSearchParams(options.params).toString()}` : ""
    }`,
  storage: customStorage,
};

const cachedUserApi = addUrlParamsRequestInterceptor(
  setupCache(
    axios.create({
      baseURL: import.meta.env.VITE_DM_API_URL,
    }),
    {
      ...commonCacheOptions,
      ttl: inAnHour.diff(now),
    }
  )
);

const cachedCoaApi = addUrlParamsRequestInterceptor(
  setupCache(
    axios.create({
      baseURL: import.meta.env.VITE_DM_API_URL,
    }),
    {
      ...commonCacheOptions,
      ttl: coaCacheExpiration.diff(now),
    }
  )
);

export { cachedCoaApi, cachedUserApi };
