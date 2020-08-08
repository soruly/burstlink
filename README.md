# burstlink

This repo has a json file that helps to look up anime IDs from different Anime DBs.  
To get more anime info you have to query those database yourself. It only store IDs for mapping.

# Usage

e.g. To lookup IDs using MyAnimeList ID:

```javascript
const db = await fetch(
  "https://raw.githubusercontent.com/soruly/burstlink/master/burstlink.json"
).then((res) => res.json());
console.log(db.find((entry) => entry.mal === 37207));
```

```
interface Entry {
  anidb?: number;
  mal?: number;
  anilist?: number;
  ann?: number;
}
```

# Contributing

This repo is automatically kept up-to-date with [Anilist](https://anilist.co/) and [anime-offline-database](https://github.com/manami-project/anime-offline-database/).

To update the json file, git clone this repo, [Install deno](https://deno.land/manual/getting_started/installation), and then

```
deno run --allow-net --allow-read --allow-write index.ts
```
