FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src/ ./src/
COPY migrations/ ./migrations/
ENV NODE_ENV=production
ENV PORT=3030
EXPOSE 3030
CMD ["node", "src/index.js"]
