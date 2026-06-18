# Base image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install
COPY dashboard/package*.json ./dashboard/
RUN npm --prefix dashboard ci

# Bundle app source
COPY . .

# Build bot and dashboard assets
RUN npm run build

# Expose the dashboard port
EXPOSE 3000
ENV PORT=3000

# Start the bot
CMD [ "npm", "start" ]
