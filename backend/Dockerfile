# Build stage: install all deps (incl. devDeps via .npmrc) and compile to dist/.
# docker-compose targets this stage for local dev (it overrides the command to
# run nodemon), so it must keep the full toolchain.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage: production image that Render runs. Prod deps + compiled JS only.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 5000
CMD ["node", "dist/server.js"]
