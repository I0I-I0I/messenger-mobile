# Messenger (Expo + React Native)

`messenger` — мобильный клиент мессенджера на Expo/React Native с архитектурой **офлайн-первым**.

## О проекте

Приложение построено так, чтобы стабильно работать при нестабильной сети:
- Интерфейс читает данные только из локальной SQLite.
- Все отправки проходят через локальный outbox.
- REST и `/v1/sync/changes` остаются основой корректности данных.
- WebSocket используется для ускорения доставки событий, но не как единственный механизм синхронизации.

В текущем состоянии репозиторий содержит рабочий клиент и архитектурные документы для backend и realtime-интеграции.

## Технологии

- Expo + React Native + `expo-router`
- TypeScript
- SQLite (`expo-sqlite`)
- Zustand
- AsyncStorage
- Jest

## Ключевые архитектурные правила

- Источник данных для интерфейса: только SQLite.
- Сетевой слой не записывает данные напрямую в React state как в источник истины.
- Для долговечных операций основа — REST.
- Для восстановления после разрывов обязателен catch-up через `/v1/sync/changes`.
- Для сообщений соблюдаются:
  - идемпотентность отправки по `(sender_id, client_message_id)`
  - порядок внутри диалога по серверному `seq`

## Статус realtime/WebSocket

Согласно архитектурным документам проекта:
- На backend предусмотрен endpoint `WS /v1/ws`.
- Базовые команды клиента: `subscribe`, `unsubscribe`, `ping`.
- События v1: `message.created`, `conversation.updated`.
- Доставка через WS выполняется без строгой гарантии; итоговая корректность обеспечивается через REST + sync.
- Для надежной публикации серверных событий используется transactional outbox (`realtime_outbox_events`).

## Структура репозитория

- `src/app` — экраны и роутинг Expo Router.
- `src/db` — инициализация SQLite, схема и миграции.
- `src/db/queries` — SQL-запросы по таблицам.
- `src/repository` — слой доступа к данным и согласованные операции в БД.
- `src/usecases` — прикладные сценарии (auth/chats/messages/users/realtime).
- `src/sync` — outbox, синхронизация и логика reconnect/realtime.
- `src/transport/rest` — REST-клиенты и типы.
- `src/transport/ws` — WS-клиент, протокол и тесты.
- `src/state` — клиентские zustand-store.
- `src/domain` — доменные типы, id, валидация.

## Модель данных (клиент)

Основные таблицы SQLite:
- `users`
- `conversations`
- `messages`
- `outbox`

Для realtime и сверки сообщений используются поля и ограничения уровня БД:
- `client_message_id`, `server_id`, `server_seq`, `server_created_at`
- уникальность `server_id`
- уникальность `(conversation_id, server_seq)`

## Поток отправки сообщения

1. Локально создается pending-сообщение.
2. В outbox добавляется задача отправки.
3. Outbox отправляет запрос в REST.
4. При подтверждении или realtime-событии сообщение сверяется и переводится в итоговый статус.
5. При проблемах сети применяются повторные попытки, после reconnect выполняется catch-up через sync.

## Запуск проекта

### Требования

- Node.js 18+
- pnpm
- Expo CLI (через `pnpx` или `pnpm`)

### Установка

```bash
pnpm install
```

### Разработка

```bash
pnpm start
```

Дополнительно:

```bash
pnpm android
pnpm ios
pnpm web
```

## Тесты и качество

```bash
pnpm test
pnpm test:watch
pnpm test:ci
pnpm lint
```

## Полезные документы в репозитории

- `docs/backend_architecture.md` — архитектура backend (FastAPI + outbox + WS).
- `docs/architecture_websockets.md` — общая архитектура realtime между backend и клиентом.
- `docs/client_websocket_architecture.md` — реализация WS на клиенте.
- `docs/additional_info.md` — краткая сводка по текущему состоянию проекта.
- `docs/deploy.md` — заметки по развертыванию.

## Примечания

- Проект спроектирован с приоритетом устойчивости данных и повторяемой синхронизации.
- Даже при недоступности WebSocket приложение должно оставаться работоспособным за счет outbox и REST sync.
