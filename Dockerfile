FROM node:18-alpine

WORKDIR /app

# Copy both package.json and package-lock.json if present
COPY package*.json ./

# Use npm ci if lock file exists, fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

EXPOSE 3000

CMD ["npm", "start"]