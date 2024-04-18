FROM node:18.17.0-alpine3.17

RUN mkdir /home/node/app && chown -R node:node /home/node/app
RUN mkdir /home/node/web && chown -R node:node /home/node/web

COPY --chown=node:node src/web/package*.json /home/node/web/
COPY --chown=node:node src/api/package*.json /home/node/app/

WORKDIR /home/node/app
RUN npm install && npm cache clean --force --loglevel=error
COPY --chown=node:node src/api/.env* ./

WORKDIR /home/node/web
RUN npm install && npm cache clean --force --loglevel=error

COPY --chown=node:node src/api /home/node/app/
COPY --chown=node:node src/web /home/node/web/

USER node

ENV NODE_ENV=production
ENV NODE_TLS_REJECT_UNAUTHORIZED=0
ENV NODE_OPTIONS=--openssl-legacy-provider

RUN npm run build:docker

EXPOSE 3000

WORKDIR /home/node/app

RUN npm run build:api
CMD [ "node", "./dist/index.js" ]