FROM node:26.10.0-alpine AS dev
WORKDIR /app
RUN npm install --global corepack@0.36.0 && corepack enable && chown node:node /app
COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./
USER node
RUN yarn install --immutable
COPY --chown=node:node . .
CMD ["yarn", "dev"]

FROM dev AS build
RUN yarn build

FROM node:26.10.0-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
RUN npm install --global corepack@0.36.0 && corepack enable
COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./
RUN YARN_ENABLE_SCRIPTS=false yarn workspaces focus --all --production
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
