FROM node:20.20.2-alpine AS dev
WORKDIR /app
RUN corepack enable && chown node:node /app
COPY --chown=node:node package.json yarn.lock ./
USER node
RUN yarn install --frozen-lockfile
COPY --chown=node:node . .
CMD ["yarn", "dev"]

FROM dev AS build
RUN yarn build

FROM node:20.20.2-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable
COPY --chown=node:node package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production --ignore-scripts
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
