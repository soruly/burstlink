const handler = async (message: MessageEvent) => {
  const response = await fetch("https://graphql.anilist.co/", {
    method: "POST",
    body: JSON.stringify({
      variables: {
        page: message.data.page,
        perPage: 50,
      },
      query: `query ($page: Int = 1, $perPage: Int = 1, $id: Int, $type: MediaType = ANIME) {
            Page(page: $page, perPage: $perPage) {
              pageInfo {
                total
                perPage
                currentPage
                lastPage
                hasNextPage
              }
              media(id: $id, type: $type) {
                id
                idMal
              }
            }
          }`,
    }),
    headers: { "Content-Type": "application/json" },
  }).then((res) => res.json());
  if (response.data) {
    self.postMessage(response.data);
  } else if (response.errors.some(({ status }: { status: number }) => status === 429)) {
    handler(message);
  } else {
    console.log();
    console.log(response);
  }
};

self.onmessage = handler;
