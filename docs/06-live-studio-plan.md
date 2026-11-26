# 06 · BX Live Studio: our own live podcasts and shows

> **Status:** proposal v2, 26 Nov 2026. Not approved, nothing built. If approved, it gets a decision in the Decisions Log, because it changes **D-003** ("live streams and bulletins are YouTube-linked/embedded only").
> **Goal:** hosts and guests go live from a browser inside the newsroom, like Google Meet or Zoom, and readers watch or listen on BX News without YouTube.
> **Limits below were checked on 26 Nov 2026** (sources in §14). Free tiers change without notice. Oracle cut its free server in half in June 2026, so **check them again before each step**.

---

## 1. Summary

| | Audio shows (live podcast) | Video shows |
|---|---|---|
| Can we do it ourselves? | **Yes** | **Yes** |
| Monthly cost at the start | **$0** (Oracle free server + Cloudflare R2) | **$0** if the host's browser does the mixing (to be proven in the spike), otherwise **a small paid server, about €5–10/month** |
| Readers' delay behind the studio | ~10–20 seconds | ~10–20 seconds |
| Data per listener or viewer per hour | ~30 MB | ~300 MB (360p) to ~700 MB (720p) |
| Work | ~2 weeks (S0–S2) | ~1–1.5 more weeks (S3) |

**Recommendation:** build **audio first** (S0–S2). It is free, cheap on readers' mobile data, and proves the whole system. Decide on video after real shows.

## 2. How it works

```mermaid
flowchart LR
    subgraph Newsroom["Newsroom (Vercel, as today)"]
        S[Studio page<br/>/newsroom/studio]
        T[Token, invite and webhook API]
    end
    H1[Host browser] -->|camera + mic, WebRTC| LK
    G1[Guest: one-time invite link] -->|WebRTC| LK
    S -.controls.-> T
    T -->|short-lived signed tokens| H1 & G1
    subgraph Server["Our media server (one small Linux VM)"]
        LK[LiveKit server<br/>connects everyone]
        EG[LiveKit Egress<br/>makes one programme]
    end
    LK --> EG
    EG -->|HLS: small files every few seconds| R2[(Cloudflare R2<br/>no download fees)]
    EG -.optional.->|RTMP| YT[YouTube simulcast]
    EG -->|recording| R2
    R2 -->|via Cloudflare cache on our domain| R[Readers: /live and /podcasts]
    LK -->|webhooks: started / ended / joined| T
```

- **Hosts and guests** use **WebRTC**: real time, under a second, like a call.
- **Readers** get the finished programme as **HLS**, the format used by YouTube, radio apps and podcasts. It runs about 10–20 seconds behind. Readers download from **R2 through Cloudflare's cache**, **never from our server**, so a big audience cannot overload it or use up its data allowance.
- The website stays on Vercel. The **only new thing to run is one small server**.

### Why the website alone can't do it
Vercel runs short requests (up to 5 minutes, 4.5 MB bodies) and has no UDP, which real-time audio and video need. Vercel's long-running "Daemons" cannot accept incoming connections. A studio needs a server that stays connected for the whole show.

## 3. The pieces

| Piece | Choice | Cost | Notes |
|---|---|---|---|
| Media server | **LiveKit** (open source, Apache 2.0, self-hosted) | Free | Widely used for calls and streaming; handles echo, weak networks and phones switching from Wi-Fi to 4G |
| Programme mixing and recording | **LiveKit Egress** (open source) | Free | Outputs HLS, MP3/MP4 recordings and RTMP (YouTube). Official images exist for **arm64** and amd64 |
| Server (audio) | **Oracle Cloud Always Free, Ampere A1: 2 cores, 12 GB memory, 10 TB outbound a month** | Free | Was 4 cores / 24 GB until 15 Jun 2026. Card needed at sign-up. See risks for idle reclaiming |
| Server (video, if browser mixing fails) | Small paid ARM or x86 VM with **4 cores**, e.g. Hetzner Cloud | ~€5–10/month (*check price on the day*) | LiveKit recommends 4 cores and 4 GB for each video mixing job |
| Stream and recording storage | **Cloudflare R2** (already used for photos and backups) | Free: 10 GB, 1M writes, 10M reads a month, **downloads free** | After the free tier: reads $0.36 per million |
| Reader delivery | R2 bucket on **`media.bemerickexpress.com`** with Cloudflare cache | Free | R2's built-in `r2.dev` address is rate-limited and meant for testing only, so **live readers need our domain** |
| Studio and players | New pages in our Next.js app: `livekit-client`, `@livekit/components-react`, `hls.js` (only on the player page) | Free | Same login, roles, look and audit log as the newsroom |
| Server address | `studio.bemerickexpress.com` + Let's Encrypt certificate | Free | Until the domain is bought: a free DuckDNS name, for **staff tests only** |

**Why LiveKit, and not something else?**
- **Our own WebRTC server:** months of work, and easy to get wrong.
- **Jitsi:** harder to customise for a broadcast studio.
- **Owncast:** has no guest studio, and needs OBS on the host's computer.
- **Cloudflare Calls, or hosted LiveKit, Mux, StreamYard:** third parties seeing the streams, which is what this plan avoids.

LiveKit runs on our machine. No outside company handles the audio or video, apart from R2 (our storage) and YouTube if we choose to simulcast.

## 4. Two ways to mix the programme (decided in the spike)

| | A. Server mixing ("room composite") | B. Browser mixing (the host's studio page builds the programme) |
|---|---|---|
| How | Egress runs a hidden Chrome that "watches" the room and records the screen | The host's browser draws the layout and mixes the sound, then sends one "programme" stream; Egress only repackages it ("track egress") |
| Server load | Audio: ~1 core. **Video: 2–6 cores, 4 recommended** | Light: no hidden browser, and audio needs no re-encoding |
| Fits the free 2-core server | Audio: **yes**. Video: **no** | Audio and video: **likely** (to measure) |
| Downside | Needs a bigger server for video | The host's laptop works harder; if it crashes, the programme stops (guests stay connected and the host rejoins) |

**Plan:** audio uses **A** (simple and free). In S0 we also test **B** for video. If B works on a mid-range laptop, video stays free. If not, we choose between a paid 4-core server and "video goes to YouTube, audio stays with us".

## 5. What it would look like

### Newsroom: `/newsroom/studio`
1. **Create a show:** title, section, audio or video, scheduled time, "also send to YouTube" (on or off), and "save as podcast episode" (on or off). It appears on `/live` as "Coming up", like YouTube streams today.
2. **Green room:** hosts and guests check their camera, microphone, sound level and network before going live. Readers can't hear or see anything yet. A warning appears if someone's connection is too weak.
3. **Invite guests:** a **one-time link**, valid for that show and at most 24 hours. The guest needs no account and enters their name.
   - They tick **"I agree to be broadcast live and recorded"**.
   - They wait in a **lobby** until a host admits them.
   - Links can be **sent by WhatsApp** from the studio page.
4. **Control panel:**
   - **Go live** (after a 5-second countdown) and **End**.
   - Mute, remove or move a guest back to the lobby.
   - Layout: single speaker, side by side, grid; title card and "back soon" card.
   - Live listener count and stream health (green / amber / red).
5. **End:** the stream stops and the recording is saved to R2. An editor reviews it, trims the start and end, and publishes it as an episode.

### Readers
- `/live` shows studio shows next to YouTube streams, with the same LIVE pill and section tags (D-043).
- **Audio:** a small player that keeps playing while the reader moves around the site. It plays on the lock screen on phones (Media Session API).
- **Data saver:** video starts at 360p and moves to 720p only on a good connection. "Listen only" lets readers turn a video show into audio.
- `/podcasts` and episode pages: play or download, plus a transcript if one is added (later).
- `/podcast.xml`: a standard podcast feed. Submitting it to Apple Podcasts or Spotify is optional and done by the owner.
- **If the stream drops:** the player shows "Stream interrupted, reconnecting…" and keeps trying. Staff see an alert in the studio.

### Roles
- New permission **`studio.host`**: editors and admins. An editor can add a writer as co-host for one show.
- **Guests** get a token for one room that only lets them send their own audio and video. They cannot invite, record, change layout or end the show.
- Every important action is recorded in the **audit log**: go live, end, invite, admit, remove, publish episode.

## 6. Capacity and cost in numbers

| Format | Bitrate | Per listener or viewer per hour | R2 reads per listener-hour (6 s segments + playlist) |
|---|---|---|---|
| Audio | 64 kbps | ~30 MB | ~1,200 |
| Video 360p | ~600 kbps | ~300 MB | ~1,200 |
| Video 720p | ~1.5 Mbps | ~700 MB | ~1,200 |

- **Reads:** 10M free reads ≈ **8,000 listener-hours a month** with no cache. Once the stream is served on our domain, **Cloudflare's cache answers most reads**: one listener or 1,000 listeners cost roughly the same in R2 reads. Without cache, it is about **$0.43 per 1,000 listener-hours** after the free tier.
- **Writes:** each show-hour writes about 1,200–2,500 files, so 1M free writes ≈ 400+ show-hours a month.
- **Storage (10 GB free):**
  - **Audio:** ~350 one-hour episodes.
  - **Video:** ~15 hours of 720p. Video recordings are kept 30 days, then deleted or moved to YouTube.
  - **Live segments:** deleted automatically after the show (R2 lifecycle rule).
- **Server data:** the server sends one copy of the programme, plus YouTube if simulcasting. That is far below the free 10 TB.
- **Server capacity:**
  - **Free 2 cores:** about 2 audio shows at once, or 1 browser-mixed video show (*to measure*).
  - **Callers:** LiveKit itself handles many more callers than a studio needs (up to ~8 hosts and guests per show).

## 7. Database changes (one migration)

- **`live_stream`:**
  - add `source` (`youtube` | `studio`) and `format` (`audio` | `video`);
  - `youtube_video_id` becomes optional;
  - add `room_name`, `playback_url`, `recording_key` (the R2 path) and `simulcast` (on or off).
- **New `studio_invite`:** show, guest name, **hashed** token, expiry, consent time, used at, admitted by.
- **New `podcast_episode`:** stream, title, description, file, duration, published at, status (draft / published). Episodes follow the same draft → publish steps and cache clearing as stories (D-039, D-046).
- **Clean-up job** (the nightly schedule): delete expired invites and unpublished recordings older than the agreed time.

## 8. Security and privacy

- **Tokens:**
  - Vercel signs every LiveKit token with a secret known only to Vercel and our server.
  - Tokens last minutes and name **one room with fixed rights**.
  - Webhooks from the server are signed and checked.
- **Server hardening:**
  - Firewall: only HTTPS 443, LiveKit's WebRTC ports, and SSH (key only, no password).
  - Automatic security updates.
  - The admin API and Redis are not reachable from the internet.
  - TURN over TLS on 443, so guests behind strict office or mobile networks can still connect.
- **Kill switches:**
  - "End show now" in the newsroom works even if the host's browser crashed.
  - An environment variable turns the whole studio off.
- **Guest consent:** guests must accept broadcast and recording before joining. The acceptance is saved with the invite.
- **Privacy policy update** (before the first show):
  - We keep guest names, consent and recordings.
  - Published recordings are public.
  - Readers' IP addresses reach Cloudflare when they play a stream, as with photos today.
  - No reader account is needed.
- **Registration and licensing:**
  - Guest data is personal data, so include it in the **Personal Data Protection Office** registration.
  - **Ask the media lawyer** whether regular live audio or video broadcasting online needs anything extra from the **Uganda Communications Commission**.

## 9. Plan of work

| Step | What | Time | Done when |
|---|---|---|---|
| **S0 · Spike (go / no-go)** | Oracle free VM, LiveKit + Egress (pinned versions, Docker Compose); two browsers in a room; audio HLS to R2; **test browser mixing (B) for video**; play on a real **mid-range Android phone on Ugandan 4G (MTN and Airtel)** | 3–4 days | CPU, memory, delay, sound quality and data use measured and written down; go / no-go and mixing method recorded as a decision |
| **S1 · Audio studio** | `/newsroom/studio`, green room, invites + lobby, go live / end, kill switch, audio player on `/live`, recording to R2, webhooks, audit log, privacy policy update | ~1 week | A host and a remote guest run a 30-minute live show that readers hear on the site, and the recording is saved |
| **S2 · Podcast archive** | `podcast_episode`, trim, `/podcasts`, episode pages, `/podcast.xml`, clean-up job | 2–3 days | An ended show is published as an episode and plays from the feed in a podcast app |
| **S3 · Video** | Layouts and title cards, 360p + 720p, "listen only", optional YouTube simulcast | ~1–1.5 weeks | A video show plays smoothly on a mid-range phone and adjusts to the network |
| **S4 · Hardening** | Uptime check + alerts for the server, auto-restart, **rebuild script in Git**, server backups of config, load test with 200 fake listeners, runbook ("the stream dropped: what to do") | 2–3 days | Server rebuilt from scratch from the script in under an hour; load test passes |

**Total:** ~3–4 weeks. **Audio alone (S0–S2) is a complete product**, so we can stop there.

**Testing:** each step gets an end-to-end test like the existing suites (live, nav, phase6), plus unit tests for tokens, invites and the feed. A real show with two people must pass before each step is marked done.

## 10. Risks

| Risk | Likelihood | Impact | What we do |
|---|---|---|---|
| **Oracle reclaims the server as idle.** Its rule: over 7 days, 95th-percentile CPU, network **and** memory all under 20%. A studio used a few hours a week will look idle | **High** | Medium | Upgrade the account to Pay-As-You-Go: free resources stay free, and users report this stops reclaiming, though Oracle's page does not say so. Keep the **rebuild script**: a new server in under an hour |
| Oracle cuts the free tier again (it did in June 2026) | Medium | Medium | Rebuild script works on any Linux VM; paid fallback ~€5–10/month |
| Oracle sign-up refused, or no free A1 capacity in a nearby region | Medium | Medium | Try another region; paid fallback |
| Server goes down mid-show | Medium | High | Auto-restart, uptime alerts to jjemba84@gmail.com, YouTube simulcast as backup for big shows, a runbook |
| Guests on weak networks sound bad | High | Medium | Audio first; LiveKit adapts; green-room network check; guests can join from a phone browser |
| Domain still not bought | Medium | **Blocks public shows** | Staff tests on DuckDNS and the `r2.dev` address; public shows only once the domain is on Cloudflare (Q-001) |
| Video mixing needs 4 cores | High | Low | Browser mixing (B), a paid server, or video stays on YouTube |
| Someone abuses a guest link | Low | High | One-time links, lobby approval, instant remove, kill switch |
| More for us to maintain | Certain | Medium | Pinned versions; a monthly 30-minute update routine in the runbook |
| No YouTube discovery | Certain | Medium | Optional simulcast; the podcast feed reaches podcast apps |

## 11. What we need from the owner before starting

1. **Approve the change** from D-003 to "YouTube **or** our own studio".
2. **Create the Oracle Cloud account** (a card is needed). Ideally upgrade it to Pay-As-You-Go, which is still $0 if we stay in the free limits. Claude does the rest of the setup with you watching.
3. **Domain:** needed before the first **public** show (Q-001). Staff tests can start without it.
4. **Who can host shows:** editors and admins only, or chosen writers too?
5. **How long to keep recordings** that are not published as episodes (suggested: **30 days**).
6. **Audio first?** Recommended: S0 → S2, then decide on video.
7. **Ask the media lawyer** about UCC rules for online live broadcasting (can run alongside the policy review).

## 12. Decisions this would add

- **D-0xx:** own live studio: LiveKit on our own small server; readers stream by HLS from R2 through Cloudflare's cache; YouTube stays available and can be used at the same time.
- **D-0xx (after S0):** mixing method for video (A or B), with the measurements.
- Update Architecture §1 (the Video / live row and the hosting table), the Blueprint's live section and the Roadmap (a new "Phase 6b · Live studio", or part of Phase 8, as the owner decides).

## 13. Later ideas (not in this plan)

- **Readers calling in:** a reader joins as a guest from a link shared live, waits in the lobby, and the host admits them.
- **Automatic transcripts** of episodes, for search and accessibility.
- **Low-delay viewing** (under 1 second, by WebRTC) for small audiences, e.g. press conferences.
- **Scheduled re-runs** of popular episodes.

## 14. Sources (checked 26 Nov 2026)

- Oracle Always Free resources (A1: 1,500 OCPU hours and 9,000 GB hours a month, about 2 cores and 12 GB; 10 TB outbound; idle-reclaim rule): https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm
- Oracle's June 2026 cut from 4 cores / 24 GB, and Pay-As-You-Go reports: https://infoq.com/news/2026/07/oracle-cloud-free-tier-limits/
- LiveKit Egress self-hosting (4 cores / 4 GB recommended; room composite uses 2–6 cores): https://docs.livekit.io/transport/self-hosting/egress/
- LiveKit Egress images (amd64 + arm64): https://hub.docker.com/r/livekit/egress/tags
- Cloudflare R2 pricing (free: 10 GB, 1M Class A, 10M Class B a month; no egress fees; reads $0.36 per million): https://developers.cloudflare.com/r2/pricing/
