# azan_id_bot

A Telegram bot that delivers daily Islamic prayer (salat) schedules for cities across Indonesia. Users pick their province and city once, and the bot remembers the location per chat (private chats and groups alike) so it can serve the schedule for the right place and timezone.

Prayer time data is bundled with the project and served locally — ported from [renomureza/waktu-sholat](https://github.com/renomureza/waktu-sholat) (sourced from Indonesia's Ministry of Religious Affairs / Kemenag) — so there is no dependency on an external API. Saved locations are stored in MongoDB.

## Bot Commands

| Command | Description |
| --- | --- |
| `/pengaturan` | Set your location — the bot shows an inline keyboard to pick a province, then a city/regency. The choice is saved for the current chat. |
| `/jadwal` | Show today's prayer schedule for the saved location, formatted with the local date (Indonesian locale) and timezone. |
| `/notifikasi` | Choose which prayers to be notified about. Shows an inline keyboard of the five obligatory prayers (Subuh, Dzuhur, Ashar, Maghrib, Isya); tap to toggle each on/off. All off by default. |
| `/tentang` | About the bot and contact info. |

## How It Works

1. `/pengaturan` reads the province list from the bundled dataset and presents it as an inline keyboard; picking a province shows its cities.
2. When a city is chosen, the bot upserts the chat's location (chat id, chat/group name, coordinates, city name) into MongoDB.
3. `/jadwal` looks up the chat's saved coordinates, finds the nearest city in the dataset, resolves the local timezone with [geo-tz](https://github.com/evansiroky/node-geo-tz), reads that city's prayer times from the local data files, and replies with today's schedule.

### Prayer notifications

Chats can opt in to per-prayer azan alerts via `/notifikasi` (all off by default). A per-minute scheduler ([node-cron](https://github.com/node-cron/node-cron)) checks every opted-in chat and, when an enabled prayer time arrives (within a few minutes' grace), pushes a short alert in the chat's own timezone. Sends that already went out today are tracked in MongoDB so a restart never resends, and outbound messages are rate-limited to stay under Telegram's limits. See [docs/prayer-notifications.md](docs/prayer-notifications.md) for the full requirements and design.

Set `MONGO_DEBUG=true` to re-enable verbose Mongoose query logging (off by default so the per-minute scan doesn't flood logs).

## Project Structure

```
index.js                    # Bot entry point: command handlers, callback queries, message formatting
waktu-sholat/index.js       # Local prayer-time lookups (provinces, cities, nearest-city, schedule)
waktu-sholat/geolocation.js # Great-circle distance helper for nearest-city lookup
waktu-sholat/data/          # Bundled dataset: list.json + <province>/<city>/<year>.json (2026–2030)
lib/config.js               # Loads MongoDB settings from environment variables
lib/db.js                   # Mongoose connection setup
model/LocationsModel.js     # Mongoose schema for saved chat locations
service/LocationsService.js # Data-access layer for locations (find, upsert, notifications)
deploy.sh                   # Deploy script: SSH to server, pull, install, restart via pm2
docs/prayer-notifications.md # Requirements & design for the azan notification feature
```

## Tech Stack

- [Telegraf](https://telegraf.js.org/) — Telegram bot framework
- [Mongoose](https://mongoosejs.com/) — MongoDB ODM
- [geo-tz](https://github.com/evansiroky/node-geo-tz) + [moment-timezone](https://momentjs.com/timezone/) — timezone resolution and date formatting

## Getting Started

### Prerequisites

- Node.js
- A MongoDB instance
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   MBOT_TOKEN=your-telegram-bot-token
   MONGO_URL=mongodb://localhost:27017
   MONGO_DB_NAME=azan_id_bot
   ```

3. Run the bot:

   ```sh
   node index.js
   ```

## Deployment

### First-time server setup

The bot runs on the server under [pm2](https://pm2.keymetrics.io/). Set it up once:

1. Clone the repo and create the `.env` file on the server (it is gitignored, so it must be placed there manually — see [Setup](#setup) for the variables).

2. Start the process **from the project directory** — dotenv resolves `.env` relative to the working directory pm2 was started from, so starting it elsewhere leaves `MBOT_TOKEN` and `MONGO_URL` undefined:

   ```sh
   cd ~/workspace/azan_id_bot
   npm install
   pm2 start index.js --name azan_id_bot
   ```

3. Make it survive reboots:

   ```sh
   pm2 save
   pm2 startup   # then run the command it prints
   ```

Useful commands: `pm2 list`, `pm2 logs azan_id_bot`, `pm2 restart azan_id_bot`, `pm2 delete azan_id_bot` (run `pm2 save` again after deleting). If the process was started from the wrong directory, `pm2 restart` keeps the bad working directory — check it with `pm2 describe azan_id_bot`, then `pm2 delete` and start it fresh from the project directory.

### Deploying updates

`deploy.sh` deploys to the remote server over SSH: it pulls the latest `main`, installs dependencies, and restarts the `azan_id_bot` pm2 process. It expects `DIGI_O_USERNAME` and `DIGI_O_IP` environment variables.

## Support

The bot is under active development. Support the project at [saweria.co/shellstrop](https://saweria.co/shellstrop) or reach out to [@ucup_aw](https://t.me/ucup_aw) on Telegram with suggestions or issues.
