FROM node:22-alpine as production

EXPOSE 3000
EXPOSE 24678

WORKDIR /app/remix-app

# Install dependencies
COPY ./remix-app/package.json ./
COPY ./remix-app/package-lock.json ./
RUN npm install

# Copy source code
COPY ./remix-app ./

# Build the Remix app
RUN npm run build

# Command to start the app
CMD ["npm", "start"]


FROM node:22-alpine as development

EXPOSE 3000

# Set working directory
WORKDIR /app/remix-app

# Install dependencies
COPY ./remix-app/package.json ./
COPY ./remix-app/package-lock.json ./
RUN npm install

# Install additional dev dependencies for hot reloading
RUN npm install nodemon ts-node

# Expose Remix's default port
EXPOSE 3000
EXPOSE 24678

# Command to start the app in development mode
CMD ["npm", "run", "start:dev"]


