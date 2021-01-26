interface Anilist {
  idMal: number;
  id: number;
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

console.log("Getting anilist data...");

const getLastPage: () => Promise<number> = () =>
  new Promise((resolve) => {
    const worker = new Worker(new URL("worker.ts", import.meta.url).href, {
      type: "module",
    });
    worker.postMessage({ page: 1 });
    worker.onmessage = ({ data }: MessageEvent) => {
      resolve(data.Page.pageInfo.lastPage);
      worker.terminate();
    };
  });
const lastPage = await getLastPage();

const pageList = Array.from(Array(lastPage), (_, i) => i + 1);

const maxWorkers = 4;

const workerList = Array.from(
  Array(lastPage > maxWorkers ? maxWorkers : lastPage),
  (_, i) => i + 1,
).map((i) =>
  new Worker(new URL("worker.ts", import.meta.url).href, { type: "module" })
);

const getAnilist: () => Promise<Anilist[]> = () =>
  new Promise((resolve) => {
    let list: Anilist[] = [];

    for (const worker of workerList) {
      Deno.stdout.writeSync(new Uint8Array([0x0d]));
      Deno.stdout.writeSync(
        new Uint8Array(
          new TextEncoder().encode(
            `Fetching Anilist page: ${lastPage - pageList.length}/${lastPage}`,
          ),
        ),
      );
      worker.postMessage({ page: pageList.shift() });
      worker.onmessage = ({ data }: MessageEvent) => {
        // list = data ? [...list, ...data.Page.media] : list;
        list = [...list, ...data.Page.media];
        if (pageList.length) {
          Deno.stdout.writeSync(new Uint8Array([0x0d]));
          Deno.stdout.writeSync(
            new Uint8Array(
              new TextEncoder().encode(
                `Fetching Anilist page: ${lastPage -
                  pageList.length}/${lastPage}`,
              ),
            ),
          );
          worker.postMessage({ page: pageList.shift() });
        } else {
          worker.terminate();
          workerList.splice(
            workerList.findIndex((e) => e === worker),
            1,
          );
          if (!workerList.length) {
            resolve(list.sort((a, b) => a.id - b.id));
          }
        }
      };
    }
  });

const ANILIST_MAL: Anilist[] = await getAnilist();

console.log();
console.log(`Found ${ANILIST_MAL.length} Anilist entries`);

console.log("Downloading manami data");

const manamiData = await fetch(
  "https://github.com/manami-project/anime-offline-database/raw/master/anime-offline-database.json",
).then((res) => res.json());

const ANIDB_MAL_ANN_ANILIST: Entry[] = manamiData.data.map((each: Manami) => {
  const entry: Entry = {};
  for (const url of each.sources) {
    if (url.startsWith("https://anidb.net/")) {
      entry.anidb = Number(url.replace("https://anidb.net/anime/", ""));
    } else if (url.startsWith("https://myanimelist.net/anime/")) {
      entry.mal = Number(url.replace("https://myanimelist.net/anime/", ""));
      if (ANILIST_MAL.some((e) => e.idMal === entry.mal)) {
        entry.anilist = ANILIST_MAL.filter((e) => e.idMal === entry.mal)[0].id;
      }
    } else if (
      url.startsWith("https://animenewsnetwork.com/encyclopedia/anime.php?id=")
    ) {
      entry.ann = Number(
        url.replace(
          "https://animenewsnetwork.com/encyclopedia/anime.php?id=",
          "",
        ),
      );
    }
  }
  return entry;
});

console.log(`Merged into ${ANIDB_MAL_ANN_ANILIST.length} entries`);
console.log("Writing merged output");
Deno.writeTextFileSync(
  "burstlink.json",
  JSON.stringify(ANIDB_MAL_ANN_ANILIST, null, 2),
);
