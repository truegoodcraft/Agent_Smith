# Agent Smith — Ollama Discord Bot Bridge

Connect a local or remote [Ollama](https://ollama.com/) instance to a Discord bot so you can chat with your LLMs from anywhere.

---

## Features

| Feature | Details |
|---|---|
| **Multi-turn context** | Per-channel conversation history (configurable depth) |
| **Streaming responses** | Live "typing" effect as the model generates tokens |
| **Slash commands** | `/ask`, `/reset`, `/model`, `/models` |
| **Permission control** | Allow-list specific channels and/or users |
| **Rate limiting** | Configurable per-user request cap |
| **Docker Compose** | One command to run Ollama + bot together |

---

## Prerequisites

- Python 3.11+ **or** Docker & Docker Compose
- A [Discord application & bot token](https://discord.com/developers/applications)
- An [Ollama](https://ollama.com/) server with at least one model pulled

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/truegoodcraft/Agent_Smith.git
cd Agent_Smith
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your favourite editor and fill in:
#   DISCORD_TOKEN — your bot token
#   OLLAMA_MODEL  — e.g. llama3, mistral, phi3
```

### 3. Run with Python

```bash
pip install -r requirements.txt
python main.py
```

### 4. Run with Docker Compose (Ollama included)

```bash
# Start Ollama + bot in the background
docker compose up -d

# Pull a model into the running Ollama container
docker compose exec ollama ollama pull llama3

# View bot logs
docker compose logs -f bot
```

---

## Discord Developer Portal Setup

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) and create a new application.
2. Under **Bot**, create a bot user and copy the token into `DISCORD_TOKEN`.
3. Under **Bot → Privileged Gateway Intents**, enable **Message Content Intent**.
4. Under **OAuth2 → URL Generator**, select:
   - Scope: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Message History`, `Use Slash Commands`
5. Use the generated URL to invite the bot to your server.

---

## Configuration Reference

All settings live in `.env` (copy from `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `DISCORD_TOKEN` | *(required)* | Discord bot token |
| `COMMAND_PREFIX` | `!` | Prefix for legacy text commands |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3` | Default model name |
| `OLLAMA_TIMEOUT` | `120` | Request timeout (seconds) |
| `ALLOWED_CHANNEL_IDS` | *(empty = all)* | Comma-separated channel IDs |
| `ALLOWED_USER_IDS` | *(empty = all)* | Comma-separated user IDs |
| `RATE_LIMIT_REQUESTS` | `5` | Max requests per user per window |
| `RATE_LIMIT_WINDOW` | `60` | Rate limit window (seconds) |
| `MAX_CONTEXT_PAIRS` | `10` | Message pairs to keep in context |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

---

## Slash Commands

| Command | Description |
|---|---|
| `/ask <prompt>` | One-shot question (doesn't affect channel context) |
| `/reset` | Clear conversation history for the current channel |
| `/model [name]` | View or change the active model for this channel |
| `/models` | List all models available on the Ollama server |

---

## Project Structure

```
Agent_Smith/
├── main.py               # Entry point
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
│
├── config/
│   ├── __init__.py
│   └── settings.py       # Load & expose all env-var config
│
├── ollama/
│   ├── __init__.py
│   └── client.py         # Async Ollama API wrapper (streaming)
│
├── bot/
│   ├── __init__.py
│   ├── client.py         # Assemble the Discord bot
│   ├── events.py         # on_message handler + context management
│   ├── commands.py       # Slash commands
│   └── permissions.py    # Channel/user allow-list checks
│
└── utils/
    ├── __init__.py
    ├── logger.py          # Structured logging
    ├── formatting.py      # Discord message splitting/truncation
    └── rate_limiter.py    # Per-user sliding-window rate limiter
```

---

## Security Notes

- **Never commit your `.env` file** — it contains your Discord token. It is already listed in `.gitignore`.
- `ALLOWED_CHANNEL_IDS` and `ALLOWED_USER_IDS` give you fine-grained control over who can interact with the bot.
- The Ollama API endpoint is not exposed publicly when running via Docker Compose (only the bot container can reach it).

---

## License

MIT
