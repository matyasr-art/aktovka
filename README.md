# 🎒 Aktovka — škola bez chaosu

Rodičovský asistent, který sjednotí **WhatsApp, e-maily i SMS** od školy na jednom místě, AI z nich vytáhne **návrhy akcí** a hodí je rovnou do kalendáře — včetně termínů, místa, dopravy, jak má jít dítě oblečené, co s sebou a kapesného.

Hlavní fíčura: **personalizace podle dítěte.** Z jednoho hromadného školního mailu Aktovka řekne pro každé dítě zvlášť, kdy má sraz, kdo ho doprovází a kdy se vrací — podle jeho třídy.

## Funkce

- **Sjednocená schránka** napříč kanály (WhatsApp / e-mail / SMS) s barevným rozlišením
- **AI rozpoznání akce** — z textu zprávy strukturovaná akce (datum, místo, doprava, oblečení, peníze, co s sebou)
- **Personalizace podle dítěte / třídy** (sraz, dozor, návrat)
- **Kalendář** (měsíc + seznam) a **detail akce** s úkoly k vyřízení
- **Připojení kanálů** — poctivé k iOS realitě (e-mail automaticky, WhatsApp/SMS přes Sdílet)
- **PWA** — instalovatelné do telefonu, běh na celou obrazovku, funguje i offline

## Spuštění lokálně

```bash
npx serve .
```

Otevři `http://localhost:3000`. Demo přihlášení je předvyplněné (Petr Kříž / rodina Křížova).

## Nasazení (Cloudflare Workers)

Statické soubory servíruje Cloudflare Worker dle [`wrangler.jsonc`](wrangler.jsonc):

```bash
npx wrangler deploy
```

Nebo přes Cloudflare dashboard propojením s tímto GitHub repem (auto-deploy při pushi do `main`).

## Tech

Vanilla HTML / CSS / JS, žádný build. Veškerá data jsou **smyšlená** (demo) v [`data.js`](data.js).
