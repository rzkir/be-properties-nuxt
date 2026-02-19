FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./

RUN npm install

COPY src ./src
COPY types ./types

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3003

CMD ["node", "dist/index.js"]
