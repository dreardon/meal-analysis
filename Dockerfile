# Build Stage
FROM node:20-slim AS build
WORKDIR /app
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ARG VITE_FIREBASE_CONFIG
ENV VITE_FIREBASE_CONFIG=$VITE_FIREBASE_CONFIG
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage: Node API + Static Files
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev  
COPY server.js ./
COPY --from=build /app/dist ./dist

# EXPOSE port
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
