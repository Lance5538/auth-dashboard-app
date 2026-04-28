# OCR Improvement Roadmap

Last updated: 2026-04-27

## Phase Rules

- Phase 0 is documentation and codebase understanding only.
- Do not modify application code during Phase 0.
- After Phase 0, implement one phase at a time.
- Before each implementation phase, re-check the current implementation and list the exact files that need changes.
- Keep each phase scoped; do not rewrite the whole project or change unrelated warehouse features.
- Preserve these core workflows after every phase: upload, OCR, region selection, preview, and export.
- After every phase, summarize changed files, testing steps, and risks.

## Current OCR Implementation

The OCR workflow is centered on `frontend/src/OcrWorkbench.tsx`. It currently owns document upload, page selection, preview rendering, candidate detection, region drawing/moving/resizing, per-page field state, preset save/apply, single-page OCR, batch OCR, result editing, and XLSX export.

Frontend API types and OCR calls live in `frontend/src/api.ts`. The workbench is routed from `frontend/src/Dashboard.tsx` and receives localized text/context from `frontend/src/content.ts`; shell-specific OCR layout styles exist in `frontend/src/App.css`.

The backend OCR API is mounted from `real-time-inventory-system-main/backend/src/app.ts` through `real-time-inventory-system-main/backend/src/modules/ocr/ocr.routes.ts`. The controller delegates to `ocr.service.ts`, validates bodies with `ocr.schemas.ts`, persists uploaded files through `ocr.storage.ts`, validates OCR result values with `ocr.validation.ts`, and stores OCR data through Prisma models in `real-time-inventory-system-main/backend/prisma/schema.prisma`.

The OCR microservice lives in `ocr-service/app.py`. It loads PDF/image pages, runs PaddleOCR detection and recognition, returns normalized bounding boxes, and performs basic quality checks.

## Existing Strengths

- Upload supports PDF/JPG/PNG and stores original files for preview and OCR.
- PDF preview uses `pdfjs-dist`; image preview uses browser image loading.
- Region boxes are normalized coordinates, which is a good base for page-size-independent templates.
- Field state is per page in the frontend, with page-to-page cloning when moving to a new page.
- OCR results can be manually edited and persisted.
- XLSX export is already available for current-document and batch views.

## Current Risks And Constraints

- `OcrWorkbench.tsx` is large and stateful, so later work should be small and regression-tested instead of broad refactors.
- Result panel height is currently user-resizable, but the table body depends on the same grid area and can become awkward with many rows.
- Region labels are always shown on selected regions and candidate labels show when text preview exists; there is no user-controlled label visibility.
- Field order is array order plus `sortOrder`; there is no drag-and-drop or keyboard reorder control.
- Export filenames are currently fixed/derived in code and do not offer Save As naming.
- Presets currently support create/list/get/apply only. Rename, duplicate, archive/delete, and restore will require API and data-model work.
- Product classification for Tube/Purlin/Saddle/H Beam/Post is not modeled in the OCR schema yet.
- The OCR service renders PDFs at a fixed scale, while frontend preview dimensions are browser-rendered; alignment must be handled carefully before region normalization changes.

## Phase Plan

### Phase 0: Understand Codebase And Create Roadmap

Status: planned for this documentation pass.

Scope:
- Read the OCR frontend, backend, Prisma, and OCR service entry points.
- Create `docs/ocr-improvement-roadmap.md`.
- Create `docs/tasks/ocr-improvement-tasks.md`.
- Do not change application code.

Exit criteria:
- The roadmap identifies current architecture, per-phase scope, expected files, verification steps, and risks.
- The task list provides checklists that force one phase at a time.

### Phase 1: Fixed-Height OCR Result Panel With Scroll/Pagination

Goal:
- Make the OCR result area stable and usable when current-page or batch results contain many rows.

Expected files to inspect before implementation:
- `frontend/src/OcrWorkbench.tsx`
- `frontend/src/App.css` only if component-local utility classes are not enough.

Likely change shape:
- Keep the existing bottom result panel and export button.
- Replace or constrain the result table body with a fixed-height scrolling area.
- Add lightweight pagination only if scrolling alone is not sufficient for batch result scale.
- Preserve current-page and batch result tabs.

Verification:
- Upload/select a document, draw/apply regions, run OCR, edit a result, export.
- Generate enough rows to confirm the result panel scrolls without expanding over preview or sidebars.
- Confirm batch results remain readable and exportable.

Risks:
- CSS grid rows, bottom resize behavior, and table sticky headers can conflict.
- Over-constraining height may hide empty/result states or export controls.

### Phase 2: Show/Hide Region Labels

Goal:
- Add a user control to show or hide field labels over the preview without changing the region boxes themselves.

Expected files to inspect before implementation:
- `frontend/src/OcrWorkbench.tsx`

Likely change shape:
- Add a boolean UI state such as `showRegionLabels`.
- Apply it to field labels and decide separately whether candidate text previews should follow the same setting or remain visible.
- Keep selection, moving, resizing, and candidate-to-region conversion unchanged.

Verification:
- Toggle labels with several regions and candidates visible.
- Confirm region borders and active handles remain available when labels are hidden.
- Confirm OCR extraction still sends the same field data.

Risks:
- Labels are currently useful for identifying overlapping fields; hiding them should not make selected state ambiguous.

### Phase 3: Drag-And-Drop Field Ordering

Goal:
- Allow users to reorder OCR fields so extraction, result display, template save, and batch export follow the intended order.

Expected files to inspect before implementation:
- `frontend/src/OcrWorkbench.tsx`
- `frontend/src/api.ts` for type compatibility only.
- `real-time-inventory-system-main/backend/src/modules/ocr/ocr.schemas.ts` only if current `sortOrder` validation blocks the intended data.

Likely change shape:
- Add reorder behavior in the region list.
- Update array order and recompute `sortOrder` through existing field normalization.
- Keep keyboard or button fallback if native drag interactions become brittle.
- Confirm `handleExtract`, `handleBatchExtract`, and `handleSaveTemplate` use the reordered field array.

Verification:
- Reorder fields, save a preset, apply the preset, run OCR, and export.
- Confirm visible numbering, output column order, and XLSX columns match the new order.

Risks:
- Drag events may interfere with selecting a field.
- Existing field IDs are local for unsaved regions, so ordering logic must not depend on persisted IDs.

### Phase 4: Export Save As Custom Filename

Goal:
- Let users choose the XLSX filename before exporting current-page/document or batch OCR results.

Expected files to inspect before implementation:
- `frontend/src/OcrWorkbench.tsx`

Likely change shape:
- Add a Save As prompt or small modal before `downloadWorkbook`.
- Sanitize filename and append `.xlsx` when missing.
- Keep default names: derived document name for document export and `ocr-batch-export.xlsx` for batch export.

Verification:
- Export current/document results with default and custom names.
- Export batch results with default and custom names.
- Confirm cancellation leaves UI state unchanged.

Risks:
- Browser download behavior is controlled by `xlsx.writeFile`; the app can choose the filename but cannot control the native file picker in all browsers.

### Phase 5: Preset Rename, Duplicate, Archive/Delete, Restore

Goal:
- Expand preset lifecycle management without breaking existing save/apply behavior.

Expected files to inspect before implementation:
- `frontend/src/OcrWorkbench.tsx`
- `frontend/src/api.ts`
- `real-time-inventory-system-main/backend/src/modules/ocr/ocr.routes.ts`
- `real-time-inventory-system-main/backend/src/modules/ocr/ocr.controller.ts`
- `real-time-inventory-system-main/backend/src/modules/ocr/ocr.service.ts`
- `real-time-inventory-system-main/backend/src/modules/ocr/ocr.schemas.ts`
- `real-time-inventory-system-main/backend/prisma/schema.prisma`
- A new Prisma migration under `real-time-inventory-system-main/backend/prisma/migrations/`

Likely change shape:
- Add template status or archived timestamp in Prisma.
- Add API endpoints for update/duplicate/archive/restore, or use PATCH/POST route variants consistently.
- Default list should hide archived presets; add UI affordance to view/restore archived presets.
- Keep old templates apply-compatible.

Verification:
- Rename, duplicate, archive/delete, restore, and apply presets.
- Confirm archived presets do not appear in normal selection.
- Run backend TypeScript build and frontend build/lint as available.

Risks:
- Data migrations must preserve existing templates.
- "Delete" should likely mean archive first, with hard delete only if explicitly required later.

### Phase 6: Multi-Product Classification For Tube/Purlin/Saddle/H Beam/Post

Goal:
- Classify OCR documents or rows into product categories: Tube, Purlin, Saddle, H Beam, and Post.

Expected files to inspect before implementation:
- `frontend/src/OcrWorkbench.tsx`
- `frontend/src/api.ts`
- `real-time-inventory-system-main/backend/src/modules/ocr/*`
- `real-time-inventory-system-main/backend/prisma/schema.prisma`
- `ocr-service/app.py`
- Product/inventory modules only if classification must link to existing products.

Likely change shape:
- Decide whether classification is per document, page, extraction job, field/result, or exported row.
- Add a stable enum/type and API response shape.
- Implement deterministic rules first if product strings/markers are available; reserve ML-style classification for a later phase.
- Show classification in the workbench and include it in export when useful.

Verification:
- Test samples for all five product classes.
- Confirm unknown/ambiguous documents are handled without blocking OCR.
- Confirm export includes classification only when defined by the phase design.

Risks:
- Classification requirements are under-specified; this phase needs concrete sample documents and expected outputs before code changes.
- Product naming overlaps can cause false positives, especially "Post" or "H Beam" variants.

### Phase 7: Image Size Normalization And Region Alignment

Goal:
- Make region coordinates reliable across browser preview, PDF render size, OCR-service image size, saved templates, and batch runs.

Expected files to inspect before implementation:
- `frontend/src/OcrWorkbench.tsx`
- `frontend/src/api.ts`
- `real-time-inventory-system-main/backend/src/modules/ocr/ocr.service.ts`
- `real-time-inventory-system-main/backend/src/modules/ocr/ocr.schemas.ts`
- `real-time-inventory-system-main/backend/prisma/schema.prisma`
- `ocr-service/app.py`
- A new Prisma migration if page source dimensions or normalization metadata need persistence.

Likely change shape:
- Persist source page dimensions when a page is loaded or OCR-processed.
- Ensure frontend normalized boxes map to the same rendered page coordinate basis used by OCR recognition.
- Add compatibility handling for existing templates that only have normalized boxes.
- Add tests or diagnostics using known fixed regions on PDF and image samples.

Verification:
- Compare selected region coordinates against OCR service crop coordinates for images and PDFs.
- Test multiple page sizes, zoom levels, and multi-page PDFs.
- Confirm saved templates remain usable.

Risks:
- This is the highest alignment-risk phase because frontend preview, PDF rasterization, and OCR crops can differ.
- A partial normalization change can make existing templates appear correct visually but crop the wrong OCR area.

## Recommended Phase Gates

For every post-Phase-0 implementation phase:

1. Re-read the relevant current files.
2. Write a short "files to change" list before editing.
3. Implement only that phase.
4. Run the smallest meaningful checks:
   - `cd frontend && npm run build` for frontend changes.
   - `cd frontend && npm run lint` when frontend lint issues are in scope.
   - `cd real-time-inventory-system-main/backend && npm run build` for backend changes.
   - OCR service smoke checks only when `ocr-service/app.py` changes.
5. Manually verify upload, preview, region selection, OCR, and export if the change touches the workbench.
6. Summarize changed files, testing, and risks.
