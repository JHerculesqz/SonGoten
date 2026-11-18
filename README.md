# SonGoten

**AI-powered little games for creative bars — a grown-up playground, built with AI, open-sourced for everyone.**

[English](README.md) · [简体中文](docs/README_zh.md)

A friend of ours runs a wonderfully creative bar. We want to use AI to bring a better experience to places like theirs — not a smarter POS, not another chatbot at the door, but small, delightful things that make a night out feel a little more like play. SonGoten is that experiment, in the open: a growing collection of tiny AI game microservices that any bar — or anyone with a screen and a QR code — can run on their own hardware.

The name is a tribute to **Son Goten** from *Dragon Ball*, the kid who turned everything into a game.

## Table of Contents

- [What is SonGoten?](#what-is-songoten)
- [The Name](#the-name)
- [The Story](#the-story)
- [The Arcade](#the-arcade)
- [How It Fits Together](#how-it-fits-together)
- [Design Principles](#design-principles)
- [Project Status](#project-status)
- [Repository Layout (planned)](#repository-layout-planned)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [Documentation](#documentation)
- [Acknowledgements](#acknowledgements)
- [License](#license)

## What is SonGoten?

SonGoten is an open-source **collection of game-shaped microservices for bars**. Each one is a small, independent web app that guests open from their own phone — usually by scanning a QR code on the table — while the venue runs it on a laptop, a mini PC, or a single small server.

Think of it as an arcade that fits in a bar:

- **One game, one service.** Every microservice does one playful thing well and can run entirely on its own.
- **Bring your own phone.** No app to install; the guest experience starts with a QR code and a browser.
- **AI is the host, not the gimmick.** Language models write the questions, invent the characters, and improvise the surprises — while the human bartender still owns the room.
- **Self-hosted by design.** Your bar, your hardware, your data.
- **Built to be forked.** Each game is small enough to read in an afternoon and change in an evening.

### At a glance

| Property | Value |
| --- | --- |
| What it is | A collection of independent AI mini-game microservices |
| Made for | Creative bars, cafés, studios, parties — any place where strangers share a table |
| Guest device | Any modern phone browser (QR code) |
| Venue hardware | A laptop, mini PC, or small server |
| AI backend | Any OpenAI-compatible chat model endpoint |
| Project status | 🌱 Seedling — the first little games are being designed |
| License | MIT |

## The Name

**Son Goten** (孙悟天) is Goku's second son in *Dragon Ball* — a kid who loves games, treats training as play, and turns every serious moment into a small adventure. He is not the strongest fighter in the story; he is the one having the most fun.

That felt like the right mascot for a project whose only ambition is to make a bar a little more playful. Naming it after Goten is our way of tipping the cap to a story that taught a generation that play is not the opposite of growing up.

![Son Goten, the kid who loves games](docs/SonGoten.png)

*SonGoten is an independent fan tribute. Dragon Ball and Son Goten are the creations of Akira Toriyama; all related rights belong to their respective holders. This project is not affiliated with or endorsed by them.*

## The Story

Our friend's bar has good drinks, good music, and a room full of people who almost talk to each other.

We kept wondering: what would AI look like in a place like this if it behaved like a **good host** instead of a good employee? Not a recommendation engine. Not an ordering chatbot. Something that gives a table a reason to lean in, a stranger a reason to say hello, and the bartender a reason to grin.

The answer, we think, is games. Small ones. The kind you can start with a QR code and finish before the ice melts.

So that is what we are making: open-source little games, built with AI, for the bars — and the people — who make nights worth remembering.

## The Arcade

The first wave of little games (design in progress — names may change as they grow up):

| Little game | What happens | Status |
| --- | --- | --- |
| **BarAR** | Point your phone at one of twelve zodiac cocktail cards; SARA steps out of the card to tell the drink's story. | Playable |
| **BarStreet** | A pixel street with four bars (Loopin, Citrus, HiJack, Factory). Work shifts as a bartender, waiter, cleaner or supplier, collect bar albums, and redeem a real cocktail at the bar. | Playable (MVP) |
| **Dragon Radar** | A QR-code scavenger hunt: seven hidden "dragon balls" around the venue, each one guarding a riddle. Collect them all and the bar grants a wish (usually a snack). | In design |
| **Mood Mixer** | A few taps tell the AI your table's mood; it invents a cocktail or mocktail name, a tiny story, and a recipe. The bartender has the final word. | Planned |
| **Bar Trivia** | AI writes trivia about your city, your music, and the weird history of the street you are on. Everyone plays from their phone; one screen keeps score. | Planned |
| **Lyric Hunter** | Hum it, type it, or mangle it beyond recognition — the AI guesses the song and queues the next one. | Planned |
| **Toast Forge** | Tell it the occasion; it writes a toast that sounds like you, only funnier. Raise the glass, read it aloud, blame the AI. | Planned |
| **Midnight Radio** | The bar's playlist becomes a late-night story: the AI narrates short scenes between songs, and the whole room becomes the audience. | Planned |

> Have an idea for a little game that belongs in a bar? [Open an issue](https://github.com/JHerculesqz/SonGoten/issues) — the only requirement is that it makes a table of strangers laugh.

## How It Fits Together

Every game follows the same simple shape.

```
┌──────────────────────────────┐
│  Guest phone (any browser)   │
│  scan QR → tiny web game     │
└──────────────┬───────────────┘
               │ local Wi-Fi
               ▼
┌──────────────────────────────┐
│  SonGoten microservice       │
│  one game · one container    │
└──────────────┬───────────────┘
               │ OpenAI-compatible API
               ▼
┌──────────────────────────────┐
│  Your LLM (local or cloud)   │
└──────────────────────────────┘
```

- **Guests** only need a browser. No accounts, no downloads.
- **Each microservice** is a small HTTP service with a phone-friendly web UI, packaged as a container.
- **The AI** can be a local model or a cloud endpoint, as long as it speaks the OpenAI-compatible chat API.
- **The venue** stays in control: the bar decides which games run, what the AI is allowed to say, and how long a session lives.

## Design Principles

1. **Small is beautiful.** One game, one service, one container. If it cannot be explained in a sentence, it is too big.
2. **The phone is the controller; the bar is the stage.** The game should make people look up, not down.
3. **AI is the host, not the headline.** If a game is fun without AI, keep the game; AI should add surprise, not dependency.
4. **Humans hold the last word.** The bartender can veto a drink, a line, or a whole game. Staff are never replaced by a prompt.
5. **Privacy by default.** No accounts, no tracking, no data kept after the night ends.
6. **Cheap to run.** A bar should be able to host this on hardware it already owns.
7. **Responsible fun.** Every drinking game offers a mocktail path. Nobody is pushed to drink, and the best night ends with everyone getting home safely.

## Project Status

SonGoten is a **seedling**. Two playable experiences are now in the repository: **BarAR** and
**BarStreet**. More little games are being designed and will land one at a time.

| Now | Next | Later |
| --- | --- | --- |
| BarAR AR cocktail-menu game and BarStreet pixel bar game, both on the FastAPI service | Shared service conventions and more game microservices | More games, deployment guides, a gallery of bars using SonGoten |

## Repository Layout

```
SonGoten/
├── BarAR/             # AR frontend: MindAR + A-Frame, 12 zodiac targets
├── BarStreet/         # Pixel street bar game: four bars, four roles, card albums
├── Backend/           # FastAPI service for BarAR + BarStreet, Dockerfile, Compose
├── docs/              # bilingual docs and design notes
│   └── README_zh.md   # 简体中文
└── README.md
```

## Getting Started

BarAR and BarStreet are playable now. The Docker build pulls both frontends from GitHub
master, then packages the FastAPI service in `Backend/`:

```bash
git clone https://github.com/JHerculesqz/SonGoten.git
cd SonGoten/Backend
cp .env.example .env      # optional: host port, mirrors, staff PIN
docker compose up -d --build
```

Open <http://本机IP:3501/octogame/barar/> for the AR cocktail menu, or
<http://本机IP:3501/octogame/barstreet/> for the pixel street game. Print a zodiac card,
put it on the table, and watch SARA step out of it; or clock in at Loopin and start
collecting the first album. See [BarAR/README.md](BarAR/README.md),
[BarStreet/README.md](BarStreet/README.md) and [Backend/README.md](Backend/README.md)
for details.

## Contributing

Contributions are welcome — especially small, strange, delightful ones.

- **Have a game idea?** Open an issue titled `[Game] ...` and describe the moment at the table it creates.
- **Want to build one?** Keep it to a single microservice, include a README, and make sure it runs without depending on the other services.
- **One rule:** it must be fun for a table of strangers, not just for the person holding the phone.
- Be kind. The bar is a shared room.

## Documentation

- [简体中文 README](docs/README_zh.md)

## Acknowledgements

- *Dragon Ball* and Son Goten, created by Akira Toriyama, for teaching us that play is serious business.
- Every bartender who ever let us test an idea after closing time.

## License

[MIT](LICENSE)
