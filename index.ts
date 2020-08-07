interface Anilist {
  _index: string;
  _type: string;
  _id: string;
  _score: null;
  _source: {
    idMal: number;
    id: number;
  };
  sort: number[];
}

interface Manami {
  sources: string[];
  title: string;
  type: "TV" | "MOVIE" | "OVA" | "ONA" | "Special";
  episodes: number;
  status: "FINISHED" | "CURRENTLY" | "UPCOMING" | "UNKNOWN";
  animeSeason: {
    season: "SPRING" | "SUMMER" | "FALL" | "WINTER" | "UNDEFINED";
    year?: number;
  };
  picture: string;
  thumbnail: string;
  synonyms: string[];
  relations: string[];
  tags: string[];
}

interface Entry {
  anidb?: number;
  mal?: number;
  anilist?: number;
  ann?: number;
}

const queryAnilist = (offset: number) =>
  fetch("http://127.0.0.1:9200/anilist/anime/_search", {
    method: "POST",
    body: JSON.stringify({
      query: { bool: { must: [{ match_all: {} }] } },
      _source: ["id", "idMal"],
      sort: [{ id: "asc" }],
      search_after: [offset.toString()],
      from: 0,
      size: 10000,
    }),
    headers: { "Content-Type": "application/json" },
  }).then((res) => res.json());

console.log("Getting anilist-mal data");
const [...result] = await Promise.all([queryAnilist(0), queryAnilist(10000)]);

const ANILIST_MAL = []
  .concat(...result.map((each) => each.hits.hits))
  .map((each: Anilist) => ({
    anilist: each._source.id,
    mal: each._source.idMal,
  }))
  .filter((each) => each.anilist && each.mal);
console.log(`Found ${ANILIST_MAL.length} anilist-mal entries`);

console.log("Downloading manami data");
const manamiData = await fetch(
  "https://github.com/manami-project/anime-offline-database/raw/master/anime-offline-database.json"
).then((res) => res.json());
const ANIDB_MAL_ANN_ANILIST = manamiData.data.map((each: Manami) => {
  const entry: Entry = {};
  for (const url of each.sources) {
    if (url.startsWith("https://anidb.net/")) {
      entry.anidb = Number(url.replace("https://anidb.net/anime/", ""));
    } else if (url.startsWith("https://myanimelist.net/anime/")) {
      entry.mal = Number(url.replace("https://myanimelist.net/anime/", ""));
      if (ANILIST_MAL.some((e) => e.mal === entry.mal)) {
        entry.anilist = ANILIST_MAL.filter((e) => e.mal === entry.mal)[0].anilist;
      }
    } else if (url.startsWith("https://animenewsnetwork.com/encyclopedia/anime.php?id=")) {
      entry.ann = Number(
        url.replace("https://animenewsnetwork.com/encyclopedia/anime.php?id=", "")
      );
    } else {
      console.log(url);
    }
  }
  return entry;
});

console.log(`Merged into ${ANIDB_MAL_ANN_ANILIST.length} entries`);
console.log("Writing merged output");
Deno.writeTextFileSync("burstlink.json", JSON.stringify(ANIDB_MAL_ANN_ANILIST, null, 2));
