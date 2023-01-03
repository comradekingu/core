import express from "express";
import { router } from "express-file-routing";
import * as fs from "fs";

const app = express();
app.use("/", router());

type Route = { path: string | RegExp; methods: { [method: string]: boolean } };
const routes: Route[] = [];
app._router.stack.forEach(
  (middleware: {
    route: Route;
    name: string;
    handle: { stack: [{ route: Route }] };
  }) => {
    if (middleware.route && typeof middleware.route.path === "string") {
      // routes registered directly on the app
      routes.push(middleware.route);
    } else if (middleware.name === "router") {
      // router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route && typeof handler.route.path === "string") {
          routes.push(handler.route);
        }
      });
    }
  }
);

const imports: string[] = [
  'import { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";',
  'import { AxiosCacheInstance } from "axios-cache-interceptor";',
  'import {AxiosTypedRequestBody, AxiosTypedRequestConfig, AxiosTypedResponse} from "~types/Call";',
];

const routeList = {} as { [routePathWithMethod: string]: string };
routes.forEach((route) => {
  imports.push(
    `import type { ${Object.keys(route.methods)
      .filter((method) => ["get", "post", "delete", "put"].includes(method))
      .map((method) => {
        const routePathWithMethod = `${method.toUpperCase()} ${route.path}`;
        const routePath = `${(route.path as string)
          .replaceAll("/:", "__")
          .replaceAll(/[/-]/g, "_")
          .toUpperCase()}`;

        const returnTypeName = `${method.toUpperCase()}${routePath}`;

        routeList[routePathWithMethod] =
          method === "get"
            ? `(axios: AxiosInstance | AxiosCacheInstance, config?: AxiosTypedRequestConfig<${returnTypeName}>): AxiosTypedResponse<${returnTypeName}> => axios.${method}<${returnTypeName}["resBody"]>('${route.path}', config),`
            : method === "delete"
            ? `(axios: AxiosInstance | AxiosCacheInstance, config?: AxiosRequestConfig): Promise<AxiosResponse<${returnTypeName}>> => axios.${method}<${returnTypeName}>('${route.path}', config),`
            : `(axios: AxiosInstance | AxiosCacheInstance, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<${returnTypeName}>> => axios.${method}<${returnTypeName}>('${route.path}', data, config),`;

        return `${
          method === "get" ? `${method}Call` : `${method}Type`
        } as ${returnTypeName}`;
      })
      .join(",")} } from "~routes${route.path}";`
  );
});
fs.writeFileSync(
  "../types/routes.ts",
  [
    imports.join("\n"),
    `export default {\n${Object.entries(routeList).reduce(
      (acc, [routePathWithMethod, callback]) =>
        acc + `["${routePathWithMethod}"]: ${callback}`,
      ""
    )}\n}`,
  ].join("\n")
);
