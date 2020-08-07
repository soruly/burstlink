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

enum SEASON {
  SPRING = "SPRING",
  SUMMER = "SUMMER",
  FALL = "FALL",
  WINTER = "WINTER",
  UNDEFINED = "UNDEFINED",
}

enum TYPE {
  TV = "TV",
  Movie = "MOVIE",
  OVA = "OVA",
  ONA = "ONA",
  Special = "Special",
}

enum STATUS {
  FINISHED = "FINISHED",
  CURRENTLY = "CURRENTLY",
  UPCOMING = "UPCOMING",
  UNKNOWN = "UNKNOWN",
}

interface Manami {
  sources: string[];
  title: string;
  type: TYPE;
  episodes: number;
  status: STATUS;
  animeSeason: {
    season: SEASON;
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
  each.sources.forEach((url) => {
    if (url.indexOf("https://anidb.net/") === 0) {
      entry.anidb = parseInt(url.replace("https://anidb.net/anime/", ""), 10);
    } else if (url.indexOf("https://myanimelist.net/anime/") === 0) {
      entry.mal = parseInt(url.replace("https://myanimelist.net/anime/", ""), 10);
      if (ANILIST_MAL.some((e) => e.mal === entry.mal)) {
        entry.anilist = ANILIST_MAL.filter((e) => e.mal === entry.mal)[0].anilist;
      }
    } else if (url.indexOf("https://animenewsnetwork.com/encyclopedia/anime.php?id=") === 0) {
      entry.ann = parseInt(
        url.replace("https://animenewsnetwork.com/encyclopedia/anime.php?id=", ""),
        10
      );
    } else {
      console.log(url);
    }
  });
  return entry;
});

console.log(`Merged into ${ANIDB_MAL_ANN_ANILIST.length} entries`);
console.log("Writing merged output");
Deno.writeTextFileSync("burstlink.json", JSON.stringify(ANIDB_MAL_ANN_ANILIST, null, 2));
