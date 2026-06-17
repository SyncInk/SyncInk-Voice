# Base image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the dashboard port
EXPOSE 3000
ENV PORT=3000

# Start the bot
CMD [ "npm", "start" ]
