/**
 * yelpdata core: a forwarding client for the hosted
 * HasData Yelp MCP server.
 *
 * Nothing is scraped or searched locally. tools/list is
 * answered from the literal definitions below, taken
 * verbatim from a live capture of the upstream server
 * (name, title, description and inputSchema exactly as
 * captured, title key included). A tools/call travels
 * upstream over a streamable-HTTP JSON-RPC session: an
 * initialize POST, a notifications/initialized POST,
 * then the tools/call POST, carrying the Mcp-Session-Id
 * response header on later requests when the upstream
 * issues one. The session opens lazily on the first
 * forwarded call and is reused for the client's life.
 *
 * The endpoint is pinned to
 * https://mcp.hasdata.com/mcp?apis=yelp — the query
 * string belongs to the pinned URL — and may be replaced
 * with the HASDATA_YELP_MCP_URL environment variable
 * (that override is a labelled reconstruction). When
 * HASDATA_API_KEY is set, every upstream request carries
 * an `x-api-key: <key>` header (header name pinned by the
 * registry record's remote declaration; forwarding the
 * key from this env var is a labelled reconstruction, as
 * the capture was taken keyless). When it is unset, no
 * key header goes out, and no Authorization header is
 * sent in either case.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures — an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch that
 * throws or times out — become an isError result whose
 * text begins with `yelpdata error:` (that rendering is
 * a labelled reconstruction). Replies may be plain JSON
 * or SSE (`data:` lines); the JSON-RPC message whose id
 * matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://mcp.hasdata.com/mcp?apis=yelp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/hasdata-yelp-tools-original.json)       */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "hasdata_yelp_place_getPlaceDetails",
    "title": "yelp_place: GET /",
    "description": "Get Yelp Place Details\n\nFetches a single Yelp business by Yelp ID or alias with domain targeting. Returns name, address, phone, website, price range, categories, overall rating, review count, hours, amenities, photos, and highlighted reviews. Use to enrich leads or listings with verified Yelp metadata, monitor a competitor's rating and review count over time, or validate hours/amenities before displaying venue details to end users.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "placeId": {
          "type": "string",
          "description": "The Yelp ID or Yelp Alias of the place. For example, 'jPIZ3FR5LNcwPuUHi2Fe4g' or 'mcdonalds-new-york-386'."
        },
        "domain": {
          "type": "string",
          "enum": [
            "www.yelp.com",
            "www.yelp.co.uk",
            "www.yelp.ca",
            "www.yelp.com.au",
            "ms.yelp.my",
            "www.yelp.cz",
            "www.yelp.dk",
            "www.yelp.de",
            "www.yelp.at",
            "de.yelp.ch",
            "en.yelp.be",
            "en.yelp.com.hk",
            "en.yelp.my",
            "www.yelp.co.nz",
            "en.yelp.com.ph",
            "www.yelp.ie",
            "www.yelp.com.sg",
            "en.yelp.ch",
            "www.yelp.com.ar",
            "www.yelp.cl",
            "www.yelp.es",
            "www.yelp.com.mx",
            "fil.yelp.com.ph",
            "fr.yelp.be",
            "fr.yelp.ca",
            "www.yelp.fr",
            "fr.yelp.ch",
            "www.yelp.it",
            "it.yelp.ch",
            "nl.yelp.be",
            "www.yelp.nl",
            "www.yelp.no",
            "www.yelp.pl",
            "www.yelp.com.br",
            "www.yelp.pt",
            "fi.yelp.fi",
            "sv.yelp.fi",
            "www.yelp.com.tr",
            "www.yelp.co.jp",
            "zh.yelp.com.hk",
            "www.yelp.com.tw"
          ],
          "description": "Yelp domain to use. Default is `www.yelp.com`."
        }
      },
      "required": [
        "placeId"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "hasdata_yelp_reviews_getPlaceReviews",
    "title": "yelp_reviews: GET /",
    "description": "Get Yelp Place Reviews\n\nFetches the review feed of a single Yelp business by Yelp ID, with sorting (relevance, date, rating, elites), filtering by star rating, language and free-text query, and cursor pagination. To page, either step `start` by `num`, or resend the `pagination.nextPageToken` of the previous response as the `nextPageToken` parameter, keeping the other filters unchanged, until `pagination.hasNextPage` is false. The response reports the page it returned as `pagination.start` and `pagination.num`, matching the parameter names. Each review returns the author profile (name, location, review/friend/photo counts, Elite status), full text with language, star rating, timestamp, attached photos and videos, reader reactions, review tags (check-ins, first review, reservation and payment flags) and the owner reply when present. The response also carries the business review totals broken down by rating and by language. Use to monitor customer sentiment over time, mine complaints for a competitor, track how a business responds to negative reviews, or build rating-distribution and review-velocity datasets.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "placeId": {
          "type": "string",
          "description": "The Yelp ID of the place. For example, '-4ofMtrD7pSpZIX5pnDkig'. Yelp IDs can be obtained from the Yelp Search Scraper API."
        },
        "domain": {
          "type": "string",
          "enum": [
            "www.yelp.com",
            "www.yelp.co.uk",
            "www.yelp.ca",
            "www.yelp.com.au",
            "ms.yelp.my",
            "www.yelp.cz",
            "www.yelp.dk",
            "www.yelp.de",
            "www.yelp.at",
            "de.yelp.ch",
            "en.yelp.be",
            "en.yelp.com.hk",
            "en.yelp.my",
            "www.yelp.co.nz",
            "en.yelp.com.ph",
            "www.yelp.ie",
            "www.yelp.com.sg",
            "en.yelp.ch",
            "www.yelp.com.ar",
            "www.yelp.cl",
            "www.yelp.es",
            "www.yelp.com.mx",
            "fil.yelp.com.ph",
            "fr.yelp.be",
            "fr.yelp.ca",
            "www.yelp.fr",
            "fr.yelp.ch",
            "www.yelp.it",
            "it.yelp.ch",
            "nl.yelp.be",
            "www.yelp.nl",
            "www.yelp.no",
            "www.yelp.pl",
            "www.yelp.com.br",
            "www.yelp.pt",
            "fi.yelp.fi",
            "sv.yelp.fi",
            "www.yelp.com.tr",
            "www.yelp.co.jp",
            "zh.yelp.com.hk",
            "www.yelp.com.tw"
          ],
          "description": "Yelp domain to use. Default is `www.yelp.com`."
        },
        "query": {
          "type": "string",
          "description": "Note: Yelp ignores the `rating` filter while searching, so a query returns matching reviews of every star rating. Free-text query to search within the reviews of the place.\n"
        },
        "sortBy": {
          "type": "string",
          "enum": [
            "relevanceDesc",
            "dateDesc",
            "dateAsc",
            "ratingDesc",
            "ratingAsc",
            "elitesDesc"
          ],
          "description": "The order in which the reviews are returned. Defaults to relevanceDesc."
        },
        "rating": {
          "type": "string",
          "description": "Note: Yelp ignores this filter when `query` is set, so a search returns matching reviews of every star rating. Filters the reviews by star rating. Possible values are 5, 4, 3, 2 and 1. To return only five-star reviews, set it to `5`. To include several ratings, pass them comma-separated, for example `5,4,3`. When omitted, reviews with any rating are returned.\n"
        },
        "languageCode": {
          "type": "string",
          "description": "Language of the reviews to return, as a two-letter code (e.g., 'en', 'es', 'fr'). Defaults to en."
        },
        "notRecommended": {
          "type": "boolean",
          "description": "Returns the reviews Yelp does not currently recommend (filtered out of the main feed by its recommendation software) instead of the recommended ones. These reviews carry no photos, videos or reactions, and are paginated ten at a time. Defaults to false.\n"
        },
        "start": {
          "type": "number",
          "description": "Result offset for pagination. It skips the given number of reviews, so the step matches `num` (e.g., 0, 49, 98 for the recommended feed, or 0, 10, 20 when `notRecommended` is set). The response echoes it back as `pagination.start`. Cannot be combined with `nextPageToken`.\n"
        },
        "num": {
          "type": "number",
          "description": "Number of reviews to return per page. The maximum is 49. Defaults to 49 for the recommended feed and to 10 when `notRecommended` is set. The response echoes it back as `pagination.num`.\n"
        },
        "nextPageToken": {
          "type": "string",
          "description": "Opaque cursor for the next page, taken verbatim from `pagination.nextPageToken` of the previous response. It carries both the offset and the page size, so passing it alone continues the feed where the last response ended. Keep the other filters (`sortBy`, `rating`, `languageCode`, `query`, `notRecommended`) identical across pages. Use either this or `start`, not both. Paginate until `pagination.hasNextPage` is false.\n"
        }
      },
      "required": [
        "placeId"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  },
  {
    "name": "hasdata_yelp_search_getSearchResults",
    "title": "yelp_search: GET /",
    "description": "Get Yelp Search Results\n\nRuns a Yelp business search by keyword and location with optional map-bounded radius via the `l` parameter (g:lon1,lat1,lon2,lat2), domain targeting, and offset-based pagination. Returns a ranked list of businesses with Yelp alias/ID, name, categories, rating, review count, price tier, and thumbnail. Use the returned aliases as input to the Yelp Place endpoint for full details, to power local-discovery UIs, or to build market-share/competitor datasets for a niche in a given geography.",
    "inputSchema": {
      "type": "object",
      "properties": {
        "keyword": {
          "type": "string",
          "description": "The search term for which to get the search results."
        },
        "location": {
          "type": "string",
          "description": "The location where to search for businesses with the given keyword."
        },
        "l": {
          "type": "string",
          "description": "Parameter defines the distance or map radius for the search results. For example: `g:-95.2486,29.8496,-95.4277,29.6324`.\n"
        },
        "domain": {
          "type": "string",
          "enum": [
            "www.yelp.com",
            "www.yelp.co.uk",
            "www.yelp.ca",
            "www.yelp.com.au",
            "ms.yelp.my",
            "www.yelp.cz",
            "www.yelp.dk",
            "www.yelp.de",
            "www.yelp.at",
            "de.yelp.ch",
            "en.yelp.be",
            "en.yelp.com.hk",
            "en.yelp.my",
            "www.yelp.co.nz",
            "en.yelp.com.ph",
            "www.yelp.ie",
            "www.yelp.com.sg",
            "en.yelp.ch",
            "www.yelp.com.ar",
            "www.yelp.cl",
            "www.yelp.es",
            "www.yelp.com.mx",
            "fil.yelp.com.ph",
            "fr.yelp.be",
            "fr.yelp.ca",
            "www.yelp.fr",
            "fr.yelp.ch",
            "www.yelp.it",
            "it.yelp.ch",
            "nl.yelp.be",
            "www.yelp.nl",
            "www.yelp.no",
            "www.yelp.pl",
            "www.yelp.com.br",
            "www.yelp.pt",
            "fi.yelp.fi",
            "sv.yelp.fi",
            "www.yelp.com.tr",
            "www.yelp.co.jp",
            "zh.yelp.com.hk",
            "www.yelp.com.tw"
          ],
          "description": "Yelp domain to use. Default is `www.yelp.com`."
        },
        "start": {
          "type": "number",
          "description": "Result offset for pagination (e.g., 0 for the first page, 10 for the 2nd page, etc.)."
        }
      },
      "required": [
        "keyword",
        "location"
      ],
      "additionalProperties": false,
      "$schema": "http://json-schema.org/draft-07/schema#"
    }
  }
];

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `yelpdata error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client that holds a single upstream
 * session, opened lazily on first use and reused from
 * then on (for the process lifetime in the MCP server,
 * or for a single invocation in the CLI).
 */
export class YelpdataClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).HASDATA_YELP_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private apiKey(): string | null {
    const raw = (this.deps.env ?? process.env).HASDATA_API_KEY;
    if (raw && raw.trim() !== "") return raw.trim();
    return null;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    const key = this.apiKey();
    if (key !== null) headers["x-api-key"] = key;
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "yelpdata", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): YelpdataClient {
  return new YelpdataClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new YelpdataClient(deps).callTool(name, args);
}
