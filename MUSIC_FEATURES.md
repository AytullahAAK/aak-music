# AAK Music playback and discovery

## Main player

The featured player is the primary discovery and playback workspace. Each newly opened search starts on YouTube; Apple Music, Spotify, and the AAK library are separate provider tabs. External requests are debounced and canceled when the query or provider changes. Local search stays available without network access. Recent searches are stored in local browser storage.

AAK releases use their existing local audio paths. Apple search prefers the official Apple Music catalog API when server MusicKit signing credentials are configured; otherwise the tab is explicitly labeled as an iTunes preview-catalog fallback and uses Apple-supplied previews. Catalog duration is the full track duration, while the audio player reads the preview duration. MusicKit full playback also requires an allowed website origin, user authorization, and eligible Apple Music access. Protected MusicKit audio does not feed AAK analysis or EQ.

YouTube results use YouTube Data API v3 with on-demand `nextPageToken` pagination. Search keeps non-embeddable videos visible; known blocked videos offer only their YouTube link, and unknown embedding status is checked by the official IFrame player. Selecting an embeddable result starts the official player. The persistent global player keeps one iframe mounted while it moves between expanded and compact layouts; the compact dock remains visible during YouTube playback and is not auto-hidden while the video is playing. Embedded players must remain visible and at least 200 by 200 pixels; YouTube recommends 480 by 270 for 16:9 players. Video playback does not expose raw audio to AAK's analyser or EQ. No YouTube extraction or download is implemented.
Spotify results use the official Web API `/v1/search` endpoint with server-side Client Credentials. These are metadata results with official Spotify links; this endpoint does not provide playable previews. No Spotify user OAuth or in-site playback is enabled. The Web Playback SDK requires user authorization and a Premium account, and Spotify documentation says commercial use requires prior written approval. Development Mode currently requires the app owner to have Premium and limits use to five allowlisted users; broader access is approval-dependent. AAK is a public artist/music site and no Spotify commercial approval or account has been supplied, so this implementation does not activate Spotify streaming controls.

The global dock and featured console use one shared playback UI and provider state for AAK audio, Apple/iTunes previews, authorized MusicKit playback, and YouTube video. The controller is mounted in the application shell, so internal route changes do not unmount local or YouTube playback. Switching sources stops or pauses the previous one. AAK audio and supported preview files enter the shared Web Audio graph. MusicKit and YouTube do not expose protected output to this graph, so the visualizer stays idle and EQ is disabled for them. The compact dock auto-hides during downward page scrolling for audio sources and returns when scrolling stops or reverses; it stays visible for YouTube to preserve the visible official player. A full reload or closed tab can interrupt playback.

The six-band EQ uses shared Web Audio biquad filters before the shared compressor and analyzer. Its presets and ±9 dB sliders affect AAK audio, Apple previews, and generated audio routed through the site's audio bus. It cannot process audio played inside YouTube or Spotify's own applications. The output bus has headroom and compression to reduce clipping risk.

No licensed lyrics catalogue is connected, so the player does not fetch or invent lyrics. A user may paste lyrics they own or are permitted to use. A local script/word-pattern estimate can identify Bengali, Arabic, likely Hindi, likely English/Spanish, or report uncertainty without uploading the text.

Optional AI tools are available when `OPENAI_API_KEY` is configured on the server. The user must actively choose a local audio file and confirm authorization before requesting transcription, or confirm authorization before submitting supplied lyrics for translation. The app forwards the chosen file/text to the configured OpenAI API and does not save it in the app. Transcription is an editable estimate, singing may be misrecognized, and the selected model does not return a calibrated confidence score. Translation is an editable machine-generated draft. Neither feature supplies official lyrics or synchronized timestamps. API usage may incur charges under the configured OpenAI account. The user interface limits transcription uploads to 2.5 MB and translation text to 5,000 characters.

## Credentials and local setup

Copy `.env.example` to `.env.local` for local development. Keep secrets server-side and do not prefix them with `VITE_`. Restart Vite after changing environment variables. On a server deployment, configure the same values in that platform's server environment.

### YouTube search and video discovery

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable [YouTube Data API v3](https://developers.google.com/youtube/v3).
3. Create an API key, restrict it to YouTube Data API v3, and set `YOUTUBE_DATA_API_KEY`.
4. Search in the player. The provider status changes from unconfigured to ready; actual query results confirm key and quota access. The iframe player is a separate official integration and should be tested separately.

The Data API has a default daily quota; `search.list` is quota-costly (currently 100 units per call by Google's documentation). Search is debounced and capped to a small result set. Additional quota requires Google's quota-extension/compliance process. See [search.list](https://developers.google.com/youtube/v3/docs/search/list), [quota](https://developers.google.com/youtube/v3/determine_quota_cost), and the [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

## YouTube production configuration

The browser calls the same-origin path `/api/youtube-search`; it does not call localhost or receive the API key. Vercel deploys root-level `api/youtube-search.ts` as a Node serverless function. The Vite middleware in `vite.config.ts` is for local development and preview only; it is not the production API. `vercel.json` rewrites the site routes to the SPA entry and does not rewrite `/api/*`.

For local development, set `YOUTUBE_DATA_API_KEY` in the ignored `.env.local` file and restart Vite. For production, open **Vercel -> Project -> Settings -> Environment Variables**, add the exact name `YOUTUBE_DATA_API_KEY`, add the key as a server-side value, select **Production** (and Preview if needed), save, and redeploy. In Google Cloud, enable YouTube Data API v3 and restrict the key to that API. Do not use a `VITE_` prefix or an HTTP-referrer restriction for this server-to-server request. Check `https://your-domain.example/api/youtube-search?status=1`: it should return `{"configured":true}` without returning the key. Then search a query and use **Load more videos** to verify pagination. Missing configuration, invalid keys, quota exhaustion, and upstream network failures have distinct safe responses. Production verification still requires the Vercel variable and a deployment.
### Spotify catalog metadata

1. Create an app in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
2. Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env.local` or the server environment. Never ship the secret to a browser.
3. Search in the player and confirm genuine metadata results and a working `open.spotify.com` link.

The backend uses Spotify's Client Credentials flow, which authorizes app-level catalog lookup and does not authenticate a listener or permit user playback. Current development mode requires the app owner to have Premium and supports at most five allowlisted Spotify users. Spotify currently accepts extended-quota applications from organizations, with additional launch, scale, market, and policy requirements. The Web Playback SDK also requires Spotify's prior written approval for commercial projects. Consult current [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes), [authorization](https://developer.spotify.com/documentation/web-api/concepts/authorization), [search](https://developer.spotify.com/documentation/web-api/reference/search), and [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk) documents before enabling wider access or playback.

### Optional AI lyrics tools

1. Create an API key in the [OpenAI API dashboard](https://platform.openai.com/api-keys), set up usage limits/billing for the API project, then set `OPENAI_API_KEY` in `.env.local` or the server environment.
2. `OPENAI_TRANSCRIPTION_MODEL` optionally selects `gpt-4o-mini-transcribe` (default), `gpt-4o-transcribe`, or `whisper-1`. `OPENAI_LYRICS_MODEL` selects the text model used for translation and defaults to `gpt-4.1-mini`.
3. Open the player’s Lyrics tab. Select an audio file under 2.5 MB and affirm that you own or may process it to request a transcription. To translate, supply authorized lyrics text and separately affirm permission before submission.

The audio upload goes from the browser to this app’s server and then to OpenAI’s `/v1/audio/transcriptions` endpoint using the configured supported model; the app uses a 2.5 MB web limit. Detected language is returned when reliable; the model does not provide a calibrated confidence score. Translation sends only the supplied text and chosen target language through the Responses API with storage disabled on the request. Both are optional API features, may incur usage charges, can be wrong, and do not provide licensed/official lyrics. See [speech-to-text](https://developers.openai.com/api/docs/guides/speech-to-text), [transcription API](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create), and [text generation](https://developers.openai.com/api/docs/guides/text).

### Apple Music catalog and MusicKit playback

Without credentials, the player searches iTunes metadata and plays only preview URLs supplied by Apple. To enable the official Apple Music catalog API and MusicKit playback:

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) and enable MusicKit for your website identifier in Certificates, Identifiers & Profiles.
2. Create a MusicKit key. Record its 10-character Key ID and your 10-character Team ID. Download the private `.p8` key and keep it private.
3. Base64-encode the complete `.p8` file. In PowerShell, run `[Convert]::ToBase64String([IO.File]::ReadAllBytes('AuthKey_KEYID.p8'))` and copy the output directly into the server environment value; never paste the private key into source code.
4. Set `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_PRIVATE_KEY_BASE64`, and `APPLE_MUSIC_ALLOWED_ORIGINS`. Include exact origins and schemes, such as `http://localhost:5173,https://your-domain.example`.
5. Locally, put them in `.env.local` and restart Vite. In Vercel, add the same names under Project Settings → Environment Variables for the required deployment targets, then redeploy. Do not use `VITE_` prefixes.
6. Check `/api/apple-music-token?status=1` for `{"configured":true,"originAllowed":true}`. Search a song, press Play in Apple Music, and complete Apple authorization. Full playback still depends on the user's eligible Apple Music access and storefront.

The server signs short-lived ES256 developer tokens and never returns the private key. MusicKit needs a public developer token in the browser; the signing key remains server-side. When `APPLE_MUSIC_ALLOWED_ORIGINS` matches the request origin, the token is restricted to that origin. Apple Music API and MusicKit require Apple Developer Program membership. See [Apple Music API](https://developer.apple.com/documentation/applemusicapi), [MusicKit on the Web](https://developer.apple.com/musickit/), [developer-token generation](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens), and [user authentication](https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit).

## Downloads

The Download Center does not expose local AAK audio URLs. It validates a pasted YouTube URL and links only to the official YouTube destination; it does not download or convert streams. Apple previews and Spotify catalog records are not downloadable here. Because local audio assets are public static files needed for playback, removing the Download Center link does not make direct asset URLs access-controlled. Protecting those URLs would require authenticated server-side media delivery.

## AAK Beat Lab

The Loop Studio uses browser-generated Web Audio instruments; there is no external sample pack in the project. It supports tempo 40–220 BPM, keys, scales, genre presets, generated rhythm/chord/bass/melody layers, mute/solo, live pattern edits, local save/reload, and Standard MIDI File export. MIDI is a real `.mid` export. WAV export and model-backed natural-language generation are not implemented.

## Adaptive performance modes and installation

The top-navigation performance selector supports Auto, Low, Balance, and High. A new installation starts in Auto. Auto estimates only in the browser from viewport/pointer class, `navigator.deviceMemory` when exposed, `navigator.hardwareConcurrency`, and the operating system's reduced-motion preference. Unknown or mixed device signals use Balance. When the Long Tasks API is supported, Auto downgrades after repeated long main-thread tasks; this is a conservative signal, not a GPU benchmark. A manual Low/Balance/High choice is saved and never silently replaced. Choosing Auto again resets the estimate and re-enables event-based degradation. No hardware signals are sent to a server.

AAK Music is shipped as a PWA from the existing Vite/Vercel app; no native APK, IPA, or Windows package is produced. The manifest and service worker cache the application shell and same-origin static assets only. API responses and audio/video media are explicitly network-only. Offline use displays an offline notice; streaming and provider search need a connection. Android and compatible desktop browsers can show their native install prompt when eligible. iPhone/iPad users follow Safari's Share â†’ Add to Home Screen flow. The `/install` page describes the current browser's route and does not claim native packaging.

Loop Studio uses an exclusive audio-ownership handoff. Starting a loop pauses the currently selected local, Apple, catalogue, or YouTube source and retains its selection and provider instance; it does not extract or route YouTube audio. Stopping the loop leaves the previous track paused so it can be explicitly resumed from the persistent player. Starting that previous source takes ownership and stops the loop. The Loop Studio and local audio share the existing Web Audio bus; a browser user gesture is still required to resume a suspended context.

## Browser floating player and platform limits

The draggable mini-player is an in-page webpage control; dragging it does not make it an operating-system window. On a secure desktop browser that exposes the Document Picture-in-Picture API (currently Chromium desktop browsers such as Chrome and Edge), the dock offers a **PiP** action for active AAK/local or Apple/catalogue audio. It opens a browser-managed always-on-top window with artwork, track details, seek, volume, and controls wired to the same application playback controller. It does not create another audio element or playback session. On eligible recent desktop Chrome versions, AAK also registers the official Media Session PiP action while supported audio is playing; Chrome may request automatic PiP when the user changes tabs, subject to Chrome's site permission, media engagement/audio-focus, and playback eligibility rules. Chrome may close an automatically entered PiP when its tab becomes visible again. The manual button remains available when automatic entry is not offered. For the custom audio Document PiP window, AAK requests an initial size of 390 x 190 CSS pixels; the browser may constrain that request. The browser controls its screen position, and this is separate from YouTube's provider-managed native video PiP. AAK CSS cannot resize or reposition YouTube's native PiP window. Closing the floating window leaves playback in the opener page; the floating window closes with its browser window or when its opener page closes/reloads.

YouTube is intentionally not offered through AAK's custom floating audio window. The official YouTube iframe does not expose its underlying media element or raw audio to this page. Use YouTube's own player controls for any PiP option the provider/browser exposes, or open the video on YouTube. AAK does not extract, hide, or proxy the stream. In browsers without Document PiP, the in-page dock remains available and the UI explains the limitation. Android and iOS/iPadOS browsers may provide provider-managed video PiP for eligible video elements, but AAK's local sources are audio elements and its YouTube source is a cross-origin embed; this site cannot promise a custom always-on-top music window there. The installed PWA manifest does not grant native window privileges. A fully custom, OS-level Windows player across browsers would require a separately packaged desktop application (for example, a signed Electron/Tauri app); no such native application is included in this repository.

## Verification notes

Use `npm run build` for the available TypeScript check and Vite production build. This package has no lint or test script. For external verification, test YouTube search and the video embed separately, Spotify search with actual developer credentials, and Apple previews independently. Do not interpret a provider's `ready` status as proof that a specific result can be played.
