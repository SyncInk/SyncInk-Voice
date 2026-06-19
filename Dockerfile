# Base image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install bot dependencies
COPY package*.json ./
RUN npm install

# Install dashboard dependencies
COPY dashboard/package*.json ./dashboard/
RUN npm --prefix dashboard install

# Copy all source files
COPY . .

# Build bot (tsc) and dashboard (vite build)
RUN npm run build
RUN npm --prefix dashboard run build

# Expose port
EXPOSE 3000
ENV PORT=3000

# Start the bot (which also serves dashboard/dist as static files)
CMD [ "npm", "start" ]
