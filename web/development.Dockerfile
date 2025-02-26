FROM node:20.10.0-alpine3.19

WORKDIR /usr/src/web

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "start", "--", "--host", "0.0.0.0"]
