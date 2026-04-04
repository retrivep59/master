# SceneWeaver — QA Test Plan

**Project:** SceneWeaver — Multi-Image Story Sequencer  
**Branch:** claude/nsfw-image-video-generator-BIDJC  
**Date:** 2026-04-04  
**QA Engineer:** QA Agent

---

## Overview

SceneWeaver allows users to upload 2–8 images, arrange them into scenes, configure per-scene motion templates and captions, select a story mood, and generate a stitched MP4 narrative video. This test plan covers functional correctness, state management, UI behavior, error handling, and accessibility across all major user flows.

---

## Test Environment

- **Framework:** Next.js (see node_modules/next/dist/docs/ for version-specific behavior)
- **Browser Targets:** Chrome (latest), Firefox (latest), Safari (latest), Mobile Safari (iOS), Chrome Android
- **Screen Sizes:** 375px (mobile), 768px (tablet), 1280px (desktop), 1920px (wide)
- **Build Verification:** `npm run build` must exit with zero errors

---

## Test Suite 1 — Scene Upload

### TC-001: Valid image upload (single file)
**Precondition:** SceneWeaver page loaded at /scene-weaver, zero scenes present  
**Steps:**
1. Drop a valid JPEG file onto the scene strip dropzone
2. Observe the scene strip

**Expected:**
- Scene card appears in strip with image thumbnail
- Scene count increments to 1
- Scene status badge shows "idle"
- No error message displayed

---

### TC-002: Valid image upload (multiple files simultaneously)
**Precondition:** Zero scenes present  
**Steps:**
1. Select 5 valid PNG files via the file picker simultaneously
2. Observe the scene strip

**Expected:**
- 5 scene cards appear, each with correct thumbnail
- Scene count shows 5
- All scenes in "idle" status
- Order matches selection order

---

### TC-003: Upload with invalid file type
**Precondition:** Zero scenes present  
**Steps:**
1. Attempt to drop a `.pdf` file onto the dropzone
2. Attempt to drop a `.mp4` file onto the dropzone
3. Attempt to drop a `.txt` file onto the dropzone

**Expected:**
- No scene card is created for any invalid file
- An error or warning message is shown indicating accepted types (e.g., "Only image files are accepted")
- Scene count remains 0
- Dropzone visually rejects the file (e.g., red border or shake animation)

---

### TC-004: Upload exactly 8 scenes (maximum boundary)
**Precondition:** Zero scenes present  
**Steps:**
1. Upload exactly 8 valid image files

**Expected:**
- All 8 scene cards appear in the strip
- The dropzone is disabled or shows "Maximum scenes reached" message
- Scene count shows 8/8

---

### TC-005: Attempt to exceed 8 scenes
**Precondition:** 8 scenes already uploaded  
**Steps:**
1. Attempt to drop a 9th image file onto the dropzone

**Expected:**
- 9th image is rejected
- Error message: "Maximum of 8 scenes reached. Remove a scene to add more." (or equivalent)
- Scene count stays at 8
- Existing 8 scenes are unaffected

---

### TC-006: Upload with 1 image (below minimum)
**Precondition:** Zero scenes present  
**Steps:**
1. Upload exactly 1 valid image

**Expected:**
- Scene card appears in strip
- Generate button is disabled
- UI hint indicates minimum of 2 scenes required (e.g., "Add at least 2 scenes to generate")

---

### TC-007: Upload exactly 2 images (minimum boundary)
**Precondition:** Zero scenes present  
**Steps:**
1. Upload exactly 2 valid images

**Expected:**
- Both scene cards appear
- Generate button becomes enabled
- No minimum-scenes warning shown

---

## Test Suite 2 — Drag Reorder

### TC-008: Move scene from position 1 to position 3
**Precondition:** 4 scenes uploaded in order [A, B, C, D]  
**Steps:**
1. Grab scene card at position 1 (scene A) via drag handle
2. Drag it to position 3 (between B and C)
3. Drop it

**Expected:**
- Scene strip order updates to [B, C, A, D]
- No duplicate scene cards
- No scene cards disappear
- Scene A thumbnail and metadata remain correct
- Internal state (Story.scenes array) reflects new order

---

### TC-009: Move scene from last to first position
**Precondition:** 3 scenes [A, B, C]  
**Steps:**
1. Drag scene C to position 1 (before A)
2. Drop it

**Expected:**
- Order becomes [C, A, B]
- State updates correctly

---

### TC-010: Drag scene and cancel (drop outside valid area)
**Precondition:** 3 scenes [A, B, C]  
**Steps:**
1. Begin dragging scene B
2. Move cursor outside the scene strip
3. Release mouse

**Expected:**
- Order remains [A, B, C] unchanged
- No error thrown
- UI returns to normal state

---

### TC-011: Drag reorder with scene in "generating" status
**Precondition:** 3 scenes, scene 2 has status "generating"  
**Steps:**
1. Attempt to drag scene 2 while it is generating

**Expected:**
- Either drag is prevented (disabled drag handle) with user feedback, OR
- Drag succeeds and generation continues with updated position
- In either case: no crash, no data loss

---

## Test Suite 3 — Scene Editor

### TC-012: Open scene editor
**Precondition:** 1 scene uploaded  
**Steps:**
1. Click the "Edit" button on a scene card

**Expected:**
- Scene editor panel slides out (right panel)
- Panel displays current scene values: template, caption, duration
- Other UI remains accessible (not fully blocked)

---

### TC-013: Change motion template
**Precondition:** Scene editor open for scene 1, template set to default  
**Steps:**
1. Click a different motion template in the template picker

**Expected:**
- Template picker highlights the selected option
- Scene card in the strip updates to reflect new template (badge or label)
- Story state (scenes[0].templateId) updates to new value
- No page reload or loss of other scene data

---

### TC-014: Change caption text
**Precondition:** Scene editor open, caption is empty  
**Steps:**
1. Type "A moonlit encounter" in the caption input field

**Expected:**
- Caption field shows typed text
- Scene card in the strip shows caption preview "A moonlit encounter"
- Story state (scenes[0].caption) updates in real time
- Caption persists when editor is closed and reopened

---

### TC-015: Change duration value
**Precondition:** Scene editor open, duration is 2 seconds  
**Steps:**
1. Click duration toggle to select 4 seconds
2. Click duration toggle to select 6 seconds
3. Click duration toggle to select 2 seconds again

**Expected:**
- Each click updates the selected duration visually
- Story state (scenes[0].duration) reflects 2 | 4 | 6 as typed in the interface
- Duration change does not reset caption or template

---

### TC-016: Scene editor state persists across scene switches
**Precondition:** 3 scenes; scene 1 has caption "Hello", scene 2 has caption ""  
**Steps:**
1. Open editor for scene 1, verify caption "Hello"
2. Close editor
3. Open editor for scene 2
4. Close editor
5. Open editor for scene 1 again

**Expected:**
- Scene 1 caption still shows "Hello"
- No data bleed between scenes

---

### TC-017: Scene editor close button
**Precondition:** Scene editor is open  
**Steps:**
1. Click the close/dismiss button on the scene editor panel

**Expected:**
- Panel closes (slides back or hides)
- Main view (scene strip, mood selector) is fully accessible again

---

## Test Suite 4 — Mood Selector

### TC-018: Select each mood — Romantic
**Precondition:** Default mood loaded  
**Steps:**
1. Click the "Romantic" mood button

**Expected:**
- Romantic button is highlighted/selected
- UI accent color changes to rose (#f43f5e) — applies to borders, buttons, glow effects
- Story state (mood) set to "romantic"
- Previously selected mood button deselects

---

### TC-019: Select each mood — Dominant
**Steps:**
1. Click the "Dominant" mood button

**Expected:**
- Dominant button selected
- Accent color changes to deep red (#7f1d1d)
- Story state mood = "dominant"

---

### TC-020: Select each mood — Playful
**Steps:**
1. Click "Playful" mood button

**Expected:**
- Accent color changes to violet (#7c3aed)
- Story state mood = "playful"

---

### TC-021: Select each mood — Fantasy
**Steps:**
1. Click "Fantasy" mood button

**Expected:**
- Accent color changes to purple/teal (#6d28d9)
- Story state mood = "fantasy"

---

### TC-022: Select each mood — Intense
**Steps:**
1. Click "Intense" mood button

**Expected:**
- Accent color changes to orange (#ea580c)
- Story state mood = "intense"

---

### TC-023: Mood persists after scene changes
**Precondition:** Mood set to "Fantasy"  
**Steps:**
1. Upload an additional scene
2. Reorder scenes
3. Edit a scene's caption

**Expected:**
- Mood remains "Fantasy" throughout
- Accent color does not reset
- Fantasy button remains selected

---

## Test Suite 5 — Generate Button State

### TC-024: Generate button disabled with 0 scenes
**Precondition:** No scenes uploaded  
**Steps:**
1. Observe the Generate button

**Expected:**
- Button is visually disabled (grayed out, cursor: not-allowed)
- Button has aria-disabled="true" or is rendered as disabled
- Clicking the button does nothing (no API call, no state change)

---

### TC-025: Generate button disabled with 1 scene
**Precondition:** Exactly 1 scene uploaded  
**Steps:**
1. Observe the Generate button

**Expected:**
- Button remains disabled
- Tooltip or helper text: "Add at least 2 scenes to generate your story"

---

### TC-026: Generate button enabled with exactly 2 scenes
**Precondition:** Exactly 2 scenes uploaded  
**Steps:**
1. Observe the Generate button

**Expected:**
- Button becomes enabled (full color, pointer cursor)
- aria-disabled is removed or set to "false"
- No blocking tooltip

---

### TC-027: Generate button enabled with 8 scenes
**Precondition:** Maximum 8 scenes uploaded  
**Steps:**
1. Observe the Generate button

**Expected:**
- Button is enabled
- No error or warning about scene count

---

### TC-028: Generate button disabled during active generation
**Precondition:** 3 scenes uploaded, generation in progress  
**Steps:**
1. Click Generate to start generation
2. Observe the button during generation

**Expected:**
- Button becomes disabled (or shows a "Stop" / "Cancel" control)
- Cannot click to start a second parallel generation
- Loading indicator or spinner visible

---

## Test Suite 6 — Generation Pipeline State Transitions

### TC-029: Full pipeline — idle → generating → stitching → done
**Precondition:** 3 scenes uploaded, mood selected, all scenes configured  
**Steps:**
1. Click the Generate button
2. Observe Story.status and SceneProgress UI throughout

**Expected state transitions:**
- **idle:** Initial state before clicking Generate
- **generating:** Story.status = "generating"; each scene transitions idle → generating → done in sequence (or parallel)
- **stitching:** After all scenes have videoUrl, Story.status = "stitching"; SceneProgress shows stitching indicator
- **done:** Story.status = "done"; StoryOutput component renders with finalVideoUrl; video player is visible

---

### TC-030: Per-scene status transitions
**Precondition:** 5 scenes uploaded  
**Steps:**
1. Click Generate
2. Observe each SceneCard's status badge

**Expected:**
- Each scene starts at "idle"
- Transitions to "generating" when its API call begins
- Transitions to "done" when videoUrl is received
- Progress indicators (spinner, progress bar) visible during "generating"
- Green checkmark or "done" badge visible after completion

---

### TC-031: SceneProgress timeline reflects live state
**Precondition:** 4 scenes, generation in progress  
**Steps:**
1. Monitor the SceneProgress vertical timeline during generation

**Expected:**
- Each row corresponds to a scene in order
- Completed scenes show a "done" icon
- Current scene shows an active/spinning indicator
- Pending scenes show a waiting icon
- Timeline updates in real time without page refresh

---

## Test Suite 7 — Error Handling

### TC-032: API failure on scene 3 of 5
**Precondition:** 5 scenes uploaded; mock scene 3 API call to return 500 error  
**Steps:**
1. Click Generate
2. Observe behavior when scene 3 fails

**Expected:**
- Scene 3 status updates to "error"
- Scene 3 card shows error badge and error message (e.g., "Generation failed")
- scenes[2].error is populated with error string
- Scenes 1, 2, 4, 5 continue processing unaffected (not cancelled)
- Scenes 1, 2, 4, 5 that complete successfully receive their videoUrl
- Story.status does NOT transition to "done" — it transitions to "error"
- StoryOutput does not render a final video (since stitching cannot complete with missing clip)
- User is shown a clear error message indicating which scene failed and offering retry or edit

---

### TC-033: API failure on all scenes
**Precondition:** 3 scenes; mock all API calls to fail  
**Steps:**
1. Click Generate
2. All 3 scene API calls return errors

**Expected:**
- All 3 scenes show "error" status
- Story.status = "error"
- A global error message is displayed
- Generate button re-enables to allow retry
- No video player or download button is shown

---

### TC-034: Network loss during generation
**Precondition:** 3 scenes, generation started; disable network mid-generation  
**Steps:**
1. Click Generate
2. After scene 1 completes, disable network
3. Observe scenes 2 and 3

**Expected:**
- Scenes 2 and 3 receive a network error (ERR_NETWORK or equivalent)
- Their status transitions to "error"
- Error messages are surfaced to the user
- Application does not hang indefinitely
- Timeout or retry logic visible (if implemented per spec)

---

### TC-035: Stitch API failure
**Precondition:** All 5 scenes generated successfully; stitch API call returns error  
**Steps:**
1. Generate completes for all scenes
2. Stitch request fails

**Expected:**
- Story.status = "error" (not "done")
- Error message displayed: "Failed to stitch scenes into final video"
- Individual scene videoUrls remain intact
- Retry option available

---

### TC-036: Upload rejected — file size limit
**Precondition:** File size limit enforced (per spec: "size limits enforced")  
**Steps:**
1. Attempt to upload an image exceeding the size limit (e.g., 50MB file)

**Expected:**
- File is rejected before upload begins
- Error message displayed with limit (e.g., "File exceeds maximum size of X MB")
- No scene card created

---

## Test Suite 8 — Final Video Player

### TC-037: Video player renders after successful generation
**Precondition:** Generation pipeline completes (status = "done"), finalVideoUrl is set  
**Steps:**
1. Observe the StoryOutput component

**Expected:**
- HTML5 video element is rendered
- Video source is set to finalVideoUrl
- Video loads without error
- Player dimensions are appropriate (full-width per spec)

---

### TC-038: Video player shows controls
**Precondition:** Story status = "done", video player visible  
**Steps:**
1. Observe video player controls

**Expected:**
- Native or custom controls visible: play/pause, seek bar, volume, fullscreen
- Controls respond to user interaction
- Keyboard accessible (Space = play/pause, arrow keys = seek)

---

### TC-039: Video player autoplay behavior
**Precondition:** Story status = "done"  
**Steps:**
1. Note whether video autoplays on load

**Expected:**
- If autoplay is implemented: video begins playing automatically when finalVideoUrl is set
- Autoplay must be muted by default (browser policy compliance)
- If autoplay is not implemented: play button is prominent and clearly labeled

---

### TC-040: Video player loop behavior
**Precondition:** Video is playing  
**Steps:**
1. Allow video to play to the end

**Expected:**
- Video loops back to the beginning automatically (loop attribute set)
- No blank screen or error at end of clip

---

### TC-041: Video player does not render before generation
**Precondition:** Story status = "idle" or "generating"  
**Steps:**
1. Observe StoryOutput area before generation completes

**Expected:**
- Video player is hidden or replaced by a placeholder/status message
- No broken video element or missing src

---

## Test Suite 9 — Download Button

### TC-042: Download button triggers file download
**Precondition:** Story status = "done", finalVideoUrl is set  
**Steps:**
1. Click the Download button in StoryOutput

**Expected:**
- Browser initiates a file download
- Downloaded file is named appropriately (e.g., "scene-weaver-story.mp4" or timestamp-based)
- File is a valid MP4 (not corrupted, plays in media player)
- Download does not navigate away from the page

---

### TC-043: Download button not visible before completion
**Precondition:** Story status = "idle", "generating", or "stitching"  
**Steps:**
1. Observe StoryOutput area

**Expected:**
- Download button is not rendered or is disabled
- No orphan download anchor tags in DOM

---

### TC-044: Download button accessibility
**Precondition:** Download button visible  
**Steps:**
1. Tab to the download button using keyboard
2. Press Enter to activate

**Expected:**
- Button is reachable via Tab key
- aria-label set (e.g., "Download your story as MP4")
- Activating with Enter triggers download

---

## Test Suite 10 — Header Navigation

### TC-045: "Story Mode" link navigates to /scene-weaver
**Precondition:** Main application header loaded  
**Steps:**
1. Locate "Story Mode" link in the header navigation
2. Verify the "NEW" badge is visible next to the link
3. Click "Story Mode"

**Expected:**
- Browser navigates to /scene-weaver
- SceneWeaver page loads correctly
- No 404 error
- Back button returns to previous page

---

### TC-046: "Story Mode" link is keyboard accessible
**Precondition:** Main header visible  
**Steps:**
1. Tab through header navigation items
2. Reach "Story Mode" link
3. Press Enter

**Expected:**
- Link is focusable via Tab
- Enter key triggers navigation
- Focus indicator is visible on the link

---

### TC-047: /scene-weaver route renders correct page
**Precondition:** Direct URL navigation to /scene-weaver  
**Steps:**
1. Navigate directly to /scene-weaver in the browser

**Expected:**
- SceneWeaverApp renders
- Page title reflects SceneWeaver
- Scene strip and controls are visible
- No hydration errors in console

---

## Test Suite 11 — Mobile Responsiveness

### TC-048: Scene strip scrolls horizontally on small screens
**Precondition:** Viewport set to 375px wide (mobile), 4+ scenes uploaded  
**Steps:**
1. Load /scene-weaver on 375px viewport
2. Observe the scene strip
3. Attempt to scroll horizontally in the strip area

**Expected:**
- Scene strip is horizontally scrollable (overflow-x: auto or scroll)
- All scene cards are accessible by scrolling (no cards clipped or hidden)
- Vertical page scroll is not interfered with by horizontal strip scroll
- Scrollbar or scroll indicator is visible (touch-friendly)

---

### TC-049: Mobile layout — single column
**Precondition:** Viewport 375px wide  
**Steps:**
1. Load /scene-weaver
2. Observe overall layout

**Expected:**
- Scene strip appears as a horizontal row at top
- Scene editor (if open) takes full width or bottom sheet on mobile
- Mood selector wraps or stacks appropriately
- Generate button is full width and easily tappable (min 44px height)
- No horizontal overflow on the main page (no accidental x-scroll on body)

---

### TC-050: Touch drag reorder on mobile
**Precondition:** Mobile viewport, 3 scenes uploaded  
**Steps:**
1. Long press or touch-drag a scene card to reorder

**Expected:**
- Drag reorder is functional on touch devices
- Scene cards respond to touch drag gestures
- Drop target highlights during drag

---

### TC-051: Video player full-screen on mobile
**Precondition:** Generation done, video player visible on mobile  
**Steps:**
1. Tap the fullscreen button on the video player

**Expected:**
- Video expands to fullscreen
- Native fullscreen API used (works on iOS Safari and Chrome Android)
- Exit fullscreen button is accessible

---

### TC-052: Tablet layout (768px)
**Precondition:** Viewport set to 768px  
**Steps:**
1. Load /scene-weaver
2. Observe layout

**Expected:**
- Scene strip displays without clipping
- Scene editor may appear as side panel (not bottom sheet)
- Mood selector fits in a single row
- All interactive elements remain tappable

---

## Test Suite 12 — Accessibility

### TC-053: All interactive elements have aria labels
**Precondition:** /scene-weaver loaded with scenes  
**Steps:**
1. Run accessibility audit (e.g., axe-core or browser DevTools)
2. Check all buttons, inputs, drag handles, and the video player

**Expected:**
- Zero critical accessibility violations
- All buttons have aria-label or visible text
- Drag handles have aria-label="Drag to reorder scene [N]" or equivalent
- Scene cards have descriptive roles and labels
- Error messages are announced via aria-live regions

---

### TC-054: Keyboard-only navigation
**Precondition:** /scene-weaver loaded  
**Steps:**
1. Navigate entire flow using only Tab, Enter, Space, Arrow keys
2. Upload a scene, edit it, select a mood, trigger Generate

**Expected:**
- All actions achievable without mouse
- Focus order is logical (top-to-bottom, left-to-right)
- Focus never becomes trapped unexpectedly

---

## Test Suite 13 — Build Verification

### TC-055: npm run build passes with zero errors
**Precondition:** All component files created by Frontend and Backend developers  
**Steps:**
1. Run `npm run build` from /home/user/master
2. Observe output

**Expected:**
- Build exits with code 0
- Zero TypeScript errors
- Zero unresolved imports
- No "any" type violations if strict mode enabled
- Output includes compiled pages for / and /scene-weaver

---

### TC-056: No unused imports or variables
**Precondition:** Build passes  
**Steps:**
1. Review TypeScript compiler output for unused variable warnings
2. Check ESLint output (if configured)

**Expected:**
- No unused import warnings
- No declared-but-never-read variable warnings

---

### TC-057: TypeScript interfaces match usage
**Precondition:** All files written  
**Steps:**
1. Verify Scene interface is used consistently across all components
2. Verify Story interface is used consistently in SceneWeaverApp.tsx

**Expected:**
- Scene.status is strictly typed as 'idle' | 'generating' | 'done' | 'error'
- Story.status is strictly typed as 'idle' | 'generating' | 'stitching' | 'done' | 'error'
- Scene.duration is strictly typed as 2 | 4 | 6 (union literal type)
- No implicit any in useReducer dispatch calls

---

## Test Suite 14 — State Management

### TC-058: useReducer handles all action types
**Precondition:** SceneWeaverApp.tsx uses useReducer  
**Steps:**
1. Review reducer for coverage of all expected actions: ADD_SCENE, REMOVE_SCENE, REORDER_SCENES, UPDATE_SCENE, SET_MOOD, SET_STATUS, SET_FINAL_VIDEO
2. Trigger each action through UI interaction

**Expected:**
- Each action type produces correct state mutation
- State is never mutated directly (immutable updates only)
- No action falls through to an unexpected default state

---

### TC-059: Scene removal updates state correctly
**Precondition:** 4 scenes uploaded  
**Steps:**
1. Remove scene at position 2

**Expected:**
- Scene strip shows 3 cards
- Removed scene's data is gone from state
- Remaining scenes maintain correct IDs and data
- If 2 scenes remain, Generate button stays enabled
- If removal drops count to 1, Generate button disables

---

## Priority Matrix

| Priority | Test Cases |
|----------|-----------|
| P0 (Critical — Blocker) | TC-055 (build), TC-029 (pipeline), TC-032 (error on scene 3), TC-026 (generate enabled) |
| P1 (High — Ship Blocker) | TC-001–TC-007 (upload), TC-008–TC-009 (reorder), TC-013–TC-015 (editor), TC-018–TC-022 (moods), TC-037–TC-040 (video player), TC-042 (download) |
| P2 (Medium — Quality) | TC-010–TC-011 (drag edge cases), TC-016–TC-017 (editor state), TC-023 (mood persist), TC-033–TC-036 (error cases), TC-048–TC-052 (mobile) |
| P3 (Low — Polish) | TC-053–TC-054 (accessibility), TC-056–TC-059 (code quality checks) |

---

## Known Risks / Notes

1. **ffmpeg-wasm stitching** runs client-side — large videos may cause browser memory issues on low-end devices. Test with 8 scenes at 6s duration each (48s total).
2. **Drag-and-drop on mobile** — HTML5 draggable API does not work on touch by default. A touch-drag polyfill may be needed (e.g., `react-dnd` with touch backend).
3. **Autoplay policy** — Modern browsers block autoplay with audio. Ensure video is muted by default.
4. **NSFW content** — Do not test with real NSFW content in CI environments. Use placeholder/mock images.
5. **SVD generation time** — Real API calls may take 30–90 seconds per scene. Tests should mock the API for speed and reliability unless explicitly doing end-to-end testing.
