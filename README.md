# yelpdata

yelpdata is a small local bridge to the hosted HasData
Yelp MCP server, which returns Yelp business data as
JSON. It can run a business search for a keyword in a
place, pull one business in full from its Yelp ID or
alias, and read that business's public review feed:
names, addresses, the business's published phone and
website, price range, categories, overall rating,
review counts, hours, and review text with the public
reviewer display names as published.

The bridge holds no business data of its own. It
answers the tool list locally, exactly as captured from
the live endpoint, and forwards each tool call
upstream, returning whatever comes back untouched. The
captured surface is three read-only fetches over
business-published data and public reviews: there is no
reservation, ordering, messaging or payment tool in it,
and no individual contact data beyond what a business
or reviewer has published on Yelp.

## Tools

- `hasdata_yelp_search_getSearchResults` — search
  Yelp businesses. Required: `keyword` and `location`.
  Optional: `l` (a map-bounds radius string of the form
  `g:lon1,lat1,lon2,lat2`), `domain` (which national
  Yelp site to target), and `start` (result offset for
  paging). Returns a ranked list of businesses with
  Yelp alias/ID, name, categories, rating, review
  count, price tier and thumbnail; feed a returned
  alias into the place tool for the full record.
- `hasdata_yelp_place_getPlaceDetails` — fetch one
  business in full. Required: `placeId` (a Yelp ID or
  Yelp alias). Optional: `domain`. Returns name,
  address, phone, website, price range, categories,
  overall rating, review count, hours, amenities,
  photos and highlighted reviews.
- `hasdata_yelp_reviews_getPlaceReviews` — read one
  business's review feed. Required: `placeId`.
  Optional: `domain`, `query` (free-text search within
  the reviews), `sortBy` (`relevanceDesc`, `dateDesc`,
  `dateAsc`, `ratingDesc`, `ratingAsc`, `elitesDesc`),
  `rating` (star-rating filter, comma-separated values
  allowed), `languageCode`, `notRecommended` (return
  the reviews Yelp does not currently recommend), and
  paging via `start`/`num` or the opaque
  `nextPageToken` from a previous response. Each review
  returns its author profile as published, full text,
  star rating, timestamp, photos and videos, reader
  reactions and the owner reply when present, plus the
  business's review totals by rating and by language.

## Configuration

- `HASDATA_YELP_MCP_URL` (optional) — override the
  upstream endpoint. Defaults to
  `https://mcp.hasdata.com/mcp?apis=yelp`. (The
  override hook is this rebuild's own labelled
  reconstruction.)
- `HASDATA_API_KEY` (optional) — when set, every
  upstream request carries an `x-api-key: <key>`
  header, for the caller's own HasData API key. When
  it is not set, no key header is sent. (The header
  name and the env name are pinned by the original's
  registry record; forwarding the key from this env
  var is a labelled reconstruction — the original
  surface was captured keyless.)

### Forwarding mechanics

On the first tool call the client opens a streamable
HTTP session upstream: a JSON-RPC `initialize` request
(protocolVersion `2025-03-26`, clientInfo name
`yelpdata`), then a `notifications/initialized`
notification, then the `tools/call` request carrying
the caller's arguments unchanged. When the upstream
answers `initialize` with an `Mcp-Session-Id` header,
that value rides on every later request of the
session, which is reused for the life of the process.
Replies may arrive as plain JSON or as server-sent
events; both are read.

Successful upstream results pass through verbatim,
including any `isError` flag the upstream sets.
Failures — a JSON-RPC error, a non-2xx status, an
unreadable response, or a request that cannot be
completed — come back as an `isError` result whose
text starts with `yelpdata error:` (this rendering is
this rebuild's own labelled reconstruction).

## CLI

Each tool is also a subcommand taking one JSON
argument string:

```bash
npx @reneturcios/yelpdata hasdata_yelp_search_getSearchResults '{"keyword":"coffee","location":"Seattle, Washington"}'
npx @reneturcios/yelpdata hasdata_yelp_place_getPlaceDetails '{"placeId":"mcdonalds-new-york-386"}'
npx @reneturcios/yelpdata hasdata_yelp_reviews_getPlaceReviews '{"placeId":"-4ofMtrD7pSpZIX5pnDkig","sortBy":"dateDesc"}'
npx @reneturcios/yelpdata --version
```

Exit codes: `0` on success, `1` on an `isError`
result, `2` on a usage error.

## MCP server

```bash
npx -y @reneturcios/yelpdata mcp
```

MCP client config:

```json
{
  "mcpServers": {
    "yelpdata": {
      "command": "npx",
      "args": ["-y", "@reneturcios/yelpdata", "mcp"]
    }
  }
}
```

## Docker

```bash
docker run -i ghcr.io/cloudcorprecords/yelpdata
docker run --rm ghcr.io/cloudcorprecords/yelpdata --version
```

The container's default command is `mcp`, so the first
form is a stdio MCP server; any other arguments reach
the CLI normally.

## Development

```bash
npm install
npm run build
npm test
npm run dev
```

The test suite runs entirely against a stubbed
JSON-RPC upstream — no live network calls.

## License

MIT — see `LICENSE`.
