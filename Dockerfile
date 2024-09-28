FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

COPY . .

RUN npm ci && npm run build

ENV NODE_ENV=production

CMD ["node", "server.js"]
