const fs = require("fs");
const request = require("request-promise");

const queryAnilist = (offset) => request(
  {
    method: "POST",
    uri: "http://127.0.0.1:9200/anilist/anime/_search",
    body: {
      query: {bool: {must: [{match_all: {}}]}},
      _source: [
        "id",
        "idMal"
      ],
      sort: [{id: "asc"}],
      search_after: [offset.toString()],
      from: 0,
      size: 10000
    },
    json: true // Automatically stringifies the body to JSON
  }
);

(async () => {
  console.log("Getting anilist-mal data");
  const [...result] = await Promise.all([
    queryAnilist(0),
    queryAnilist(10000)
  ]);
  const ANILIST_MAL = [].concat(...result.map((each) => each.hits.hits))
    .map((each) => ({
      anilist: each._source.id,
      mal: each._source.idMal
    }))
    .filter((each) => each.anilist && each.mal);
  console.log(`Found ${ANILIST_MAL.length} anilist-mal entries`);

  console.log("Downloading manami data");
  const manamiData = await request("https://github.com/manami-project/anime-offline-database/raw/master/anime-offline-database.json");
  const ANIDB_MAL_ANN_ANILIST = JSON.parse(manamiData).data
    .map((each) => each.sources)
    .map((urlList) => {
      const entry = {};
      urlList.forEach((url) => {
        if (url.indexOf("https://anidb.net/") === 0) {
          entry.anidb = parseInt(url.replace("https://anidb.net/a", ""), 10);
        } else if (url.indexOf("https://myanimelist.net/anime/") === 0) {
          entry.mal = parseInt(url.replace("https://myanimelist.net/anime/", ""), 10);
          if (ANILIST_MAL.some((e) => e.mal === entry.mal)) {
            entry.anilist = ANILIST_MAL.filter((e) => e.mal === entry.mal)[0].anilist;
          }
        } else if (url.indexOf("https://animenewsnetwork.com/encyclopedia/anime.php?id=") === 0) {
          entry.ann = parseInt(url.replace("https://animenewsnetwork.com/encyclopedia/anime.php?id=", ""), 10);
        } else {
          console.log(url);
        }
      });
      return entry;
    });

  console.log(`Merged into ${ANIDB_MAL_ANN_ANILIST.length} entries`);
  console.log("Writing merged output");
  fs.writeFileSync("burstlink.json", JSON.stringify(ANIDB_MAL_ANN_ANILIST, null, 2));
})();


