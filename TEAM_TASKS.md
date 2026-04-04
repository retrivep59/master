# SceneWeaver — Team Task Assignments

## UI Designer
- Design SceneStrip: horizontal scrollable strip of scene cards with drag handles
- SceneCard: thumbnail + status badge + caption preview + edit button
- SceneEditor: slide-out right panel with template picker, caption input, duration toggle
- MoodSelector: 5 mood buttons with unique color themes and icons
- StoryOutput: full-width video player with scene count and download CTA
- SceneProgress: vertical timeline showing each scene generation status
- Color palette: dark bg (#030712), mood-specific accent colors per spec

## Frontend Developer  
- src/app/scene-weaver/page.tsx — page shell
- src/components/scene-weaver/SceneWeaverApp.tsx — state management with useReducer for Story
- src/components/scene-weaver/SceneStrip.tsx — drag reorder using HTML5 draggable API
- src/components/scene-weaver/SceneCard.tsx — image preview, status, click to edit
- src/components/scene-weaver/SceneEditor.tsx — configure single scene (template, caption, duration)
- src/components/scene-weaver/MoodSelector.tsx — 5 mood options with color themes
- src/components/scene-weaver/StoryOutput.tsx — video player + download button
- src/components/scene-weaver/GenerateStoryButton.tsx — orchestrate full pipeline
- src/components/scene-weaver/SceneProgress.tsx — live progress per scene
- Update MainApp.tsx header nav to add "Story Mode" link with NEW badge
- Wire upload (reuse existing ImageUploader or inline dropzone)

## Backend Developer
- src/app/api/scene-weaver/generate-scene/route.ts
  - POST handler: accepts imageUrl + SVD settings
  - Wraps existing Replicate SVD call
  - Returns { videoUrl } or { error }
- src/app/api/scene-weaver/stitch/route.ts
  - POST handler: accepts array of videoUrls + captions + mood
  - Use ffmpeg-wasm to concatenate clips with xfade transitions
  - Add text caption overlays per scene
  - Return stitched video as blob/URL
- Install @ffmpeg/ffmpeg @ffmpeg/util packages

## QA
- Test multi-image upload (2, 5, 8 images edge cases)
- Test drag reorder updates scene order correctly
- Test scene editor changes persist to parent state
- Test each mood renders correct accent color
- Test generate pipeline: idle → generating → stitching → done states
- Test error states: API failure mid-generation, network loss
- Test download button produces valid MP4
- Test with 1 image (should show error — minimum 2 required)
- Test build passes with npm run build

## Reviewer
- TypeScript strict: no `any` types, proper interfaces used
- No unused imports or variables
- State management: useReducer used correctly for complex Story state
- API routes: proper error handling, no unhandled promise rejections
- Accessibility: all interactive elements have aria labels
- Performance: images shown as thumbnails not full resolution in strip
- Security: file type validation on upload, size limits enforced
- Build: npm run build must pass with zero errors
