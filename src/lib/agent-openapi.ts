import { DEFAULT_UPDATE_LIMIT, MAX_UPDATE_LIMIT, PUBLIC_API_SCHEMA_VERSION } from "@/lib/agent-feed";

export function buildOpenApiDocument(baseUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Version Watch Public API",
      version: PUBLIC_API_SCHEMA_VERSION,
      summary: "Agent-readable changelog intelligence for developer platforms.",
      description:
        "Version Watch exposes official platform changelogs, release notes, docs updates, RSS feeds, and GitHub releases as structured change intelligence.",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/api/v1/updates": {
        get: {
          operationId: "listUpdates",
          summary: "List public updates",
          description: "Return recent platform changes with optional filters and cursor pagination.",
          parameters: updateFilterParameters(),
          responses: {
            "200": jsonResponse("Paginated public updates.", { $ref: "#/components/schemas/UpdatesResponse" }),
            "400": jsonResponse("Invalid filter or cursor.", { $ref: "#/components/schemas/ErrorResponse" }),
          },
        },
      },
      "/api/v1/updates/{id}": {
        get: {
          operationId: "getUpdate",
          summary: "Get one update",
          description: "Return one public update by its Version Watch update id.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Public update id.",
            },
          ],
          responses: {
            "200": jsonResponse("Public update.", { $ref: "#/components/schemas/UpdateResponse" }),
            "404": jsonResponse("Update not found.", { $ref: "#/components/schemas/ErrorResponse" }),
          },
        },
      },
      "/api/v1/clusters": {
        get: {
          operationId: "listUpdateClusters",
          summary: "List clustered public updates",
          description:
            "Return a clustered view of public updates using the same filters as /api/v1/updates. Raw updates remain available from /api/v1/updates.",
          parameters: updateFilterParameters(),
          responses: {
            "200": jsonResponse("Paginated clustered updates.", { $ref: "#/components/schemas/ClustersResponse" }),
            "400": jsonResponse("Invalid filter or cursor.", { $ref: "#/components/schemas/ErrorResponse" }),
          },
        },
      },
      "/api/v1/vendors": {
        get: {
          operationId: "listVendors",
          summary: "List vendors",
          description: "Return tracked platforms and official source surfaces.",
          responses: {
            "200": jsonResponse("Vendor list.", { $ref: "#/components/schemas/VendorsResponse" }),
          },
        },
      },
      "/api/v1/status": {
        get: {
          operationId: "getApiStatus",
          summary: "Get API freshness status",
          description:
            "Return the current public freshness contract for the Convex-backed Version Watch snapshot.",
          responses: {
            "200": jsonResponse("Public API freshness status.", { $ref: "#/components/schemas/StatusResponse" }),
          },
        },
      },
      "/api/v1/status/vendors": {
        get: {
          operationId: "listVendorFreshness",
          summary: "List vendor freshness status",
          description:
            "Return per-vendor source freshness, lifecycle, tier, due time, backoff, and queued refresh state.",
          responses: {
            "200": jsonResponse("Vendor freshness list.", { $ref: "#/components/schemas/VendorFreshnessListResponse" }),
          },
        },
      },
      "/api/v1/status/vendors/{slug}": {
        get: {
          operationId: "getVendorFreshness",
          summary: "Get vendor freshness status",
          description: "Return freshness status for one tracked vendor slug.",
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "Vendor slug.",
            },
          ],
          responses: {
            "200": jsonResponse("Vendor freshness status.", { $ref: "#/components/schemas/VendorFreshnessResponse" }),
            "404": jsonResponse("Vendor not found.", { $ref: "#/components/schemas/ErrorResponse" }),
          },
        },
      },
      "/api/v1/taxonomy": {
        get: {
          operationId: "getTaxonomy",
          summary: "Get filter taxonomy",
          description: "Return valid severities, audiences, tags, source types, and vendor slugs for agent filters.",
          responses: {
            "200": jsonResponse("Public taxonomy.", { $ref: "#/components/schemas/TaxonomyResponse" }),
          },
        },
      },
      "/api/v1/feed.json": {
        get: {
          operationId: "getJsonFeed",
          summary: "Get JSON feed",
          description: "Return filtered updates in feed form with the same filters as /api/v1/updates.",
          parameters: updateFilterParameters(),
          responses: {
            "200": jsonResponse("JSON feed.", { $ref: "#/components/schemas/FeedJsonResponse" }),
            "400": jsonResponse("Invalid filter or cursor.", { $ref: "#/components/schemas/ErrorResponse" }),
          },
        },
      },
      "/api/v1/feed.md": textPath(
        "getApiMarkdownFeed",
        "Get Markdown feed",
        "Markdown feed under the API namespace.",
        true,
      ),
      "/feed.md": textPath("getMarkdownFeed", "Get root Markdown feed", "Markdown feed at the site root.", true),
      "/agents.md": textPath("getAgentGuide", "Get agent guide", "Markdown guide for agents using Version Watch."),
      "/llms.txt": textPath("getLlmsTxt", "Get LLM resource map", "Plain text resource map for LLM and crawler discovery."),
      "/skills/version-watch/SKILL.md": textPath(
        "getVersionWatchSkill",
        "Get Version Watch skill",
        "Portable Markdown skill that teaches agents how to use the Version Watch API.",
      ),
      "/api/v1/openapi.json": {
        get: {
          operationId: "getOpenApiDocument",
          summary: "Get OpenAPI contract",
          description: "Return the machine-readable OpenAPI contract for the public Version Watch API.",
          responses: {
            "200": jsonResponse("OpenAPI document.", { type: "object" }),
          },
        },
      },
    },
    components: {
      schemas: {
        PublicUpdate: {
          type: "object",
          required: [
            "id",
            "vendor",
            "vendor_slug",
            "title",
            "published_at",
            "severity",
            "signal_score",
            "release_class",
            "impact_confidence",
            "signal_reasons",
            "score_version",
            "audience",
            "tags",
            "summary",
            "why_it_matters",
            "recommended_action",
            "source_url",
            "github_url",
            "version_watch_url",
          ],
          properties: {
            id: { type: "string" },
            vendor: { type: "string" },
            vendor_slug: { type: "string" },
            title: { type: "string" },
            published_at: { type: "string", format: "date-time" },
            severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
            signal_score: { type: "integer" },
            release_class: {
              type: "string",
              enum: [
                "breaking",
                "security",
                "model_launch",
                "pricing",
                "policy",
                "api_change",
                "sdk_release",
                "cli_patch",
                "beta_release",
                "docs_update",
                "routine_release",
              ],
            },
            impact_confidence: { type: "string", enum: ["high", "medium", "low"] },
            signal_reasons: { type: "array", items: { type: "string" } },
            score_version: { type: "string" },
            audience: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
            why_it_matters: { type: "string" },
            recommended_action: { type: "string" },
            source_url: { type: "string", format: "uri" },
            github_url: { anyOf: [{ type: "string", format: "uri" }, { type: "null" }] },
            version_watch_url: { type: "string", format: "uri" },
          },
        },
        UpdatesResponse: {
          type: "object",
          examples: [
            {
              schema_version: PUBLIC_API_SCHEMA_VERSION,
              generated_at: "2026-04-26T00:00:00.000Z",
              status_url: `${baseUrl}/api/v1/status`,
              count: 1,
              total_count: 636,
              next_cursor: "eyJ2IjoyLCJwdWJsaXNoZWRBdCI6IjIwMjYtMDQtMjVUMTk6Mzk6MDguMDAwWiIsImlkIjoiZXhhbXBsZSJ9",
              filters: {
                since: null,
                vendor: "vercel",
                severity: "high",
                audience: null,
                tag: "deployment",
                cursor: null,
                limit: 1,
              },
              updates: [],
            },
          ],
          required: [
            "schema_version",
            "generated_at",
            "status_url",
            "count",
            "total_count",
            "next_cursor",
            "filters",
            "updates",
          ],
          properties: {
            schema_version: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
            status_url: { type: "string", format: "uri" },
            count: { type: "integer" },
            total_count: { type: "integer" },
            next_cursor: { anyOf: [{ type: "string" }, { type: "null" }] },
            filters: { $ref: "#/components/schemas/UpdateFilters" },
            updates: { type: "array", items: { $ref: "#/components/schemas/PublicUpdate" } },
          },
        },
        UpdateFilters: {
          type: "object",
          required: ["since", "vendor", "severity", "audience", "tag", "cursor", "limit"],
          properties: {
            since: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            vendor: { anyOf: [{ type: "string" }, { type: "null" }] },
            severity: { anyOf: [{ type: "string", enum: ["critical", "high", "medium", "low"] }, { type: "null" }] },
            audience: { anyOf: [{ type: "string" }, { type: "null" }] },
            tag: { anyOf: [{ type: "string" }, { type: "null" }] },
            cursor: { anyOf: [{ type: "string" }, { type: "null" }] },
            limit: { type: "integer", minimum: 1, maximum: MAX_UPDATE_LIMIT },
          },
        },
        UpdateResponse: {
          type: "object",
          required: ["schema_version", "update"],
          properties: {
            schema_version: { type: "string" },
            update: { $ref: "#/components/schemas/PublicUpdate" },
          },
        },
        PublicUpdateCluster: {
          type: "object",
          required: [
            "id",
            "kind",
            "vendor",
            "vendor_slug",
            "title",
            "release_class",
            "severity",
            "signal_score",
            "update_count",
            "latest_published_at",
            "earliest_published_at",
            "tags",
            "summary",
            "why_it_matters",
            "recommended_action",
            "updates",
          ],
          properties: {
            id: { type: "string" },
            kind: { type: "string", enum: ["single", "cluster"] },
            vendor: { type: "string" },
            vendor_slug: { type: "string" },
            title: { type: "string" },
            release_class: { type: "string" },
            severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
            signal_score: { type: "integer" },
            update_count: { type: "integer" },
            latest_published_at: { type: "string", format: "date-time" },
            earliest_published_at: { type: "string", format: "date-time" },
            tags: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
            why_it_matters: { type: "string" },
            recommended_action: { type: "string" },
            updates: { type: "array", items: { $ref: "#/components/schemas/PublicUpdate" } },
          },
        },
        ClustersResponse: {
          type: "object",
          required: [
            "schema_version",
            "generated_at",
            "status_url",
            "count",
            "total_count",
            "next_cursor",
            "filters",
            "clusters",
          ],
          properties: {
            schema_version: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
            status_url: { type: "string", format: "uri" },
            count: { type: "integer" },
            total_count: { type: "integer" },
            next_cursor: { anyOf: [{ type: "string" }, { type: "null" }] },
            filters: { $ref: "#/components/schemas/UpdateFilters" },
            clusters: { type: "array", items: { $ref: "#/components/schemas/PublicUpdateCluster" } },
          },
        },
        PublicVendor: {
          type: "object",
          required: ["slug", "name", "description", "sources"],
          properties: {
            slug: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            sources: {
              type: "array",
              items: {
                type: "object",
                required: ["name", "url", "type"],
                properties: {
                  name: { type: "string" },
                  url: { type: "string", format: "uri" },
                  type: { type: "string" },
                },
              },
            },
          },
        },
        VendorsResponse: {
          type: "object",
          examples: [
            {
              schema_version: PUBLIC_API_SCHEMA_VERSION,
              generated_at: "2026-04-26T00:00:00.000Z",
              count: 1,
              vendors: [
                {
                  slug: "vercel",
                  name: "Vercel",
                  description: "Hosting, runtime, AI SDK, and deployment changes.",
                  sources: [{ name: "Vercel Changelog", url: "https://vercel.com/changelog", type: "changelog_page" }],
                },
              ],
            },
          ],
          required: ["schema_version", "generated_at", "count", "vendors"],
          properties: {
            schema_version: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
            count: { type: "integer" },
            vendors: { type: "array", items: { $ref: "#/components/schemas/PublicVendor" } },
          },
        },
        TaxonomyResponse: {
          type: "object",
          examples: [
            {
              schema_version: PUBLIC_API_SCHEMA_VERSION,
              generated_at: "2026-04-26T00:00:00.000Z",
              taxonomy: {
                severities: ["critical", "high", "medium", "low"],
                release_classes: ["model_launch", "cli_patch", "breaking"],
                impact_confidences: ["high", "medium", "low"],
                audiences: ["ai", "backend", "frontend", "infra"],
                tags: ["api", "auth", "deployment", "frontier-model", "sdk"],
                source_types: ["changelog_page", "docs_page", "github_release", "rss"],
                vendors: [{ slug: "vercel", name: "Vercel" }],
              },
            },
          ],
          required: ["schema_version", "generated_at", "taxonomy"],
          properties: {
            schema_version: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
            taxonomy: {
              type: "object",
              required: ["severities", "release_classes", "impact_confidences", "audiences", "tags", "source_types", "vendors"],
              properties: {
                severities: { type: "array", items: { type: "string" } },
                release_classes: { type: "array", items: { type: "string" } },
                impact_confidences: { type: "array", items: { type: "string" } },
                audiences: { type: "array", items: { type: "string" } },
                tags: { type: "array", items: { type: "string" } },
                source_types: { type: "array", items: { type: "string" } },
                vendors: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["slug", "name"],
                    properties: {
                      slug: { type: "string" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
        FeedJsonResponse: {
          type: "object",
          required: [
            "schema_version",
            "generated_at",
            "feed_url",
            "status_url",
            "count",
            "total_count",
            "next_cursor",
            "updates",
          ],
          properties: {
            schema_version: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
            feed_url: { type: "string", format: "uri" },
            status_url: { type: "string", format: "uri" },
            count: { type: "integer" },
            total_count: { type: "integer" },
            next_cursor: { anyOf: [{ type: "string" }, { type: "null" }] },
            updates: { type: "array", items: { $ref: "#/components/schemas/PublicUpdate" } },
          },
        },
        PublicApiStatus: {
          type: "object",
          required: [
            "status",
            "latest_refresh_at",
            "latest_refresh_age_minutes",
            "latest_event_at",
            "active_source_count",
            "degraded_source_count",
            "failing_source_count",
            "stale_source_count",
            "recent_refresh_failures",
            "coverage",
          ],
          properties: {
            status: { type: "string", enum: ["healthy", "degraded", "stale"] },
            latest_refresh_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            latest_refresh_age_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
            latest_event_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            active_source_count: { type: "integer" },
            degraded_source_count: { type: "integer" },
            failing_source_count: { type: "integer" },
            stale_source_count: { type: "integer" },
            recent_refresh_failures: { type: "integer" },
            coverage: {
              type: "object",
              required: ["active_vendors", "paused_vendors", "unsupported_vendors"],
              properties: {
                active_vendors: { type: "integer" },
                paused_vendors: { type: "integer" },
                unsupported_vendors: { type: "integer" },
              },
            },
          },
        },
        StatusResponse: {
          type: "object",
          examples: [
            {
              schema_version: PUBLIC_API_SCHEMA_VERSION,
              generated_at: "2026-04-26T00:00:00.000Z",
              status: "healthy",
              latest_refresh_at: "2026-04-26T00:00:00.000Z",
              latest_refresh_age_minutes: 12,
              latest_event_at: "2026-04-25T19:39:08.000Z",
              active_source_count: 49,
              degraded_source_count: 0,
              failing_source_count: 0,
              stale_source_count: 0,
              recent_refresh_failures: 0,
              coverage: {
                active_vendors: 44,
                paused_vendors: 0,
                unsupported_vendors: 1,
              },
            },
          ],
          required: [
            "schema_version",
            "generated_at",
            "status",
            "latest_refresh_at",
            "latest_refresh_age_minutes",
            "latest_event_at",
            "active_source_count",
            "degraded_source_count",
            "failing_source_count",
            "stale_source_count",
            "recent_refresh_failures",
            "coverage",
          ],
          properties: {
            schema_version: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
            status: { type: "string", enum: ["healthy", "degraded", "stale"] },
            latest_refresh_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            latest_refresh_age_minutes: { anyOf: [{ type: "integer" }, { type: "null" }] },
            latest_event_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            active_source_count: { type: "integer" },
            degraded_source_count: { type: "integer" },
            failing_source_count: { type: "integer" },
            stale_source_count: { type: "integer" },
            recent_refresh_failures: { type: "integer" },
            coverage: {
              type: "object",
              required: ["active_vendors", "paused_vendors", "unsupported_vendors"],
              properties: {
                active_vendors: { type: "integer" },
                paused_vendors: { type: "integer" },
                unsupported_vendors: { type: "integer" },
              },
            },
          },
        },
        VendorFreshnessStatus: {
          type: "object",
          required: [
            "vendor",
            "vendor_slug",
            "lifecycle_state",
            "freshness_tier",
            "latest_attempt_at",
            "latest_success_at",
            "latest_failure_at",
            "next_due_at",
            "backoff_until",
            "active_source_count",
            "degraded_source_count",
            "failing_source_count",
            "stale_source_count",
            "paused_source_count",
            "unsupported_source_count",
            "queued_refresh",
          ],
          properties: {
            vendor: { type: "string" },
            vendor_slug: { type: "string" },
            lifecycle_state: { type: "string", enum: ["active", "degraded", "paused", "unsupported"] },
            freshness_tier: { type: "string", enum: ["critical", "high", "standard", "long_tail"] },
            latest_attempt_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            latest_success_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            latest_failure_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            next_due_at: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            backoff_until: { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] },
            active_source_count: { type: "integer" },
            degraded_source_count: { type: "integer" },
            failing_source_count: { type: "integer" },
            stale_source_count: { type: "integer" },
            paused_source_count: { type: "integer" },
            unsupported_source_count: { type: "integer" },
            queued_refresh: { type: "boolean" },
          },
        },
        VendorFreshnessListResponse: {
          type: "object",
          examples: [
            {
              schema_version: PUBLIC_API_SCHEMA_VERSION,
              generated_at: "2026-04-26T00:00:00.000Z",
              count: 1,
              vendors: [
                {
                  vendor: "Vercel",
                  vendor_slug: "vercel",
                  lifecycle_state: "active",
                  freshness_tier: "critical",
                  latest_attempt_at: "2026-04-26T00:00:00.000Z",
                  latest_success_at: "2026-04-26T00:00:00.000Z",
                  latest_failure_at: null,
                  next_due_at: "2026-04-26T00:30:00.000Z",
                  backoff_until: null,
                  active_source_count: 1,
                  degraded_source_count: 0,
                  failing_source_count: 0,
                  stale_source_count: 0,
                  paused_source_count: 0,
                  unsupported_source_count: 0,
                  queued_refresh: false,
                },
              ],
            },
          ],
          required: ["schema_version", "generated_at", "count", "vendors"],
          properties: {
            schema_version: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
            count: { type: "integer" },
            vendors: { type: "array", items: { $ref: "#/components/schemas/VendorFreshnessStatus" } },
          },
        },
        VendorFreshnessResponse: {
          type: "object",
          required: ["schema_version", "generated_at", "vendor"],
          properties: {
            schema_version: { type: "string" },
            generated_at: { type: "string", format: "date-time" },
            vendor: { $ref: "#/components/schemas/VendorFreshnessStatus" },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: {
                  type: "string",
                  enum: ["invalid_filter", "invalid_cursor", "not_found"],
                },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  };
}

function parameter(name: string, description: string, type = "string", format?: string, enumValues?: string[]) {
  return {
    name,
    in: "query",
    required: false,
    description,
    schema: {
      type,
      ...(format ? { format } : {}),
      ...(enumValues ? { enum: enumValues } : {}),
    },
  };
}

function updateFilterParameters() {
  return [
    parameter("since", "ISO 8601 timestamp. Returns updates published at or after this time.", "string", "date-time"),
    parameter("vendor", "Vendor slug such as openai, stripe, vercel, github, or cloudflare."),
    parameter("severity", "Importance band.", "string", undefined, ["critical", "high", "medium", "low"]),
    parameter("audience", "Audience label such as frontend, backend, infra, ai, product, security, or compliance."),
    parameter("tag", "Category or affected stack tag such as api, auth, billing, sdk, agents, hosting, or deployments."),
    parameter("limit", `Positive integer. Defaults to ${DEFAULT_UPDATE_LIMIT} and clamps at ${MAX_UPDATE_LIMIT}.`, "integer"),
    parameter("cursor", "Opaque cursor returned by next_cursor."),
  ];
}

function jsonResponse(description: string, schema: object) {
  return {
    description,
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

function textPath(operationId: string, summary: string, description: string, acceptsUpdateFilters = false) {
  return {
    get: {
      operationId,
      summary,
      description,
      ...(acceptsUpdateFilters ? { parameters: updateFilterParameters() } : {}),
      responses: {
        "200": {
          description: summary,
          content: {
            "text/plain": {
              schema: { type: "string" },
            },
            "text/markdown": {
              schema: { type: "string" },
            },
          },
        },
      },
    },
  };
}
