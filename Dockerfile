FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/scanner/package.json apps/scanner/
COPY apps/dashboard/package.json apps/dashboard/

RUN pnpm install --frozen-lockfile

COPY . .

# --- API ---
FROM base AS api

WORKDIR /app/apps/api

RUN npx nest build

EXPOSE 3000

CMD ["node", "dist/main"]

# --- Scanner ---
FROM base AS scanner

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
    && curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

WORKDIR /app/apps/scanner

RUN npx tsc

EXPOSE 3001

CMD ["node", "dist/main.js"]

# --- Dashboard ---
FROM base AS dashboard-build

RUN pnpm nx build dashboard

FROM nginx:alpine AS dashboard

COPY --from=dashboard-build /app/apps/dashboard/dist /usr/share/nginx/html
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
