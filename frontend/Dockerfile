# Local dev image only (docker-compose). Production is built and served by
# Vercel, which ignores this Dockerfile.
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
