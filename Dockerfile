FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY public ./public
COPY scripts ./scripts

RUN mkdir -p data

EXPOSE 3000

CMD ["node", "server.js"]
