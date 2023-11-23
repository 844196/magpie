FROM node:20.9.0-bullseye as base

FROM base as workspace

RUN \
  install -o node -g node -d /workspace/ && \
  install -o node -g node -d /workspace/node_modules/

RUN sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin v3.31.0

USER node
WORKDIR /workspace

# --------------------------------------------------------------------------------

FROM base as builder

WORKDIR /workspace

COPY package.json package-lock.json ./

RUN \
  --mount=type=cache,target=/root/.npm \
  npm ci

COPY tsconfig.json ./tsconfig.json
COPY src ./src
COPY bin ./bin

RUN npx tsc

RUN \
  --mount=type=cache,target=/root/.npm \
  npm ci --omit=dev

# --------------------------------------------------------------------------------

FROM node:20.9.0-alpine as production

COPY --chown=node:node --from=builder /workspace/dist /magpie
COPY --chown=node:node --from=builder /workspace/node_modules /magpie/node_modules
COPY --chown=node:node templates /magpie/templates

USER node
WORKDIR /local

ENV NODE_ENV=production
ENTRYPOINT ["node", "/magpie/bin/magpie.mjs"]
CMD ["help"]
