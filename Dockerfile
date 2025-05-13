FROM node:18.20.2-alpine

WORKDIR /app

# Copy both package.json and package-lock.json if present
COPY package*.json ./

# Use npm ci if lock file exists, fallback to npm install
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]