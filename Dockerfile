FROM node:16 AS app-build
MAINTAINER Bruno Perel

RUN npm i -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm i

COPY . .
RUN pnpm run build

FROM node:16 as api-build
MAINTAINER Bruno Perel

RUN npm i -g pnpm

WORKDIR /app

COPY ./api/package.json ./api/pnpm-lock.yaml ./
RUN pnpm i

COPY ./api/prisma ./prisma
RUN pnpm run prisma:generate

COPY api .
RUN pnpm run build


FROM nginx AS app
MAINTAINER Bruno Perel

COPY --from=app-build /app/dist /usr/share/nginx/html

FROM node:16 AS api
MAINTAINER Bruno Perel

COPY --from=api-build /app/dist /app

EXPOSE 3000

CMD ["node", "dist/index.js"]
