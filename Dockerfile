# Stage 1: Build the React frontend
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build the backend + copy in the built frontend
FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Copy the compiled React build from stage 1
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 5000

CMD ["node", "server/server.js"]