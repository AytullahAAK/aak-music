# Music discovery and Loop Studio setup

## Universal search and player

Search keeps AAK Music releases local and queries three external providers after a 550 ms typing pause: Apple’s public iTunes Search API, YouTube Data API v3, and the existing Jamendo Tracks API. Provider results are labeled separately and failures remain isolated so local search keeps working. Recent searches are stored in this browser only.

Apple song search requires no key. Results link to Apple Music and only expose in-site audio playback when Apple returns a `previewUrl`; the result’s track duration is not the preview length. The player measures the actual loaded preview duration, normally around 30 seconds. Apple catalog contents and availability vary by storefront. [Apple’s API guide](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/)

YouTube search uses the official Data API and is disabled until `YOUTUBE_DATA_API_KEY` is set in the server environment. Enable YouTube Data API v3 in Google Cloud, create an API key, restrict it to that API, then set it in `.env.local` for Vite or in the deployment platform’s server environment. Never use a `VITE_` prefix. The Vite middleware and `/api/youtube-search` Vercel function keep the key server-side. The API project has a limited daily search quota; Google currently documents 100 `search.list` calls per day by default, so the UI waits for a 550 ms pause and limits each request to eight videos. See [YouTube search](https://developers.google.com/youtube/v3/docs/search/list) and [quota details](https://developers.google.com/youtube/v3/determine_quota_cost).

YouTube results are filtered for embeddable videos and use the official IFrame Player API with YouTube controls enabled and autoplay disabled. A video can still become unavailable or reject embedding, in which case the result offers its YouTube link. Video playback stays inside YouTube’s player; it is never turned into audio-only playback, analyzed by this page’s Web Audio graph, or offered as a download. The site keeps a visible YouTube attribution and watch link. Follow [YouTube’s IFrame API](https://developers.google.com/youtube/iframe_api_reference), [required player behavior](https://developers.google.com/youtube/terms/required-minimum-functionality), and [developer policies](https://developers.google.com/youtube/terms/developer-policies).

AAK releases play through the existing AAK audio element. Apple previews and Jamendo streams use one shared external audio element with timeline, volume, queue, repeat, shuffle, and the site visualizer’s shared analysis graph. Switching to an AAK track pauses external audio; starting external audio or a YouTube video pauses AAK playback. YouTube iframe audio cannot be read by Web Audio, so the page does not claim that its visualizer analyzes YouTube playback.

The Download Center no longer lists local AAK tracks or exposes their audio paths. It validates pasted YouTube URLs and provides the official watch destination; this site does not download or convert YouTube media. Jamendo results get a download action only when its API explicitly returns both `audiodownload_allowed: true` and a download URL. The center labels this as provider-authorized, links to the track license, and avoids invented format, quality, or file-size claims. Apple previews and Spotify catalog records are not downloadable here.

Voice search uses the browser’s SpeechRecognition implementation when available. It starts only after microphone activation, lets users review the transcript, and falls back to keyboard search in unsupported browsers.

## Jamendo catalogue setup

AAK releases are always searched locally. Universal discovery also uses Jamendo's read-only Tracks API. Search waits 550 ms after typing and asks the provider for up to 12 results labeled as Jamendo. Cards link to the Jamendo track, artist, and supplied license. The API supplies an `audio` stream URL and track duration; the UI plays that provider stream when supplied. It does not claim to search every music service.

Jamendo requires an application Client ID for API calls. Set `JAMENDO_CLIENT_ID` in the server environment. Never use a `VITE_` variable for it: Vite variables are copied into browser bundles. Copy `.env.example` to `.env.local` for local Vite use, then fill the server-only variable. The Vite dev/preview middleware reads that setting; Vercel deployments can use the included `/api/music-search` function and the same server environment variable. A static host without server functions needs an equivalent same-origin proxy.

Jamendo's API terms say API use is free for noncommercial use; commercial use requires contacting Jamendo licensing for terms and a quote before enabling the Client ID. Jamendo can impose request-frequency limits. AAK Music has booking/services content, so confirm that the intended deployment qualifies before enabling this provider. The server proxy returns an unconfigured status until the server variable exists; local AAK search remains available.

Jamendo API results are Creative Commons works. Their licenses differ by track and can include noncommercial or no-derivatives conditions. Follow the linked license for each use. The interface shows artist attribution and links to both the provider track page and license, but it does not grant permission to reuse a work in AAK releases or in exported projects. The app streams only the provider's returned `audio` URL and does not cache tracks for offline use. A provider download link appears only when the API's `audiodownload_allowed` flag and download URL are both present.

Official references: [Jamendo authentication and Client ID](https://developer.jamendo.com/v3.0/authentication), [Tracks API and stream fields](https://developer.jamendo.com/v3.0/tracks), [Jamendo API terms](https://devportal.jamendo.com/api_terms_of_use).

## AAK Beat Lab

The sequencer uses original browser-generated Web Audio instruments. The repository's existing `public/audio` files are the seven AAK releases, not a sample pack, so the studio does not point at them as drum samples. The Sample Vault's audition controls also synthesize previews; the metadata now identifies them as browser-generated sounds.

The studio supports tempo 40–220 BPM, 12 keys, five scales, 12 genre presets, 1/2/4 bar loops, generated rhythm/chord/bass/melody layers, a local description parser, lane mute/solo, live pattern edits, browser-local save/reload, and Standard MIDI File export. MIDI is an actual binary `.mid` export. WAV export and AI language-model generation are not implemented.

## Manual smoke checks

1. Set up `JAMENDO_CLIENT_ID` on a noncommercial local instance (or after commercial terms are cleared), search an uncommon title, confirm results are from Jamendo, and play one full stream. Remove the setting and confirm local results still work with the unconfigured message.
2. Start the Loop Studio, change BPM and genre, then key/scale, regenerate each layer, mute and solo tracks, and stop playback.
3. Save a pattern, reload the page, load it, and export MIDI. Open the `.mid` file in a DAW or MIDI inspector to confirm it contains tempo and note events.
4. At phone portrait, tablet landscape, and desktop sizes, open/close the navigation repeatedly with the close button, Escape, backdrop tap, and a link.
## Spotify catalog setup and playback limits

Spotify search is optional and returns official track metadata only. Create an app in the Spotify Developer Dashboard, copy its Client ID and Client Secret into server-only `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`, and restart the local dev server. For Vercel, set the same variables in the server environment. Keep both values out of `VITE_` variables and never commit `.env.local`. The server uses Spotify's Client Credentials flow, caches the short-lived app token and search results, and returns only title, artists, album art, duration, release date, explicit status, and the Spotify link. Search requests are debounced by 550 ms, capped to small result sets, and limited to 45 per minute per provider/client in each warm server process; upstream calls time out after 10 seconds and provider 429 responses remain visible. The process-local limit is best-effort across serverless instances. It does not claim in-site Spotify playback or assume preview URLs exist.

Spotify's Web Playback SDK requires a user-authorized playback integration and an eligible Premium account. That OAuth and SDK path is not included in this build; results link to Spotify instead. See the official [Search for Item API](https://developer.spotify.com/documentation/web-api/reference/search), [Client Credentials flow](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow), and [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk).

The unified dock controls existing AAK releases, Apple previews, and Jamendo streams through source-appropriate audio elements. YouTube remains video-only through its official embed. A YouTube/audio cross-switch is shown only when exact normalized title and artist match and the supplied durations are within 15 seconds (or a duration is missing); this conservative match can miss alternate titles and channel names. Lyrics are marked unavailable because no licensed lyrics provider is configured.

