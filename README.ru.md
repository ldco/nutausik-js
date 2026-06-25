[English](README.md) | **Русский**

# NUTAUSIK

**Node Unified Task Agent Unified Supervision, Inspection & Knowledge — порт на TypeScript.**

Фреймворк контроля качества для AI-агентов, портированный с Python на TypeScript. Принуждает к дисциплине: нельзя писать код без задачи, нельзя закрыть задачу без проверки. Жёсткие шлюзы, которые агент физически не может обойти — не рекомендации.

[![v0.1.0](https://img.shields.io/badge/version-v0.1.0-blue.svg)]()
[![467 tests](https://img.shields.io/badge/tests-467-brightgreen.svg)]()
[![coverage 77%](https://img.shields.io/badge/coverage-77%25-green.svg)]()
[![ed25519](https://img.shields.io/badge/signed%20receipts-ed25519-6f42c1.svg)]()
[![Node 22+](https://img.shields.io/badge/node-22%2B-339933.svg)](https://nodejs.org)
[![Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

---

## Быстрый старт

```bash
npx @nocowboy/nutausik init --name my-project
npx nutausik session start
npx nutausik task add my-task "Моя задача" --goal "Сделать X" --acceptance "X работает"
npx nutausik task start my-task
# ... работа над задачей ...
npx nutausik verify --task my-task
npx nutausik task done my-task --ac-verified
```

## Архитектура

```
Инженер → AI-агент → { CLI | MCP (123 инструмента) }
                       ↓
                  Service Layer   ← бизнес-логика, QG-0, QG-2
                       ↓
                  Backend Layer   ← better-sqlite3 CRUD, FTS5, графы, метрики
                       ↓
                  SQLite (WAL)    ← .nutausik/nutausik.db (27 таблиц)
```

## Ключевые возможности

| Возможность | Статус |
|-------------|--------|
| Жизненный цикл задач (add/start/done/block/claim) | ✅ |
| QG-0: цель + критерии приёмки обязательны | ✅ |
| QG-2: верификация обязательна перед закрытием | ✅ |
| ed25519 подписанные receipt'ы | ✅ |
| Сессии | ✅ |
| Эпики / Истории | ✅ |
| Память проекта (FTS5 поиск) | ✅ |
| MCP сервер (123 инструмента) | ✅ |
| CLI (~50 команд) | ✅ |
| Хуки (17 штук: task-gate, bash-firewall, secret-scan, ...) | ✅ |
| Маршрутизация моделей | ✅ |
| Оценка рисков (L3 review) | ✅ |

## Статистика

| Метрика | Значение |
|---------|----------|
| Тестов | 480 |
| Покрытие | 77% |
| Исходников | 86 TypeScript (~16K строк) |
| MCP инструментов | 123 |
| CLI команд | ~50 |
| Хуков | 17 |
| Определений стеков | 25 |
| Версия БД | v37 (SQLite WAL) |

## Документация

- [Quick Start (EN)](docs/en/quickstart.md)
- [CLI Reference (EN)](docs/en/cli.md)
- [MCP Tools (EN)](docs/en/mcp.md)
- [Roadmap](docs/plans/nutausik-js-roadmap.md)

## Лицензия

Apache 2.0
