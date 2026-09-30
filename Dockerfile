# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /usr/src/app
ENV HUSKY=0
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["yarn", "start:dev"]

FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN yarn build \
  && yarn install --frozen-lockfile --production \
  && yarn cache clean

FROM node:20-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV HUSKY=0
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
