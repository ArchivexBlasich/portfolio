# Stage 1: Base image
FROM node:lts-alpine AS base
WORKDIR /app

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Build the application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 4: Production runner with Nginx
FROM nginx:1.25-alpine AS runner

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
