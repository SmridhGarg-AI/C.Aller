# Aller Matrix

One mobile-first Next.js App Router / React / TypeScript project containing all 20 screens. Cream/ivory/terracotta UI, local SVG illustrations, Lucide icons, Supabase authentication and private PostgreSQL/Storage policies, Open Food Facts, server-side Gemini, and ZXing barcode capture.

## Exact local setup (Windows PowerShell)

1. Install Node.js 24 LTS and npm.
2. Open a terminal in `C:\Users\Smridh\OneDrive\Desktop\CODE\aller-matrix`.
3. Run `npm.cmd install` (use `npm install` on shells without the PowerShell script-policy restriction).
4. Run `Copy-Item .env.example .env.local` once. Fill in Supabase URL/publishable key and server-only Gemini key. Restart Next.js after environment changes. Never paste a service-role key into this app.
5. For a **new Supabase database**, execute `supabase/schema.sql` once in the Supabase SQL editor. For an **existing database**, apply only the missing files in `supabase/migrations`: favorites, chat rate limits, account deletion requests, entitlements. Do not run duplicate policy creation scripts on a database that already has them.
6. In Supabase Auth set Site URL to `http://localhost:3000`, allow `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?next=/reset-password`, enable email/password and configure email delivery/confirmation. For Google OAuth enable the provider and its credentials in Supabase; use the Supabase OAuth callback in Google Cloud.
7. Run `npm.cmd run dev`. Open **http://localhost:3000**. Camera access works on localhost or HTTPS, with permission; plain HTTP LAN addresses generally cannot use the camera. Manual barcode and gallery alternatives are provided.

### Launching from VS Code

Open the `aller-matrix` folder in VS Code. Press **Ctrl+Shift+P**, choose **Tasks: Run Task**, then select **Run Aller Matrix (main)**. Open [http://localhost:3000](http://localhost:3000).

You can also press **F5** and choose **Open Aller Matrix (localhost:3000)**. The included VS Code launch configuration starts the real Next.js app before opening the browser.

The Live Server extension serves static files only, so it cannot run this application correctly: authentication, Gemini routes, Open Food Facts requests, scan quotas and database APIs need the Next.js server. Use the included task instead of **Go Live**.

No install or setup step provisions production credentials or applies remote database changes automatically. The private Storage bucket is prepared; user photos are not automatically archived. Configure your Google API account's data handling before sending sensitive label images.

## Screens and routes, in reference order

1. `/` or `/splash` → splash with auth-aware navigation
2. `/login`
3. `/signup`
4. `/onboarding/name`
5. `/onboarding/diet`
6. `/onboarding/medical`
7. `/onboarding/allergies`
8. `/loading`
9. `/home`
10. `/search?query=...`
11. `/food/[id]` (Open Food Facts barcode/product ID)
12. `/scan/barcode`
13. `/scan/result/[barcode]`
14. `/food-lens`
15. `/ingredients`
16. `/ingredients/analysis`
17. `/chat`
18. `/history`
19. `/profile`
20. `/plus`

Legacy `/barcode`, `/ingredient-check`, `/ingredient-analysis`, `/onboarding` and `/food` route to the corresponding dedicated screens. The original generic `App` scaffold/bridge files are retained as inactive legacy code; no current route renders that generic screen switch. `/api/ai` is retired (410); the dedicated AI endpoints provide validation, authentication and limits.

## What runs, and what requires credentials

- Local layouts, input validation, navigation, ingredient drafts, photo preparation and barcode decoding work without remote secrets. Unconfigured onboarding is explicitly labeled tab/device demo mode. Home/History show no fabricated saved products. Profile/Auth/AI/scan quota screens show configuration or sign-in errors rather than fake success.
- Supabase configuration and SQL are required for real registration/login, confirmation, profile persistence, RLS-isolated history, account requests and entitlements. Medical information is optional, removable and excluded from AI personalization. Historical assessments are not recomputed when a profile changes.
- Open Food Facts search/details are real server requests and may fail or lack ingredients. No configured restaurant or homemade recipe dataset exists. Missing information is Unknown/Caution, never proof of safety.
- Gemini needs a valid key/model. Food Lens returns uncertain identities; OCR text requires user correction/review; chat streams bounded context and optionally food preferences only. No model reply is invented when unavailable. AI and deterministic screening are not medical diagnoses or safety guarantees.
- Free accounts have 50 barcode scan attempts per UTC calendar month. The atomic database RPC enforces usage and idempotent scan-event/barcode binding. Scan result routes fail closed when usage cannot be checked; retries of the same event do not charge again. Active Plus grants require privileged administration with an expiry date; users cannot grant themselves Plus.
- Plus shows planned benefits and **Payments not configured**. No provider, price, billing period, renewal contract, checkout, sandbox payment, webhook fulfillment or automatic charge is implemented. The provider interface is preparatory only. No upgrade button grants entitlements.
- Account deletion records a private administrator-processing request; it does **not** immediately remove an Auth user. Apply its migration, and establish an administrator fulfillment process before offering this in production.
- Legal pages are application templates requiring review before a public launch. Physical camera behavior, email delivery, live Gemini, applied SQL/RLS and real checkout cannot be inferred from unit tests.

## Checks and tests

Run `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, then `npm.cmd run build`. Production preview: `npm.cmd run start` → http://localhost:3000.

Browser smoke tests: `npx.cmd playwright install chromium`, then `npm.cmd run test:e2e`. Stop any app already running on port 3000 first (Ctrl+C in its terminal). The tests launch and stop their own localhost:3000 server; they do not reuse another running app. Baseline smoke tests explicitly clear Supabase/Gemini credentials in the child test server and use explicitly synthetic API fixtures only for the profile UI contract and empty search response. They do not claim live database persistence. Optional live auth tests require `E2E_LIVE=1`, `E2E_EMAIL` and `E2E_PASSWORD` in the shell and an isolated test Supabase project. Email-confirmed registration and real onboarding must be tested with that test project's email workflow, never production accounts.

Windows/OneDrive may lock generated `.next` files. Stop owned Next.js servers, delete only the project's generated `.next` directory if locked, and rebuild. Never remove `src`, `.env.local`, database data or user files to fix a build.

Dependency audit currently reports a high-severity `braces` dependency chain in Next's ESLint tooling. npm proposes a breaking downgrade to Next 14 tooling rather than a compatible fix; it has not been force-applied. Recheck `npm audit` before deployment. The report concerns developer tooling, but remains unresolved.

## Login and recovery (Screen 2)
`/login` uses cookie-backed Supabase sessions and verifies the current user before rendering. Existing onboarding Finish payloads in `profiles.preferences` determine completion; missing/incomplete profiles go to `/onboarding/name`, completed profiles to `/home`. Database failures expose retry UI rather than treating the profile as complete.

Allow these redirect URLs in Supabase Auth settings, with corresponding production URLs:
- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/callback?next=/reset-password`

Enable the Google provider and configure its client credentials in Supabase, not this app. In Google Cloud use the Supabase project's OAuth callback URL as the authorized redirect URI. Email confirmations and password-reset links should use the Supabase confirmation URL template, retaining the configured redirect. PKCE links should be opened in the same browser that requested them.

`/forgot-password` requests a reset email; the callback exchanges the code and opens `/reset-password`. Password updates require a valid authenticated session. Email delivery, rate limits, verification requirements and Google availability are controlled by your Supabase project. Missing credentials display an explicit configuration message.

Auth logic tests (Node 24): `node --test tests/auth-flow.test.mjs`. These cover validation, profile completion/routing, profile errors, callback destination restrictions and error guidance. They do not contact Supabase or replace live email/OAuth testing with your credentials.

## Create Account (Screen 3)
`/signup` is a dedicated screen; the existing login component remains intact. Full names support Unicode letters, spaces, apostrophes, dots and hyphens (2–100 characters). Passwords require 10–128 characters with a letter and a number or symbol; Supabase can enforce stronger server-side policies and compromised-password protection.

Signup passes `full_name` in Supabase auth metadata. A confirmation-required response shows inbox guidance and a resend action without assuming a session exists. Confirmation and Google OAuth use the shared PKCE callback. `/onboarding/name` reads the authenticated name metadata; profile drafts and final onboarding values are written under the verified user id during authenticated onboarding. No password is included in profile writes or local storage.

`/terms` and `/privacy` are clearly labeled development drafts that need operator/legal details before public launch.

Run signup and existing auth tests with Node 24: `node --test tests/*.test.mjs`. Live email, confirmation, and Google flows still need your configured Supabase project.

## Profile Setup 1/4 (Screen 4)
`/onboarding/name` now has its own reference-based mobile layout and local SVG illustration. Name and age-range edits are saved immediately in a user-scoped local draft (`aller-onboarding-v1:<user-id>`); demo drafts use a separate key. No birth date is collected, and Prefer not to say is an explicit valid choice.

Next validates both fields, re-verifies the signed-in user, reads existing preferences, and saves `full_name` plus `preferences.onboarding_draft` in the existing RLS-protected profiles table. No SQL migration is needed. Existing preferences are preserved and step 1 does not mark onboarding complete. Cloud save failures keep the form and offer retry; navigation occurs after a successful save. Unconfigured installations explicitly use device-only demo storage.

`/onboarding/diet` opens the existing dietary-preferences step as the next route. Its Back control returns to the dedicated name screen with draft values preserved. Screen 5 has its own dedicated dietary-preferences UI.

Tests: `node --test tests/*.test.mjs` includes age/name validation, draft parsing and user scoping, verified-user writes, preservation of existing preferences, and read/write failure handling.

## Dietary preferences (Screen 5)
`/onboarding/diet` is a dedicated multi-select screen with 50% progress. Other requires a 2–120 character description. Pescatarian with Vegan or Vegetarian prompts a required clarification; it never silently changes selections. Vegan plus Vegetarian is treated as compatible, as are combinations such as Halal and Keto.

Edits persist in `aller-onboarding-diet-v1:<user-id>` device storage (demo uses a separate key). Next re-verifies the user and updates their existing profile's `preferences.diet`, `diet_other`, `diet_clarification`, and onboarding step, preserving other fields. The existing profiles RLS policy applies; the update filters by the verified user and requires a returned row. No migration or service-role key is needed. Cloud errors retain the form and offer retry.

Back returns to `/onboarding/name`. Next opens the existing medical step at `/onboarding/medical`; its dedicated visual refinement is reserved for Screen 6. Diet selections and explanatory text are carried through that bridge into final onboarding save.

## Medical issues (Screen 6)
`/onboarding/medical` provides six optional multi-select cards, 75% progress and an optional Other description. No selection means no disclosure; None is a separate, mutually exclusive choice. Authenticated saves re-verify the user, preserve unrelated preferences, and update only that user's private profile under existing RLS. Cloud read errors block saving until reload, preventing unseen medical choices from being replaced. All fields can be cleared later through Profile → Medical considerations, which opens `?edit=1` and returns to Profile after saving.

Medical information is not written to persistent localStorage. Demo mode uses tab-lifetime sessionStorage and is labeled accordingly. Older medical fields in ordinary browser preferences are removed when this screen opens. Automatic preference attachment has been removed from AI requests; medical conditions are not sent to AI or analytics. Explicit text or photos submitted by a user for AI analysis still go to the configured AI service.

Next routes to `/onboarding/allergies`, which connects the existing fourth onboarding step. Medical values and optional custom text are carried through the final authenticated save. The dedicated Screen 7 design can be implemented separately.

## Allergies (Screen 7)
`/onboarding/allergies` has a complete progress indicator, nine selectable illustrated cards, removable custom-allergy chips, and a native modal dialog with focus trapping, Escape support and focus return. Custom names are normalized, limited to 60 characters and 20 items, and checked for duplicates. No known allergies is explicit and mutually exclusive; selecting it explains and clears existing choices. Empty selections do not silently mean no known allergies.

Finish re-verifies the authenticated user and uses the existing RLS-protected profile row to save `preferences.allergies`, `no_known_allergies`, and `onboarding_completed: true` in one update. The completion flag is in the existing preferences JSONB (no schema migration required). Other steps and medical data are preserved. Login and splash now share the same completion helper, which recognizes this flag and supports legacy completed profiles. Successful Finish routes to `/loading`; failed saves stay on the screen for retry.

Saved authenticated selections restore from Supabase; allergy data is not written to localStorage or automatically sent to AI. Demo selections use sessionStorage and are clearly labeled. Profile → Allergies reopens the screen. The safety note explains that profiles aid screening and cannot guarantee absence of allergens or cross-contact. `/loading` retains the existing loading-screen foundation for the upcoming Screen 8 work.

## Loading and application initialization (Screen 8)
`/loading` renders a local illustrated bowl and a progress bar backed by three real milestones: authenticated session verification, saved profile fetch/validation, and in-memory application-state preparation with a final session identity check. There is no artificial display delay, timer-based percentage or external AI analysis. Animation only decorates completed progress and is disabled for reduced motion.

The root `AppStateProvider` owns the single initialization pipeline in `src/lib/initialization.ts` and deduplicates concurrent calls. It keeps the saved profile, derived food preferences and user-specific history scope in memory; the home greeting consumes that state. It never stores medical data to disk or sends profile data to analytics or AI. Sign-out/account changes clear in-memory state. Failed initialization does not navigate to home; retry runs the pipeline again. A 15-second timeout is only a failure bound, not a minimum delay.

Successful initialization replaces `/loading` with `/home`, so Back does not land on a completed spinner. Unmounted screens ignore late completion and cannot navigate users away. Reloading or revisiting `/loading` re-verifies session and profile state. Signed-out, incomplete, malformed and unconfigured profiles get actionable errors. Demo completion from unconfigured onboarding does not masquerade as authenticated initialization.

Tests include real progress order, session/profile failures, cancellation, account changes, retry and explicit no-known allergy state: `node --test tests/*.test.mjs` (Node 24).

## Home (Screen 9)
`/home` is a dedicated reference-based screen with a mobile layout, desktop preview, actual profile greeting, four feature links and a safe-area-aware fixed bottom navigation. Its content reserves space for the full navigation height and raised Scan action. A route skeleton covers loading; profile and recent-history errors can be retried independently. Unconfigured installations show a clearly labeled empty demo state. Configured signed-out sessions go to Login.

Home reads the authenticated user's `profiles.full_name` and newest three `scan_history` rows through the existing cookie-authenticated Supabase client and RLS policies. No new table or service-role key is used. Product images allow only HTTPS Open Food Facts hosts and fall back to an icon on failure. Risk badges display stored results; absent assessment is Not assessed, never assumed Safe. Saved safe results display No flags with a screening/cross-contact disclaimer.

See all and saved rows link to the same cloud history source at `/history` (up to the latest 100 records); a `scan` query opens that saved record's detail. The existing real product detail Save to history action now writes an authenticated unassessed cloud record when configured. Demo/local records are not represented as cloud scans.

Home search submits `/search?query=...`, with trimming and URL encoding. The existing search UI now preloads that query and performs the real product lookup. The notification bell opens an accessible Recent activity dialog based on saved scans and explicitly states that live notifications are not configured.

Tests cover scoped queries, newest-first limits, independent errors, image URL validation, timestamp formatting, query encoding, unknown risk state, and authenticated saves. Browser navigation QA depends on an available connected browser; HTTP route and rendered-link checks can run locally without one.

## Search Results (Screen 10)
`/search?query=...` is a dedicated reference-based screen with editable query, clear control, filter dialog, category chips, thumbnails with fallback, profile-specific badges and fixed bottom navigation. It fetches up to 24 packaged products per query; category and risk filters apply to that retrieved set. Burger filtering uses actual category tags. Fast Food and Homemade explicitly show unconfigured-dataset states, never invented restaurant or homemade recipes.

`/api/search` calls the server-only shared Open Food Facts adapter and privately loads the authenticated allergy profile. Only the food query goes to Open Food Facts. Personalized responses are private/no-store. `/api/foods` and `/food/[id]` reuse the same adapter and assessment service. Numeric product links work on direct navigation or refresh without sessionStorage.

`src/lib/allergen-assessment.ts` centrally classifies documented matches as Not Safe, precautionary matches as Caution, and missing data/profile or unsupported coverage as Needs verification. Safe means no selected-allergen match in ingredient records marked complete with zero unknown parsed ingredients and English text; the UI explicitly says this does not guarantee absence of allergens or cross-contact. Custom allergies can flag literal matches, but absence of a custom term does not produce Safe. The dictionary is conservative screening, not a medical diagnosis or comprehensive ingredient ontology. A missing or failed profile never produces Safe. Auth changes refresh search assessments.

The source adapter keeps declared allergens, trace warnings, language, parsing completeness and categories separate. Full-text search uses the documented v1-compatible CGI endpoint, not an unsupported v2 full-text query. See [Open Food Facts API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/) and [FSA allergen labelling guidance](https://www.food.gov.uk/news-alerts/news/fsa-publishes-updates-to-best-practice-guidance-on-food-allergen-labelling).

Tests cover absence of ingredients/profile, direct and trace matches, ambiguous negative wording, custom allergens, word boundaries, source completeness, and category provenance. No live credentials or restaurant dataset are fabricated.

## Food Detail (Screen 11)
`/food/[id]` is a reference-based dynamic product page with a large image, favorite toggle, risk card for every assessment state, source-attributed Why evidence, expandable ingredient rows, separate declared-allergen and trace statements, and a horizontally scrolling alternatives section. Back preserves a search query when opened from results. Route-level loading, product-not-found, upstream retry, image fallback and save feedback are included.

Shared assessment evidence attributes declared allergens, recognizable ingredient matches, trace warnings and ambiguous wording to their actual Open Food Facts fields. Every displayed ingredient is labeled as Open Food Facts ingredient text, not independently verified packaging. Missing declarations remain Unknown; incomplete ingredient data never produces Safe.

Alternatives are fetched from a documented shared category and independently assessed against the same current profile. Only complete, Safe-screened candidates are recommended, excluding the current product, duplicates, missing data, conflicting foods and unrelated categories. No alternatives are fabricated. A missing profile, empty result, or upstream outage is explicitly explained. Alternatives stream independently so they do not block the product page.

For existing Supabase installations, apply `supabase/migrations/20261016_favorites.sql` in the SQL editor once. Fresh installs can use the updated `schema.sql`. The favorites table uses a per-user/product primary key and authenticated RLS. The heart restores its saved state on return; missing table setup is surfaced. No database migration was applied remotely by this task.

`POST /api/food/[id]/save` supports favorite, unfavorite and optional history. It authenticates the user, refetches product/profile evidence and computes the assessment server-side; client-supplied risk labels are not trusted. History saves store a dated screening snapshot, not a safety certification. No automatic history writes occur on viewing a product, and medical conditions are not sent to external AI.

`tests/product-detail.test.mjs` includes a clearly marked synthetic burger fixture with declared milk/wheat and possible sesame. It verifies Not Safe plus evidence provenance, ingredient matching, nested ingredient rendering, independently assessed alternatives, scoped favorites and assessed history writes. Test fixtures are never presented as live product records.

## Barcode Scanner (Screen 12)
`/scan/barcode` is an immersive live scanner with an alignment frame, dark overlay, scan/capture control, manual entry and local image upload. `/barcode` redirects to this canonical route, and Home/central Scan links point directly to it. The camera starts only after pressing the scan control, requests video without audio and prefers the environment-facing camera. While live, scanning is automatic; the large control also decodes the current frame. Stop, route exit, tab hiding, pagehide, late permission resolution and failed startup release owned camera tracks and decoder controls.

The installed ZXing browser decoder is lazy-loaded and configured for EAN-13, UPC-A, UPC-E, EAN-8, ITF and Code 128/39. Only numeric retail GTINs with valid 8/12/13/14-digit checksums are looked up; arbitrary QR payloads and non-retail Code 128/39 values are rejected. UPC-E detections are expanded to UPC-A. A locked debounce gate prevents concurrent or repeated detections from causing multiple navigations/lookups.

Manual barcode entry uses the same checksum validation. JPEG/PNG/WebP uploads up to 8 MB decode locally; object URLs are revoked and images are not uploaded. Camera access requires HTTPS or localhost. Permission denied, no device, busy camera, insecure context, unsupported capture and unreadable images have explicit guidance.

Accepted codes navigate to `/scan/result/[barcode]`; that server route performs one cached public product-service lookup and a fresh private allergy-profile assessment through the shared service. It does not duplicate a client lookup first. Route loading provides immediate feedback. Unknown products have no invented ingredients or Safe badge; lookup failures offer retry. Full product details remain available at `/food/[id]`. No history record is silently written by scanning.

Tests exercise GTIN formats/checksums, UPC-E expansion, duplicate suppression, track cleanup, late stream cancellation, error guidance, and actual installed ZXing decoding of a synthetic EAN-13 pixel image. Live camera permission UX and physical-device accuracy require a connected browser/camera. References: [ZXing browser API](https://github.com/zxing-js/browser) and [MDN camera permissions and secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## Barcode Scan Result (Screen 13)
`/scan/result/[barcode]` now has the reference pack-image layout, favorite heart, prominent four-outcome assessment card, ingredients, contextual Why explanation, and real independently screened Similar Alternatives. Green is titled “No known conflicts found in available data,” never presented as a safety guarantee; missing label and cross-contact information are explicitly explained. Identified matches are Not Safe in red, possible traces are Caution, and missing data/profile is Unknown. The Lay's image is not used as a product-data fixture.

Existing product, Supabase profile, favorite and assessment services are reused. The server streams alternatives without blocking the main result; independent alternative cards use conservative No known conflicts wording on this screen. Unknown products do not gain invented ingredients, images or favorites. Upstream failures retain retry and scanner/search navigation.

Genuine scanner navigation now carries a random scan ID with a tab-local pending intent. Authenticated results auto-save once; reload, retry and Back/Forward use idempotent history upsert on the existing UUID primary key. Intents bind to one account to avoid cross-account automatic saves. A direct bookmarked result has an explicit Save scan to history button. Unknown lookups can be recorded as unknown with empty ingredient/allergen fields. Merely opening a product detail page still does not auto-save history.

Favorites use the existing `supabase/migrations/20261016_favorites.sql`; apply it once for an existing installation if not already done. No new migration is needed for scan-history idempotency. All mutations verify the authenticated user and remain under existing RLS. Product and profile evidence is recomputed server-side for saves rather than trusting client labels.

Scan result tests cover four outcome wording, shared-assessment behavior, duplicate suppression, new scans, unknown records, failed writes, account-scoped intent, and secure scan IDs. Live authenticated persistence and device/browser UI testing require credentials and a connected browser.

## Food Lens (Screen 14)
`/food-lens` provides a dark camera view, rear-camera preference with fallback, gallery picker, local preview, Retake and Analyse actions. Camera tracks stop on capture, gallery selection, hidden pages and unmount; late permission results are discarded. Camera use requires HTTPS or localhost. Gallery accepts actual JPG/PNG/WebP files up to 15 MB and 40 megapixels. Both paths resize to a maximum 1600-pixel edge and re-encode to JPEG under 2 MB before sending, removing original metadata.

`POST /api/food-lens` requires an authenticated Supabase user and server-only `GEMINI_API_KEY` (with optional existing `GEMINI_MODEL`). It bounds the request body, validates image signatures, uses structured Gemini output and returns possible food names and uncertain ingredient suggestions only. No allergy profile or medical information is sent. Missing credentials return an explicit unavailable state, with no fabricated identification. Photos are sent to Google only after Analyse; this application does not store them. Review Google's data-use terms for your configured API account before production use.

A user can confirm a possible identity, then open the ingredient-check or barcode route. Guessed photo ingredients never enter the allergen assessment service. Hidden ingredients and cross-contact cannot be ruled out from photographs. Tests cover the shared capture/gallery processing path, image limits/signatures, aspect ratio, and rejecting safety claims in model output. Physical camera permission and live Gemini responses require a device/browser and configured credentials.

## Ingredient Check (Screen 15)
`/ingredients` provides Scan Image and Type Manually tabs with keyboard arrow/Home/End navigation. Camera and gallery label images use the existing bounded local image pipeline. Capture or upload a complete label, then Extract label text. The server-only `/api/ingredients/extract` endpoint requires authentication, verifies actual image signatures and upload limits, and asks Gemini to transcribe visible wording only, marking unreadable spans rather than inferring ingredients. Missing configuration gives an explicit error and manual-entry fallback; no demo OCR text is substituted. The existing Gemini API environment settings are reused.

All extracted text is editable and must be compared with the original label and confirmed before Analyse Ingredients enables. Unreadable markers must be corrected. Manual text follows the same validation/review gate. Only text and its source/review metadata are held in tab-local session storage, with a 30-minute validity window and Clear draft action; no photo or API key is persisted. Storage failures prevent navigation and explain how to retry. The `/ingredients/analysis` handoff validates the reviewed draft and shows the parsed ingredient list; no allergy assessment is claimed on that page. The full Screen 16 assessment design remains for its screen implementation. `/ingredient-check` redirects here for existing links, and the Home tile uses the canonical route.

Automated tests cover manual and OCR review gates, draft expiry, output parsing, unreadable labels, request size/type/signature validation, authentication/configuration failure, network errors and Gemini request construction. Camera/gallery resize tests are shared with Food Lens. Physical camera permission testing and live Gemini transcription need a connected device and credentials. See [Gemini image documentation](https://ai.google.dev/gemini-api/docs/image-understanding) and [generateContent reference](https://ai.google.dev/api/generate-content).

## Ingredient Analysis (Screen 16)
`/ingredients/analysis` reads only a reviewed, unexpired Screen 15 draft, then requests a personalized server assessment from `/api/ingredients/analyze`. The server verifies the session and reads the user's own Supabase allergy profile. It ignores any client-supplied risk or account ID. No allergy/medical data goes to Gemini; optional AI normalization is deliberately unused. Deterministic ingredient matching shares the existing product-screening allergen vocabulary and adds source-aware ingredient rows, precaution scopes, uncertain derivative rules and negative-claim handling.

The screen shows Not Safe for recognized personal allergen matches, Caution for precautionary statements/ambiguous wording/unsupported custom derivatives/missing information, or No known conflict found in provided text. The last outcome requires user confirmation that the text is complete and English. Every match shows the recognized term, allergen and original source fragment. Generic E471/lecithin/modified starch do not acquire invented allergen sources. Wording such as milk-free is treated conservatively. The dictionary is limited and cannot guarantee safety or cross-contact absence. The rules and interface distinguish food-source evidence from potential derivatives; they are not a diagnostic system. See [FDA label guidance](https://www.fda.gov/consumers/consumer-updates/have-food-allergies-read-label) for source declarations and precautionary label context.

Rows scroll independently and support keyboard focus; source text can be corrected in Screen 15. Source confirmations persist for the same draft within its existing 30-minute window. Refresh recomputes against the current account profile rather than trusting a cached risk. Save result writes an assessment snapshot into the existing private `scan_history` table under its existing RLS; retry IDs are scoped to user, profile, draft and method. Result snapshots appear in History with their saved label and explanation. Clear/no-match snapshots use an internal unknown risk for legacy product consumers, with the precise ingredient-only label retained. No migration or new secret is needed.

Tests cover wheat, milk/whey/caseinate, eggs, sesame and soy, nested lists, word boundaries, may-contain and equipment warnings, ambiguous derivatives, negated claims, plant-source names, custom allergies, source-language/completeness gates, expired/unreviewed drafts, authentication, server-side profile selection, recomputation and idempotent history writes. Live authenticated database persistence requires configured Supabase credentials.

## Ask Aller Matrix (Screen 17)
`/chat` is a dedicated cream conversation screen with blue user bubbles, ivory assistant replies, avatars, keyboard-friendly pinned composer, send/stop, retry and clear controls. `/api/chat` authenticates Supabase users, bounds incoming bodies/messages and forwards at most 12 recent turns/10,000 characters to Gemini. Replies use the actual Gemini SSE stream, translated into newline-delimited JSON; sentence-sized output is screened for common absolute-safety/diagnosis claims before display. Failed or truncated responses are marked incomplete and removed from active context rather than silently kept as complete answers. Filters and model instructions reduce risk but cannot establish clinical correctness; users must verify labels and cross-contact information.

Personalization is off by default and includes only allowlisted allergy/diet values from the signed-in user's profile. Name, email, age and medical issues are excluded. Switching personalization off clears prior context. Personalized conversations are not persisted. Other conversations can be remembered in account-scoped tab session storage for up to 24 hours, with an opt-out and Clear action; no chat transcript is stored in Supabase. Only complete assistant replies are persisted. User-entered text is still sent to Google, so the UI explains that it may contain personal information. Keys remain server-only, with existing GEMINI environment settings.

Apply `supabase/migrations/20261016_chat_rate_limits.sql` in the Supabase SQL editor for an existing database. Fresh schema installs include the same function. It creates a private counter table and an authenticated security-definer RPC bound to `auth.uid()`, atomically allowing 10 model requests per minute per account across server instances. No in-memory-only fallback or service key is used. Missing quota configuration fails closed. Gemini's own quotas remain additional limits. No remote migration has been applied by this implementation.

Possible severe-reaction messages receive immediate deterministic emergency-care guidance on both client and server, including when AI is unavailable. This is not a diagnosis. Context: [NHS anaphylaxis guidance](https://www.nhs.uk/conditions/anaphylaxis/). Streaming transport follows the [Gemini generateContent API reference](https://ai.google.dev/api/generate-content).

Tests cover realistic wheat-allergy/substitution chat, streaming packets, output guards, emergency escalation, input/context limits, private preference allowlisting, opt-in profile reads, expired persistence, auth/configuration/network failures and rate-limit responses. Live Gemini replies, applied database quotas and physical mobile layout require configured credentials and a connected browser; no live model reply is fabricated when configuration is absent.

## Scan History (Screen 18)
`/history` now lists real saved checks with product thumbnails (trusted Open Food Facts URLs only), timestamps, method labels and conservative green/yellow/red/gray assessment badges. The server verifies the session, applies both `user_id` filters and existing Supabase RLS, sorts by created time and UUID descending, and fetches 20 records per page with exact filtered counts. Method and outcome filters apply in the database, not only to a loaded page. Selected records are read independently by ID plus owner, so old bookmarks work outside the current page/filter. A missing record and another user's record both appear unavailable.

New product saves distinguish scanner-intent barcode checks from direct product lookups. Reviewed OCR label analyses save method `image`; manual analyses save `ingredients`. Older ingredient records can be identified by existing label provenance; other legacy records explicitly say Method not recorded rather than inventing a capture method. Food Lens dish photographs are not presented as allergy assessments or fabricated saved products. No existing saved snapshot is re-assessed or rewritten by viewing History.

Saved details retain ingredients, allergen text, assessment explanations and stored ingredient findings. Historical assessments include a note that product data and profile changes can affect a new check and that green is not a safety guarantee. Deletion uses a native accessible confirmation dialog with Keep record focused initially, disables duplicate submits, verifies the session server-side, and deletes with both record ID and owner filters. Failures keep the record and show a retryable error. Missing/already-deleted records are handled consistently. Session changes hide old private rows while the server reloads the current account.

The screen includes route loading, empty/filtered-empty/out-of-page states, retry, real pagination, safe-area bottom navigation and image-error fallback. First-time accounts get Scan now, never sample products. Unconfigured Supabase is labeled explicitly. All work uses the existing `scan_history` table and RLS policy; no migration is required for these features.

Tests exercise actual Supabase URL construction for combined JSON filters and pagination, authenticated history saves, owner-scoped reads and detail access, cross-user deletion refusal, error/empty states, snapshots, method handling and deletion route validation. Database behavior is mocked for unit isolation; live RLS enforcement and remote persistence still require a configured Supabase test instance.

## Profile and Plus completion (Screens 19–20)
Profile now has real identity loading, initials avatar, six editable native-dialog settings rows, server-validated partial preference updates and optimistic concurrency protection. Dietary/allergy edits use the same saved fields read by future screening. Medical details can be cleared and never enter AI personalization. The private emergency card contains only user-selected allergy/name/contact/notes fields, with local emergency guidance and no public sharing route. Password reset uses the existing authenticated recovery callback. Sign out clears this device's auth session and tab drafts only after successful sign-out. Account deletion is a durable pending request for administrator handling, not a false immediate deletion success. Apply the account-request migration to use it.

Plus has a dedicated cream/peach bordered crown panel, planned feature list and an explicitly disabled Upgrade button while payments are unconfigured. No price is invented. The entitlement migration provides read-only user plan rows and atomic, UTC-calendar-month barcode usage with event idempotence and barcode binding. New direct result URLs receive a scan ID before quota consumption so reloads retain that event. The scanner shows remaining allowance; backend scan result and barcode API paths verify/consume quota before lookup. Other existing Free features are retained; the full commercial benefit package is planned. No payment/webhook success is claimed.

## Integration verification results
The final implementation contains dedicated routes for all 20 screens, with old aliases redirected instead of serving generic scaffold screens. Local illustrations were checked in `public/illustrations`; product images retain trusted-host and broken-image fallbacks. No runtime synthetic personal/product records are displayed. Missing external setup is explicit.

- Unit suite: 128 passing tests, including profile persistence, independent preference merging, medical removal, emergency-card approval, sign-out failure handling, entitlement validation and SQL quota contract checks.
- Browser smoke suite: 13 passing, 2 intentionally skipped (real test-account login/registration require opt-in credentials). Covers demo onboarding navigation, auth UI, Home routing, empty-search contract, manual barcode validation/navigation, ingredient review gate, profile UI persistence via a labeled synthetic fixture, history filters and disabled checkout. Mobile Profile/Plus screenshots were inspected. These fixtures are test-only and do not prove remote RLS or payments.
- TypeScript/lint/production build are run after edits. No remote migrations or live payment operations were performed. Physical camera accuracy, real email confirmation, live Gemini and remote quota/RLS concurrency still need testing with configured services.

Start: `npm.cmd run dev`, open http://localhost:3000. Test: `npm.cmd test`, `npm.cmd run test:e2e`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.

## QA rerun — 16 October 2026

All 20 screens in the route map above are present in this same project. Legacy aliases redirect to dedicated implementations; old scaffold/bridge components remain unreferenced by active routes (a legacy privacy regression still checks that their storage excludes medical fields). No runtime demo products or personal identities are substituted for missing Supabase data. Synthetic profile/search/OCR responses exist only inside the browser tests and are labeled fixtures.

This pass corrected shared packaged-product matching so a Contains statement after a May contain statement remains a confirmed conflict. It prevents unrelated vegan/free-from wording from suppressing a separate recognized match, retains caution for ambiguous plant-source wording, recognizes buttermilk, and honors declared allergens even when ingredient text is absent. Regression tests cover these cases. This is a limited screening dictionary, not clinical validation. Reference context: [FDA allergen-label guidance](https://www.fda.gov/consumers/consumer-updates/have-food-allergies-read-label).

Food Lens now gives a controlled session-check error if authentication initialization fails. Chat initializes its Supabase connection lazily so its deterministic emergency response does not depend on a database connection. Existing schema/RLS, owner checks, monthly quota locking, upload limits, private storage policies and server-only keys were inspected. No remote schema was applied and no live RLS, quota-concurrency, email, OAuth or Gemini success is claimed.

Current automated coverage: 128 passing Node tests; 13 passing browser tests; 2 live-auth tests skipped without credentials. Browser coverage includes genuine canvas-generated PNG upload/decoding/resizing with mocked AI/OCR responses, simulated camera permission denial with gallery fallback, 390px and 1280px overflow checks, reviewed text gating, auth UI, demo onboarding navigation, Home/search/manual barcode/history routing, profile API-contract editing, and disabled checkout. Physical camera scanning, actual OCR accuracy and medical correctness remain outside these tests.

Default browser testing is isolated from remote credentials even if .env.local is configured. Stop a running localhost:3000 app first, then run npm run test:e2e. For live auth on an isolated test project only, use a fresh terminal:

```powershell
$env:E2E_LIVE = '1'
$env:E2E_EMAIL = 'YOUR_TEST_ACCOUNT_EMAIL'
$env:E2E_PASSWORD = 'YOUR_TEST_ACCOUNT_PASSWORD'
# Optional: a new dedicated address for confirmation-required registration.
$env:E2E_SIGNUP_EMAIL = 'YOUR_NEW_TEST_EMAIL'
npm.cmd run test:e2e -- --workers=1
```

Live mode selects only the real authentication tests, using the test Supabase configuration from the server environment/.env.local. It does not mock authentication or automatically confirm email. Do not use production/personal accounts. Remove these shell variables afterward or close that terminal.

npm ls --depth=0 reports a complete dependency tree, so another npm install was not necessary for this rerun. npm audit --omit=dev reports zero production advisories. The previously documented five high findings are the development ESLint dependency chain rooted in braces; there is no compatible fix advertised by npm. No forced framework/tooling downgrade was applied.

Remaining service limitations: payment processing and webhook fulfillment are not implemented; restaurant/homemade recipe datasets and priority support are planned; account deletion is an administrator-processing request; private Storage persistence is prepared but photo workflows use transient images. Distributed chat limits and barcode quotas require their SQL migrations. AI-photo endpoints authenticate and bound uploads but do not currently share a distributed request-rate limiter.
Production HTTP checks from this rerun: all 20 screen routes returned HTTP 200 with authentication redirects followed, and all three local SVG illustration assets returned 200. Checkout returned the intended 503 unavailable response; an unauthenticated history deletion returned 401. Live Open Food Facts search returned 24 packaged-product results with an unconfigured allergy profile (therefore not a personalized assessment). One initial upstream request returned 502; retry succeeded, and the error path did not fabricate results. Run `node scripts/qa-http-smoke.mjs` while a local server is running to repeat these checks.

Credential-presence checks (values never printed) confirmed that NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and GEMINI_API_KEY are absent in this workspace. E2E authentication credentials are also absent. Consequently, real email/OAuth, private remote profile/history operations, applied RLS/quotas and real Gemini responses were not verified in this run. The setup instructions above are required before using those features as a signed-in user.

Final check outcomes: npm test passes 128 tests; npm run test:e2e passes 13 with 2 explicit live-auth skips; TypeScript, ESLint and production build pass. No current app server was left running by the QA commands.
## Missing database tables after sign-in

A `PGRST205` / missing `public.profiles` response means Supabase Auth is configured but the application schema has not been provisioned. Signed-in users now go to `/setup`, which provides `supabase/setup.sql`, a direct SQL Editor link, and a live table-availability check. Copy the full script into your project SQL Editor and run it, then check the connection and continue to `/login`. The script is transactional and re-runnable: it preserves existing rows, policies and the storage bucket. It does not repair incompatible pre-existing column definitions. The public app key cannot apply database DDL; no secret or service-role key belongs in the browser. Google OAuth credentials must still be configured in the Supabase dashboard.
