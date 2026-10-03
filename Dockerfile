FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock ./
RUN HUSKY=0 yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json yarn.lock ./
RUN HUSKY=0 yarn install --frozen-lockfile --production --ignore-scripts && yarn cache clean
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
