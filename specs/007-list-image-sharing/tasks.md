# Tasks: List Image Generation, Templates, S3 Upload, and Sharing

**Input**: Design documents from `/specs/007-list-image-sharing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Not requested in the feature specification. No test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: All changes within `packages/ui/` (the Next.js web application package)
- Prisma schema: `packages/ui/prisma/schema.prisma`
- API routes: `packages/ui/src/app/api/`
- Components: `packages/ui/src/components/`
- Lib modules: `packages/ui/src/lib/`
- Fonts: `packages/ui/fonts/`

---

## Phase 1: Setup

**Purpose**: Install dependencies, configure tooling, add fonts

- [X] T001 Install satori, @resvg/resvg-js, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner in `packages/ui/package.json`
- [X] T002 [P] Add `@resvg/resvg-js` to `serverExternalPackages` in `packages/ui/next.config.ts`
- [X] T003 [P] Download Inter-Regular.ttf and Inter-Bold.ttf to `packages/ui/fonts/` directory

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, S3 client, font loader, size presets, template types — infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add `ImageStatus` enum and image fields to `List` model in `packages/ui/prisma/schema.prisma` per data-model.md
- [X] T005 Generate and apply Prisma migration for image fields (`npx prisma migrate dev --name add_list_image_fields`)
- [X] T006 [P] Create S3 client singleton, `uploadImage()`, and `getSignedImageUrl()` in `packages/ui/src/lib/s3.ts`
- [X] T007 [P] Create font loader with module-scope caching in `packages/ui/src/lib/image-generator/fonts.ts` (load Inter TTFs via `fs.readFile`, cache as ArrayBuffers)
- [X] T008 [P] Create size preset constants (`SIZE_PRESETS.og = 1200x630`, `SIZE_PRESETS.square = 1080x1080`) in `packages/ui/src/lib/image-generator/presets.ts`
- [X] T009 [P] Create template registry types (`TemplateRegistryEntry`, `TemplateProps`, `CoverAsset`, `SlotSpec`) and registry map in `packages/ui/src/lib/image-generator/templates/registry.ts`
- [X] T010 [P] Create social share URL generator (`generateShareUrl()` for X, Facebook, Reddit, LinkedIn) in `packages/ui/src/lib/share.ts`

**Checkpoint**: Foundation ready — S3 client, fonts, presets, types, and database schema in place

---

## Phase 3: User Story 1 — Template Selection & Image Generation (Priority: P1) 🎯 MVP

**Goal**: Users can select an image template, and saving a list generates OG and Square PNG images uploaded to S3

**Independent Test**: Create a new list, select a template, save it. Verify S3 contains both `og.png` and `square.png` under the correct versioned path. Check the list record in DB has `imageStatus = READY` and S3 keys populated.

### Implementation for User Story 1

- [X] T011 [P] [US1] Create Grid 3x3 template component (9 book covers in a 3x3 grid with title/username) in `packages/ui/src/lib/image-generator/templates/grid-3x3.tsx`
- [X] T012 [P] [US1] Create Hero template component (1 large cover + 3 smaller in a strip with title/username) in `packages/ui/src/lib/image-generator/templates/hero.tsx`
- [X] T013 [P] [US1] Create Minimal Banner template component (text-focused with 3 covers on the side) in `packages/ui/src/lib/image-generator/templates/minimal-banner.tsx`
- [X] T014 [US1] Implement cover fetching pipeline (fetch remote images, convert to base64 data URLs, placeholder generation for missing covers) in `packages/ui/src/lib/image-generator/covers.ts`
- [X] T015 [US1] Implement Satori SVG render + Resvg PNG conversion pipeline in `packages/ui/src/lib/image-generator/render.ts` (depends on T007 for fonts)
- [X] T016 [US1] Implement `generateListImages()` orchestrator in `packages/ui/src/lib/image-generator/generateListImages.ts` (coordinates template selection, cover fetching, rendering for both OG and Square sizes, returns PNG buffers)
- [X] T017 [US1] Create template picker UI component with live preview in `packages/ui/src/components/lists/template-picker.tsx`
- [X] T018 [US1] Create `GET /api/templates` endpoint returning available templates in `packages/ui/src/app/api/templates/route.ts`
- [X] T019 [US1] Modify `POST /api/lists` to accept `imageTemplateId`, trigger image generation after list creation, and upload to S3 in `packages/ui/src/app/api/lists/route.ts`
- [X] T020 [US1] Integrate template picker into create list form in `packages/ui/src/components/lists/create-list-form.tsx` (add template selection step, send `imageTemplateId` on save)
- [X] T021 [US1] Modify `GET /api/lists/[listId]` to include image fields and generate presigned URLs for image keys in `packages/ui/src/app/api/lists/[listId]/route.ts`

**Checkpoint**: Creating a list with a template generates images, uploads to S3, and stores keys in DB

---

## Phase 4: User Story 2 — List View Header Image (Priority: P2)

**Goal**: The public list view displays the generated image as a header above the list details

**Independent Test**: Navigate to a public list page (`/{username}/lists/{listId}`). Verify the generated image appears above the list title and content. Verify lists without images show no broken image.

### Implementation for User Story 2

- [X] T022 [P] [US2] Create list image header component (shows generated image with loading/error/empty states) in `packages/ui/src/components/lists/list-image-header.tsx`
- [X] T023 [US2] Create `GET /api/lists/[listId]/og-image` proxy route (302 redirect to presigned S3 URL, fallback to 404) in `packages/ui/src/app/api/lists/[listId]/og-image/route.ts`
- [X] T024 [P] [US2] Create `GET /api/lists/[listId]/square-image` proxy route (same pattern as og-image) in `packages/ui/src/app/api/lists/[listId]/square-image/route.ts`
- [X] T025 [US2] Modify public list page to fetch image status and display `ListImageHeader` above list content in `packages/ui/src/app/[username]/lists/[listId]/page.tsx`
- [X] T026 [US2] Modify `GET /api/users/[username]/lists/[listId]` to include `imageStatus` and proxy image URLs in response in `packages/ui/src/app/api/users/[username]/lists/[listId]/route.ts`

**Checkpoint**: Public list pages show the generated header image

---

## Phase 5: User Story 3 — Share Modal (Priority: P3)

**Goal**: Users can share their list via copy link, image downloads, and social platform shortcuts

**Independent Test**: Open a public list page with a generated image. Click the Share button. Verify: copy link works, OG and Square download links work, social share buttons open correct URLs in new tabs.

### Implementation for User Story 3

- [X] T027 [US3] Create share modal component with copy link, download OG/Square buttons, and social share links (X, Facebook, Reddit, LinkedIn) in `packages/ui/src/components/lists/share-modal.tsx`
- [X] T028 [US3] Add share button to public list view that opens the share modal in `packages/ui/src/app/[username]/lists/[listId]/page.tsx`
- [X] T029 [US3] Add share button to the list management/edit page in `packages/ui/src/components/lists/list-card.tsx`

**Checkpoint**: Users can share lists via multiple channels with image downloads

---

## Phase 6: User Story 4 — OG Metadata for Social Previews (Priority: P4)

**Goal**: Shared list links show rich previews with the generated OG image on social platforms

**Independent Test**: Copy a public list URL. Paste into X Card Validator, Facebook Sharing Debugger, or LinkedIn Post Inspector. Verify the OG image, title, and description appear correctly.

### Implementation for User Story 4

- [X] T030 [US4] Update `generateMetadata()` in public list page to include `openGraph.images` (pointing to `/api/lists/[id]/og-image`), `twitter.card = "summary_large_image"`, and dynamic title/description in `packages/ui/src/app/[username]/lists/[listId]/page.tsx`

**Checkpoint**: Social media link previews show the correct OG image and metadata

---

## Phase 7: User Story 5 — Edit List Regeneration (Priority: P5)

**Goal**: Editing a list's content, template, or order can trigger image regeneration with versioned S3 paths

**Independent Test**: Edit an existing list (change title or reorder books). Save with regeneration enabled. Verify `imageVersion` incremented, new S3 keys generated, old images still accessible at old version path.

### Implementation for User Story 5

- [X] T031 [US5] Modify `PUT /api/lists/[listId]` to accept `imageTemplateId` and `regenerateImage` flag, detect content changes, increment `imageVersion`, and trigger regeneration in `packages/ui/src/app/api/lists/[listId]/route.ts`
- [X] T032 [US5] Create `POST /api/lists/[listId]/regenerate-images` endpoint with cooldown enforcement (30s) in `packages/ui/src/app/api/lists/[listId]/regenerate-images/route.ts`
- [X] T033 [US5] Integrate template picker and regenerate controls into the edit list form (show current template, allow change, checkbox for regeneration) in `packages/ui/src/app/(authenticated)/lists/[listId]/edit/edit-list-client.tsx`
- [X] T034 [US5] Add image status display and manual retry button to edit page for failed generations in `packages/ui/src/app/(authenticated)/lists/[listId]/edit/edit-list-client.tsx`

**Checkpoint**: Editing lists triggers regeneration with proper versioning and cooldown

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T035 [P] Add `.env.example` entries for `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET` in `packages/ui/.env.example`
- [X] T036 [P] Add `packages/ui/fonts/` to `.gitignore` or ensure font files are committed (decide based on repo policy)
- [X] T037 Verify image generation works end-to-end: create list → generate → view on public page → share → check OG preview
- [X] T038 Handle edge cases: lists with 0 books (skip generation), lists with fewer books than template slots (placeholder tiles), cover fetch timeouts (placeholder fallback)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion — BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Foundational (Phase 2) completion
  - US1 (Phase 3) must complete before US2-US5 (image generation is needed for all others)
  - US2 (Phase 4) can run after US1
  - US3 (Phase 5) can run after US2 (needs image proxy routes from US2)
  - US4 (Phase 6) can run after US2 (needs OG proxy route from US2)
  - US5 (Phase 7) can run after US1 (only needs generation pipeline, not display)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Template Selection & Generation)**: Foundational → US1 (core pipeline, must be first)
- **US2 (Header Image Display)**: US1 → US2 (needs generated images to display)
- **US3 (Share Modal)**: US2 → US3 (needs image proxy routes for downloads)
- **US4 (OG Metadata)**: US2 → US4 (needs OG proxy route)
- **US5 (Edit Regeneration)**: US1 → US5 (needs generation pipeline; can run parallel with US2-US4)

### Within Each User Story

- Templates (T011-T013) before orchestrator (T016)
- Cover pipeline (T014) and render pipeline (T015) before orchestrator (T016)
- API endpoints before UI components that consume them
- Backend changes before frontend integration

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2**: T006, T007, T008, T009, T010 can ALL run in parallel
- **Phase 3 (US1)**: T011, T012, T013 can run in parallel (3 template components); T014 and T015 can run in parallel
- **Phase 4 (US2)**: T022, T023, T024 can run in parallel
- **Phase 5 (US3)**: T027 independent
- **Phase 7 (US5)**: T031 and T032 are sequential but T033 and T034 can be done together
- **Phase 8**: T035 and T036 can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all foundational tasks in parallel (different files, no dependencies):
Task: "Create S3 client in packages/ui/src/lib/s3.ts"
Task: "Create font loader in packages/ui/src/lib/image-generator/fonts.ts"
Task: "Create size presets in packages/ui/src/lib/image-generator/presets.ts"
Task: "Create template registry types in packages/ui/src/lib/image-generator/templates/registry.ts"
Task: "Create share URL generator in packages/ui/src/lib/share.ts"
```

## Parallel Example: US1 Templates

```bash
# Launch all 3 template components in parallel:
Task: "Create Grid 3x3 template in packages/ui/src/lib/image-generator/templates/grid-3x3.tsx"
Task: "Create Hero template in packages/ui/src/lib/image-generator/templates/hero.tsx"
Task: "Create Minimal Banner template in packages/ui/src/lib/image-generator/templates/minimal-banner.tsx"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: US1 - Template Selection & Image Generation (T011-T021)
4. **STOP and VALIDATE**: Create a list with a template. Verify images in S3 and DB status = READY.
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Generation) → Images generated on list save (MVP!)
3. US2 (Header) → Images visible on public pages
4. US3 (Share) → Users can share lists with downloads
5. US4 (OG Meta) → Social preview cards work
6. US5 (Regeneration) → Edit flow triggers re-generation
7. Polish → Edge cases and env var documentation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Satori templates must use flexbox only, no hooks, explicit image dimensions
- Font files are TTF format (NOT WOFF2 — Satori limitation)
- All cover images must be pre-fetched and base64-encoded before passing to Satori
- `@resvg/resvg-js` requires `serverExternalPackages` in Next.js config
- OG images served via proxy route (302 redirect) to avoid expired presigned URLs in meta tags
- Regeneration has a 30-second cooldown per list
- Failed generation does NOT block list save — graceful degradation
