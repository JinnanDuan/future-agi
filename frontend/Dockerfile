# Dockerfile

# Stage 1: Build the React app
FROM node:20.17 AS build

# Build args forwarded from docker-compose. Vite reads env vars prefixed
# VITE_ at build time and bakes them into the bundle.
ARG VITE_HOST_API=http://localhost:8000
ARG VITE_ENVIRONMENT=production
ENV VITE_HOST_API=${VITE_HOST_API} \
    VITE_ENVIRONMENT=${VITE_ENVIRONMENT}

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . ./
RUN yarn build

# Stage 2: Serve the React app with Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
