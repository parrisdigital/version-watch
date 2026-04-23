/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as feedback from "../feedback.js";
import type * as feedbackState from "../feedbackState.js";
import type * as http from "../http.js";
import type * as ingest from "../ingest.js";
import type * as ingestState from "../ingestState.js";
import type * as lib_publish from "../lib/publish.js";
import type * as ops from "../ops.js";
import type * as review from "../review.js";
import type * as seed from "../seed.js";
import type * as vendors from "../vendors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  events: typeof events;
  feedback: typeof feedback;
  feedbackState: typeof feedbackState;
  http: typeof http;
  ingest: typeof ingest;
  ingestState: typeof ingestState;
  "lib/publish": typeof lib_publish;
  ops: typeof ops;
  review: typeof review;
  seed: typeof seed;
  vendors: typeof vendors;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
