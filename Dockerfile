FROM node:20.9.0-bullseye as base

RUN \
  install -o node -g node -d /workspace/ && \
  install -o node -g node -d /workspace/node_modules/

USER node
WORKDIR /workspace

# --------------------------------------------------------------------------------

FROM base as builder

COPY package.json package-lock.json ./

RUN \
  --mount=type=cache,target=/root/.npm \
  npm ci --omit=dev

# --------------------------------------------------------------------------------

FROM node:20.9.0-alpine as production

COPY --chown=node:node --from=builder /workspace /magpie
COPY --chown=node:node src /magpie/src
COPY --chown=node:node bin /magpie/bin
COPY --chown=node:node templates /magpie/templates
COPY --chown=node:node tsconfig.json /magpie/tsconfig.json

RUN install -o node -g node -d /local

USER node
WORKDIR /local

RUN npm config set update-notifier false

ENTRYPOINT ["npm", "--prefix", "/magpie", "exec", "--", "tsx", "--tsconfig", "/magpie/tsconfig.json", "/magpie/bin/magpie.mts"]
CMD ["help"]
