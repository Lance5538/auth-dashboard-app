# OCR Improvement Tasks

Use this as the working checklist. Complete one phase before starting the next.

## Global Guardrails

- [ ] Before each phase, analyze the current implementation again.
- [ ] Before editing, list the exact files expected to change.
- [ ] Do not rewrite the whole project.
- [ ] Do not change unrelated features.
- [ ] Keep upload working.
- [ ] Keep OCR working.
- [ ] Keep region selection working.
- [ ] Keep preview working.
- [ ] Keep export working.
- [ ] After each phase, summarize changed files, testing steps, and risks.

## Phase 0: Documentation And Codebase Understanding

Status: completed.

- [x] Inspect OCR frontend entry point: `frontend/src/OcrWorkbench.tsx`.
- [x] Inspect frontend OCR API wrapper: `frontend/src/api.ts`.
- [x] Inspect backend OCR routes/controller/service/schemas.
- [x] Inspect Prisma OCR models.
- [x] Inspect OCR service entry point: `ocr-service/app.py`.
- [x] Create `docs/ocr-improvement-roadmap.md`.
- [x] Create `docs/tasks/ocr-improvement-tasks.md`.
- [x] Avoid application code changes.

Phase 0 changed files:
- `docs/ocr-improvement-roadmap.md`
- `docs/tasks/ocr-improvement-tasks.md`

Phase 0 testing:
- Documentation-only phase; no application build required.
- Confirm docs exist and are readable.

Phase 0 risks:
- Later implementation phases still need fresh code inspection because the OCR workbench is actively changing and currently has uncommitted/untracked work.

## Phase 1: Fixed-Height OCR Result Panel With Scroll/Pagination

Status: not started.

Pre-phase analysis:
- [ ] Re-read current result panel layout in `frontend/src/OcrWorkbench.tsx`.
- [ ] Confirm whether `frontend/src/App.css` is needed.
- [ ] List exact files to change before editing.

Implementation:
- [ ] Keep current-page and batch result modes.
- [ ] Make the result table area fixed-height and internally scrollable.
- [ ] Preserve sticky table headers if feasible.
- [ ] Add pagination only if scroll alone does not handle batch results well.
- [ ] Confirm export button and tabs remain visible.

Verification:
- [ ] Upload/select a document.
- [ ] Draw/apply at least one region.
- [ ] Run OCR.
- [ ] Verify many results scroll inside the result panel.
- [ ] Verify batch results scroll or paginate cleanly.
- [ ] Export XLSX.
- [ ] Run `cd frontend && npm run build`.

Summary after phase:
- [ ] Changed files recorded.
- [ ] Testing steps recorded.
- [ ] Risks recorded.

## Phase 2: Show/Hide Region Labels

Status: not started.

Pre-phase analysis:
- [ ] Re-read field and candidate label rendering in `frontend/src/OcrWorkbench.tsx`.
- [ ] Decide whether candidate labels follow the same toggle.
- [ ] List exact files to change before editing.

Implementation:
- [ ] Add label visibility state.
- [ ] Add a compact UI toggle.
- [ ] Hide field labels without hiding borders or active handles.
- [ ] Preserve candidate-to-region conversion.

Verification:
- [ ] Toggle labels with multiple regions.
- [ ] Move and resize a region while labels are hidden.
- [ ] Convert a candidate to a region.
- [ ] Run OCR and export.
- [ ] Run `cd frontend && npm run build`.

Summary after phase:
- [ ] Changed files recorded.
- [ ] Testing steps recorded.
- [ ] Risks recorded.

## Phase 3: Drag-And-Drop Field Ordering

Status: not started.

Pre-phase analysis:
- [ ] Re-read field list rendering and `persistFieldsForPage` in `frontend/src/OcrWorkbench.tsx`.
- [ ] Confirm extraction, batch extraction, template save, and export use field array order.
- [ ] List exact files to change before editing.

Implementation:
- [ ] Add reorder UI to the field list.
- [ ] Update field arrays and `sortOrder` after reorder.
- [ ] Keep selecting a field separate from dragging/reordering.
- [ ] Preserve saved preset order.

Verification:
- [ ] Reorder fields.
- [ ] Save and apply a preset.
- [ ] Run OCR and confirm result order.
- [ ] Export and confirm column order.
- [ ] Run `cd frontend && npm run build`.

Summary after phase:
- [ ] Changed files recorded.
- [ ] Testing steps recorded.
- [ ] Risks recorded.

## Phase 4: Export Save As Custom Filename

Status: not started.

Pre-phase analysis:
- [ ] Re-read `handleExport` and `downloadWorkbook` in `frontend/src/OcrWorkbench.tsx`.
- [ ] List exact files to change before editing.

Implementation:
- [ ] Prompt or modal for custom filename.
- [ ] Preserve default document and batch filenames.
- [ ] Sanitize invalid filename characters.
- [ ] Append `.xlsx` when missing.
- [ ] Treat cancel as no-op.

Verification:
- [ ] Export current/document results with default name.
- [ ] Export current/document results with custom name.
- [ ] Export batch results with default name.
- [ ] Export batch results with custom name.
- [ ] Run `cd frontend && npm run build`.

Summary after phase:
- [ ] Changed files recorded.
- [ ] Testing steps recorded.
- [ ] Risks recorded.

## Phase 5: Preset Rename, Duplicate, Archive/Delete, Restore

Status: not started.

Pre-phase analysis:
- [ ] Re-read frontend preset save/apply UI.
- [ ] Re-read backend template routes/controller/service/schemas.
- [ ] Re-read Prisma OCR template models.
- [ ] Decide archive vs hard delete behavior.
- [ ] List exact files to change before editing.

Implementation:
- [ ] Add template lifecycle data model support.
- [ ] Add backend validation and service methods.
- [ ] Add API wrapper functions.
- [ ] Add frontend controls for rename, duplicate, archive/delete, and restore.
- [ ] Keep normal preset list focused on active presets.

Verification:
- [ ] Rename a preset.
- [ ] Duplicate a preset and apply the duplicate.
- [ ] Archive/delete a preset and confirm it disappears from the normal list.
- [ ] Restore an archived preset.
- [ ] Run `cd real-time-inventory-system-main/backend && npm run build`.
- [ ] Run `cd frontend && npm run build`.

Summary after phase:
- [ ] Changed files recorded.
- [ ] Testing steps recorded.
- [ ] Risks recorded.

## Phase 6: Multi-Product Classification For Tube/Purlin/Saddle/H Beam/Post

Status: not started.

Pre-phase analysis:
- [ ] Collect sample documents or expected text markers for all five product classes.
- [ ] Decide classification level: document, page, job, result row, or export row.
- [ ] Re-read OCR service recognition output and backend result persistence.
- [ ] List exact files to change before editing.

Implementation:
- [ ] Add product classification type.
- [ ] Implement classification rules or service output.
- [ ] Persist or return classification at the chosen level.
- [ ] Display classification in the workbench.
- [ ] Include classification in export if required.
- [ ] Handle unknown/ambiguous classification.

Verification:
- [ ] Test Tube sample.
- [ ] Test Purlin sample.
- [ ] Test Saddle sample.
- [ ] Test H Beam sample.
- [ ] Test Post sample.
- [ ] Test unknown/ambiguous sample.
- [ ] Run backend/frontend builds as appropriate.
- [ ] Smoke-test OCR service if changed.

Summary after phase:
- [ ] Changed files recorded.
- [ ] Testing steps recorded.
- [ ] Risks recorded.

## Phase 7: Image Size Normalization And Region Alignment

Status: not started.

Pre-phase analysis:
- [ ] Re-read frontend preview sizing for PDF and images.
- [ ] Re-read OCR service PDF/image loading and crop logic.
- [ ] Re-read backend page dimension fields.
- [ ] Identify existing template compatibility needs.
- [ ] List exact files to change before editing.

Implementation:
- [ ] Capture or persist source image/page dimensions where needed.
- [ ] Align frontend normalized boxes with OCR-service crop coordinates.
- [ ] Add compatibility handling for existing normalized templates.
- [ ] Add diagnostics or test fixtures for known coordinate cases.

Verification:
- [ ] Test image upload with known region positions.
- [ ] Test PDF upload with known region positions.
- [ ] Test zoomed preview region selection.
- [ ] Test multi-page PDF.
- [ ] Save/apply template after normalization changes.
- [ ] Run backend/frontend builds and OCR smoke checks as appropriate.

Summary after phase:
- [ ] Changed files recorded.
- [ ] Testing steps recorded.
- [ ] Risks recorded.
