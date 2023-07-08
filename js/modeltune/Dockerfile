# Install dependencies only when needed
FROM node:lts-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /js

COPY .yarn ./.yarn
COPY .pnp.cjs .yarnrc.yml package.json yarn.lock* ./
RUN yarn install

FROM node:lts-alpine AS runner
WORKDIR /js

COPY --from=deps /js/.yarn ./.yarn
COPY --from=deps /js/.pnp.cjs ./pnp.cjs
COPY . .

RUN yarn add @next/swc-linux-x64-gnu

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

WORKDIR /js/modeltune

EXPOSE 3000

ENV PORT 3000

WORKDIR /js/modeltune
CMD ["yarn","dev"]