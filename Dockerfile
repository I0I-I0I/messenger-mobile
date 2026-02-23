FROM node:20-bookworm-slim

WORKDIR /app

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 8081

CMD ["sh", "-c", "EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --host lan"]
