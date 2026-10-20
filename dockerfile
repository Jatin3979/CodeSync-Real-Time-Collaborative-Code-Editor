FROM node:20-alpine as frontend-builder
COPY ./frontend /app
WORKDIR /app

RUN npm install && npm run build

# Build the backend
FROM node:20-alpine as backend-builder
COPY ./backend /app
WORKDIR /app
RUN npm install

COPY --from=frontend-builder /app/dist /app/public

EXPOSE 3000
CMD ["node", "index.js"]