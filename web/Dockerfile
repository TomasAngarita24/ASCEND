# Multi-stage: build the Vite PWA, then serve it from a slim nginx image.
# VITE_API_BASE_URL is empty by default so the bundle calls the API
# same-origin, with nginx proxying the API route prefixes to the backend.

FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80