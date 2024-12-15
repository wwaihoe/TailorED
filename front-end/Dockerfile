FROM node:22-alpine
WORKDIR /app

COPY ./package.json ./
RUN npm install
COPY ./ .
RUN npm run build
ENV NODE_ENV=production
CMD ["npm", “run” ,"start"]