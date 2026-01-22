FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json knexfile.cjs ./
COPY src ./src
COPY migrations ./migrations
COPY seeds ./seeds

RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start"]


