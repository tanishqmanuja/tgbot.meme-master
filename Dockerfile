FROM oven/bun:alpine AS base
WORKDIR /usr/src/app

# INSTALL
FROM base AS install
COPY package.json bun.lock /usr/src/app/
RUN bun install --frozen-lockfile --production

# BUILD
FROM base AS build
ENV NODE_ENV=production
COPY --from=install /usr/src/app/node_modules node_modules
COPY . .
RUN bun run build

# RELEASE
FROM base AS release
COPY --from=build /usr/src/app/dist/index.js .

# RUN
USER bun
ENTRYPOINT [ "bun", "run", "index.js" ]

