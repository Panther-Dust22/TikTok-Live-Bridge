"use strict";

const net = require('net');
const crypto = require('crypto');
const path = require('path');

const BRIDGE_PORT = 21214; 
const clients = new Set();
let broadcastToClients = null;
let upstreamSocket = null;
let upstreamConnected = false;
let upstreamConnecting = false;
let upstreamPending = [];
let lastViewerCount = null;
let liveActive = false;
let liveRoomId = null;
let lastLiveTransitionAt = 0;
let lastDomStatsSeenAt = 0;
let domSessionSeed = null;
let lastLikesTotal = null;
let lastDiamondCount = null;
let lastEarnedCents = null;
let lastNewFollowersCount = null;
let lastGiftCount = null;
let lastSubscriberCount = null;
const globalUserMaxLikes = new Map();
let globalUserMaxLikesLiveId = null;

const https = require('https');

let splashWindow = null;
let splashShown = false;

const SPLASH_MESSAGE_URL =
    'https://raw.githubusercontent.com/Panther-Dust22/TikTok-Live-TTS-BSR-Injector/refs/heads/main/TTS%20BSR%20v4%2013/data/TikTok-Bridge.json';

function getSplashMessage() {
    return new Promise((resolve) => {

        const url = new URL(SPLASH_MESSAGE_URL);
        url.searchParams.set('_', Date.now().toString());

        https.get(url, {
            headers: {
                'User-Agent': 'Emstar233-TikTok-Live-Bridge'
            }
        }, (response) => {

            let body = '';

            response.on('data', chunk => {
                body += chunk;
            });

            response.on('end', () => {
                try {
                    if (response.statusCode !== 200) {
                        throw new Error(
                            `HTTP ${response.statusCode}`
                        );
                    }

                    const data = JSON.parse(body);

                    if (
                        typeof data.message === 'string' &&
                        data.message.trim()
                    ) {
                        resolve(data.message.trim());
                        return;
                    }

                } catch (err) {
                    console.warn(
                        '[Emstar233] Could not parse splash message:',
                        err
                    );
                }

                resolve('Loading Message');
            });

        }).on('error', (err) => {

            console.warn(
                '[Emstar233] Could not load splash message:',
                err
            );

            resolve('Loading Message');
        });
    });
}
function showModSplash() {
    if (splashShown) return;
    splashShown = true;

    try {
        if (typeof document === 'undefined') return;

        const createSplash = () => {
            if (!document.body) return;

            // Don't create it twice
            if (document.getElementById('emstar-mod-splash')) return;

            const splash = document.createElement('div');
            splashWindow = splash;

            splash.id = 'emstar-mod-splash';

            const bannerPath = 'file://' + path.join(__dirname, 'banner1.png');
            const sabersPath = 'file://' + path.join(__dirname, 'star-sabers.png');

            splash.innerHTML = `
                <div class="emstar-splash-panel">

                    <div class="emstar-splash-border"></div>

                    <div class="emstar-splash-content">

                        <div class="emstar-splash-logos">

                            <img
                                src="${bannerPath}"
                                class="emstar-banner"
                            >

                            <img
                                src="${sabersPath}"
                                class="emstar-sabers"
                            >

                        </div>

                        <div class="emstar-splash-status">
                            INITIALISING<span id="emstar-dots">.</span>
                        </div>

                        <div
                            class="emstar-splash-message"
                            id="emstar-splash-message"
                        >
                            Loading Message
                        </div>

                        <div class="emstar-splash-footer">
                            Emstar233 TikTok Live Bridge
                        </div>

                    </div>
                </div>
            `;

            const style = document.createElement('style');

            style.id = 'emstar-mod-splash-style';

            style.textContent = `
                #emstar-mod-splash {
                    position: fixed;
                    inset: 0;

                    width: 100vw;
                    height: 100vh;

                    z-index: 2147483647;

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    background: rgba(0, 0, 0, 0.78);

                    opacity: 0;

                    animation: emstarSplashFadeIn
                        0.45s ease-out forwards;

                    pointer-events: none;

                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;
                }

                .emstar-splash-footer {
                    color: rgba(255, 255, 255, 0.9) !important;
                    font-size: 20px !important;
                    letter-spacing: 1.5px;
                    text-shadow: 
                        0 0 6px rgba(255, 255, 255, 0.35),
                        0 0 12px rgba(160, 80, 255, 0.35) !important;
                    filter:
                        drop-shadow(0 0 6px rgba(160, 80, 255, 0.8))
                        drop-shadow(0 0 14px rgba(160, 80, 255, 0.45));
                    line-height: 1.2;
                }

                .emstar-splash-panel {
                    position: relative;

                    width: 620px;
                    height: 360px;

                    overflow: hidden;

                    border-radius: 14px;

                    background: #08080c;

                    box-shadow:
                        0 25px 80px rgba(0,0,0,0.8),
                        0 0 40px rgba(255,255,255,0.08);
                }

                /*
                 * Stationary border.
                 */
                .emstar-splash-panel::before {
                    content: "";

                    position: absolute;

                    inset: 0;

                    border-radius: 14px;

                    border: 1px solid
                        rgba(255,255,255,0.12);

                    pointer-events: none;

                    z-index: 4;
                }

                /*
                 * The moving "snake".
                 *
                 * This is clipped to the border area so
                 * the entire box doesn't spin.
                 */
                .emstar-splash-border {
                    position: absolute;
                    inset: 0;

                    border-radius: 14px;

                    pointer-events: none;

                    z-index: 3;

                    overflow: hidden;
                }

                .emstar-splash-border::before {
                    content: "";

                    position: absolute;

                    width: 90px;
                    height: 90px;

                    top: -45px;
                    left: -45px;

                    border-radius: 50%;

                    background:
                        radial-gradient(
                            circle,
                            rgba(190, 90, 255, 1) 0%,
                            rgba(145, 55, 255, 0.85) 15%,
                            rgba(90, 40, 255, 0.35) 35%,
                            rgba(60, 20, 180, 0) 70%
                        );

                    filter:
                        blur(5px)
                        drop-shadow(0 0 12px rgba(160, 70, 255, 1))
                        drop-shadow(0 0 25px rgba(90, 40, 255, 0.7));

                    animation:
                        emstarBorderLight 3.2s linear infinite;
                }

                /*
                 * Cut the middle out of the rotating
                 * gradient so only the border remains.
                 */
                .emstar-splash-border::after {
                    content: "";

                    position: absolute;

                    inset: 0;

                    border-radius: 14px;

                    border: 1px solid rgba(145, 60, 255, 0.18);

                    box-shadow:
                        inset 0 0 12px rgba(110, 40, 255, 0.08);

                    pointer-events: none;
                }

                /*
                 * The light travels around the four edges.
                 */
                @keyframes emstarBorderLight {

                    0% {
                        top: -45px;
                        left: -45px;
                    }

                    24% {
                        top: -45px;
                        left: calc(100% - 45px);
                    }

                    25% {
                        top: -45px;
                        left: calc(100% - 45px);
                    }

                    49% {
                        top: calc(100% - 45px);
                        left: calc(100% - 45px);
                    }

                    50% {
                        top: calc(100% - 45px);
                        left: calc(100% - 45px);
                    }

                    74% {
                        top: calc(100% - 45px);
                        left: -45px;
                    }

                    75% {
                        top: calc(100% - 45px);
                        left: -45px;
                    }

                    100% {
                        top: -45px;
                        left: -45px;
                    }
                }

                .emstar-splash-content {
                    position: absolute;

                    inset: 0;

                    z-index: 2;

                    display: flex;

                    flex-direction: column;

                    align-items: center;

                    justify-content: center;
                }

                .emstar-splash-logos {
                    display: flex;

                    align-items: center;

                    justify-content: center;

                    gap: 32px;

                    width: 100%;

                    margin-top: -20px;
                }

                .emstar-splash-logos img {
                    display: block;

                    width: auto;
                    height: auto;

                    object-fit: contain;
                }

                .emstar-banner {
                    max-width: 245px;
                    max-height: 115px;
                }

                .emstar-sabers {
                    max-width: 245px;
                    max-height: 115px;
                }

                .emstar-splash-status {
                    margin-top: 28px;

                    color:
                        rgba(255,255,255,0.78);

                    font-size: 14px;

                    font-weight: 500;

                    letter-spacing: 3px;

                    text-transform: uppercase;
                }

                #emstar-dots {
                    display: inline-block;

                    width: 22px;

                    text-align: left;
                }

                .emstar-splash-footer {
                    position: absolute;

                    bottom: 17px;

                    color:
                        rgba(255,255,255,0.22);

                    font-size: 9px;

                    letter-spacing: 2px;
                }

                @keyframes emstarSnake {
                    from {
                        transform: rotate(0deg);
                    }

                    to {
                        transform: rotate(360deg);
                    }
                }

                @keyframes emstarSplashFadeIn {
                    from {
                        opacity: 0;
                    }

                    to {
                        opacity: 1;
                    }
                }

                @keyframes emstarSplashFadeOut {
                    from {
                        opacity: 1;
                    }

                    to {
                        opacity: 0;
                    }
                }
            `;

            document.head.appendChild(style);
            document.body.appendChild(splash);

            getSplashMessage().then(message => {
                const messageElement =
                    document.getElementById('emstar-splash-message');

                if (messageElement) {
                    messageElement.textContent = message;
                }
            });

            let dots = 1;

            const dotTimer = setInterval(() => {
                const dotsElement =
                    document.getElementById('emstar-dots');

                if (!dotsElement) {
                    clearInterval(dotTimer);
                    return;
                }

                dots++;

                if (dots > 3) dots = 1;

                dotsElement.textContent =
                    '.'.repeat(dots);

            }, 400);

            setTimeout(() => {
                clearInterval(dotTimer);

                if (!splash.parentNode) return;

                splash.style.animation =
                    'emstarSplashFadeOut 0.6s ease-in forwards';

                setTimeout(() => {
                    try {
                        if (splash.parentNode) {
                            splash.parentNode.removeChild(splash);
                        }

                        if (style.parentNode) {
                            style.parentNode.removeChild(style);
                        }
                    } catch (e) {}

                    splashWindow = null;

                }, 650);

            }, 5000);
        };

        /*
         * servicePreload can execute before the page has
         * created <body>, so wait for it if necessary.
         */
        if (document.body) {
            createSplash();
        } else {
            document.addEventListener(
                'DOMContentLoaded',
                createSplash,
                { once: true }
            );
        }

    } catch (e) {
        splashWindow = null;
    }
}

function closeModSplash() {
    try {
        if (splashWindow &&
            splashWindow.parentNode) {

            splashWindow.parentNode.removeChild(
                splashWindow
            );
        }
    } catch (e) {}

    splashWindow = null;
}

function cacheUserLikeTotalsFromPayload(payload) {
    try {
        if (!payload || typeof payload !== 'object') return;
        const p = (payload && payload.payload && typeof payload.payload === 'object') ? payload.payload : null;
        // Walk entire payload tree with BFS; at every object node check if it's a user-like bag of fields
        // (has id + some like field, or userInteractionInfo sibling, or explicit user/userSpots).
        const visited = new WeakSet();
        const queue = [{ node: payload, parent: null, key: 'root' }];
        const seenNodes = new Set();
        let steps = 0;
        while (queue.length > 0 && steps < 12000) {
            steps++;
            const entry = queue.shift();
            const node = entry.node;
            const parent = entry.parent;
            if (!node) continue;
            if (typeof node !== 'object') continue;
            try {
                if (visited.has(node)) continue;
                visited.add(node);
            } catch(e) {}
            // Candidate user identity at this node:
            const idStr = String(node.id ?? node.userId ?? node.secUserId ?? node.secUid ?? node.toUserId ?? node.fromUserId ?? node.senderId ?? node.memberId ?? '').trim();
            const displayId = String(node.displayId ?? node.uniqueId ?? node.unique_id ?? node.display_id ?? '').trim();
            const nickname = String(node.nickname ?? node.displayName ?? node.name ?? node.nickName ?? node.userName ?? node.username ?? '').trim();
            let userKey = idStr || displayId || nickname;
            // Also check sibling / child userInteractionInfo (per gift payload L14247 saved JSON:
            // { user:{id,name...}, userInteractionInfo:{likeCnt:"139",commentCnt:"0",shareCnt:"0"} }
            // sibling nodes inside same parent message body)
            // ALSO handle 1.34.0 wrapper: publicAreaMessageCommon.userInteractionInfo (parent.user sibling of publicAreaMessageCommon)
            let interactionBag =
                (node && typeof node.userInteractionInfo === 'object' && node.userInteractionInfo !== null) ? node.userInteractionInfo
                : null;
            // If current node is the publicAreaMessageCommon wrapper, grab nested userInteractionInfo and also
            // resolve user via parent.user sibling (common 1.34.0 gift/share layout)
            let publicAreaNode = null;
            if (!interactionBag && node && typeof node.publicAreaMessageCommon === 'object' && node.publicAreaMessageCommon !== null) {
                publicAreaNode = node.publicAreaMessageCommon;
                if (typeof publicAreaNode.userInteractionInfo === 'object' && publicAreaNode.userInteractionInfo !== null) {
                    interactionBag = publicAreaNode.userInteractionInfo;
                }
            }
            const vDirect = normalizeCount(
                node.totalLikeCount ?? node.likeCount ?? node.total ?? node.totalLikes ?? node.diggCount ??
                node.total_likes ?? node.like_total ?? node.likesCount ?? node.likes ??
                node.likeCnt ?? node.like_count ?? null
            );
            const vInteraction = interactionBag ? normalizeCount(
                interactionBag.likeCnt ?? interactionBag.likeCount ?? interactionBag.totalLikeCount ?? interactionBag.totalLikes ??
                interactionBag.likes ?? interactionBag.diggCount ?? null
            ) : null;
            // If current node has interactionBag but no id on itself, try to find id via:
            //  1) sibling node.user.id (original pattern)
            //  2) parent.user.id (node = publicAreaMessageCommon, parent = payload with parent.user = sender)
            //  3) if node = payload itself (publicAreaNode found) → node.user
            if (interactionBag && (!userKey || userKey === '')) {
                let u = null;
                if (node && typeof node.user === 'object' && node.user !== null) u = node.user;
                if (!u && parent && typeof parent.user === 'object' && parent.user !== null) u = parent.user;
                if (u) {
                    const id2 = String(u.id ?? u.userId ?? u.secUid ?? u.secUserId ?? '').trim();
                    const disp2 = String(u.displayId ?? u.uniqueId ?? '').trim();
                    const nick2 = String(u.nickname ?? u.displayName ?? u.name ?? '').trim();
                    userKey = id2 || disp2 || nick2;
                    const vUserInUser = normalizeCount(
                        u.totalLikeCount ?? u.likeCount ?? u.total ?? u.totalLikes ?? u.diggCount ??
                        u.likes ?? u.likeCnt ?? null
                    );
                    if (userKey && typeof vUserInUser === 'number' && vUserInUser > 0) {
                        const prev = globalUserMaxLikes.get(userKey) || 0;
                        if (vUserInUser > prev) globalUserMaxLikes.set(userKey, vUserInUser);
                    }
                }
            }
            // Commit vDirect (current node user-like fields)
            if (userKey && typeof vDirect === 'number' && vDirect >= 0) {
                const prev = globalUserMaxLikes.get(userKey) || 0;
                if (vDirect > prev) globalUserMaxLikes.set(userKey, vDirect);
            }
            // Commit vInteraction (userInteractionInfo.likeCnt = 139 from gift)
            if (userKey && typeof vInteraction === 'number' && vInteraction >= 0) {
                const prev = globalUserMaxLikes.get(userKey) || 0;
                if (vInteraction > prev) globalUserMaxLikes.set(userKey, vInteraction);
            }
            // Enqueue children + sibling user/userInteractionInfo under p
            try {
                const keys = Object.keys(node);
                for (let i = 0; i < keys.length; i++) {
                    const k = keys[i];
                    let v;
                    try { v = node[k]; } catch(e) { v = null; }
                    if (v && typeof v === 'object') {
                        queue.push({ node: v, parent: node, key: k });
                    }
                }
            } catch(e) {}
        }
    } catch(e) {}
}
function getCachedUserLikeMaxFor(userId, displayId, nickname) {
    try {
        const idStr = String(userId || '').trim();
        const dispStr = String(displayId || '').trim();
        const nickStr = String(nickname || '').trim();
        let best = 0;
        [idStr, dispStr, nickStr, (idStr+'|'+dispStr), (dispStr+'|'+nickStr)].forEach(k => {
            if (!k) return;
            const v = globalUserMaxLikes.get(k);
            if (typeof v === 'number' && v > best) best = v;
        });
        return best > 0 ? best : null;
    } catch(e) { return null; }
}
// Bridge reset lives inside maybeBroadcastLiveStart and maybeBroadcastLiveEnd
// (guaranteed there, not via a monkey-patched wrapper that might not fire).
// No extra globals here; globalUserMaxLikesLiveId set in LiveStart body.

function getViewerCountFromPayload(payload) {
    const candidates = [
        payload?.payload?.viewerCount,
        payload?.payload?.count,
        payload?.payload?.audienceCount,
        payload?.payload?.roomAudienceCount,
        payload?.payload?.roomUserCount,
        payload?.payload?.userCount,
        payload?.payload?.onlineUserCount,
        payload?.payload?.memberCount,
        payload?.viewerCount,
        payload?.count,
        payload?.roomUserCount,
        payload?.userCount,
        payload?.onlineUserCount,
        payload?.memberCount
    ];
    for (const c of candidates) {
        if (c === 0 || c === "0") return 0;
        if (c !== undefined && c !== null && c !== "") return c;
    }
    return null;
}

function normalizeCount(value) {
    if (value === 0) return 0;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const noCommas = trimmed.replace(/,/g, '');
        if (/^\d+$/.test(noCommas)) return Number(noCommas);
        const m = /^(\d+(?:\.\d+)?)([kKmMbB])$/.exec(noCommas);
        if (m) {
            const num = Number(m[1]);
            if (!Number.isFinite(num)) return null;
            const suf = String(m[2]).toLowerCase();
            const mult = suf === 'k' ? 1e3 : (suf === 'm' ? 1e6 : 1e9);
            return Math.round(num * mult);
        }
    }
    return null;
}

function parseCompactCountFromText(text) {
    try {
        const s = String(text || '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        if (!s) return null;
        let best = null;
        const re = /(\d+(?:\.\d+)?)(\s*[kKmMbB])?/g;
        let m;
        while ((m = re.exec(s))) {
            const num = Number(m[1]);
            if (!Number.isFinite(num)) continue;
            const suf = (m[2] || '').trim().toLowerCase();
            const mult = suf === 'k' ? 1e3 : (suf === 'm' ? 1e6 : (suf === 'b' ? 1e9 : 1));
            const val = Math.round(num * mult);
            if (best === null || val > best) best = val;
        }
        return best;
    } catch (e) {
        return null;
    }
}

const TOP_GIFTER_MAX = 10;
const topGifterOrder = [];
const topGifterRankByUserKey = new Map();

function getUserKeyFromUser(user) {
    try {
        if (!user || typeof user !== 'object') return '';
        const id = String(user?.id || user?.idStr || '').trim();
        if (id) return `id:${id}`;
        const secUid = String(user?.secUid || '').trim();
        if (secUid) return `secUid:${secUid}`;
        const uniqueId = String(user?.displayId || user?.uniqueId || '').trim();
        if (uniqueId) return `uniqueId:${uniqueId}`;
    } catch (e) {}
    return '';
}

function parseRankFromUrl(url) {
    try {
        const s = String(url || '');
        if (!s) return null;
        const m = /(?:\?|&)rank=(\d+)/.exec(s);
        if (!m) return null;
        const n = normalizeCount(m[1]);
        return n === null ? null : n;
    } catch (e) {
        return null;
    }
}

function deepFindRankFromOpenWebUrl(value) {
    const visited = new Set();
    const queue = [{ v: value, d: 0 }];
    let best = null;
    let steps = 0;

    while (queue.length > 0) {
        const { v, d } = queue.shift();

        steps++;

        if (steps > 5000) break;
        if (v === null || v === undefined) continue;
        if (d > 12) continue;

        if (typeof v !== 'object') continue;
        if (visited.has(v)) continue;

        visited.add(v);

        if (Array.isArray(v)) {
            for (const item of v) {
                queue.push({ v: item, d: d + 1 });
            }
            continue;
        }

        for (const key of Object.keys(v)) {
            const lower = String(key).toLowerCase();
            const next = v[key];

            if (typeof next === 'string' && lower === 'openweburl') {
                const n = parseRankFromUrl(next);

                if (n !== null) {
                    best = best === null ? n : Math.min(best, n);
                }
            }

            queue.push({ v: next, d: d + 1 });
        }
    }

    return best;
}

function recomputeTopGifterRanks() {
    try {
        topGifterRankByUserKey.clear();
        for (let i = 0; i < topGifterOrder.length; i++) {
            topGifterRankByUserKey.set(topGifterOrder[i], i + 1);
        }
    } catch (e) {}
}

function updateTopGifterLeaderboard(userKey, rank) {
    try {
        if (!userKey) return;
        const r = normalizeCount(rank);
        if (r === null || r <= 0) return;
        if (r > TOP_GIFTER_MAX) return;
        const idx = topGifterOrder.indexOf(userKey);
        if (idx >= 0) topGifterOrder.splice(idx, 1);
        const insertAt = Math.min(Math.max(r - 1, 0), TOP_GIFTER_MAX - 1);
        topGifterOrder.splice(insertAt, 0, userKey);
        for (let i = topGifterOrder.length - 1; i >= 0; i--) {
            const k = topGifterOrder[i];
            if (topGifterOrder.indexOf(k) !== i) topGifterOrder.splice(i, 1);
        }
        if (topGifterOrder.length > TOP_GIFTER_MAX) topGifterOrder.length = TOP_GIFTER_MAX;
        recomputeTopGifterRanks();
    } catch (e) {}
}

function getTopGifterRankFor(userKey) {
    try {
        if (!userKey) return 0;
        return topGifterRankByUserKey.get(userKey) || 0;
    } catch (e) {
        return 0;
    }
}

function safeSmallText(s, maxLen = 400) {
    const v = String(s || '').replace(/\s+/g, ' ').trim();
    return v.length > maxLen ? v.slice(0, maxLen) : v;
}

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function isLikelyWebSocketHandshake(data) {
    try {
        if (!data) return false;
        const s = Buffer.isBuffer(data) ? data.toString('utf8', 0, Math.min(data.length, 2048)) : String(data);
        if (!s.startsWith('GET ')) return false;
        const lower = s.toLowerCase();
        return lower.includes('upgrade: websocket') && lower.includes('sec-websocket-key:');
    } catch (e) {
        return false;
    }
}

function tryParseHttpHeaders(buf) {
    try {
        const s = buf.toString('utf8', 0, Math.min(buf.length, 16 * 1024));
        const end = s.indexOf('\r\n\r\n');
        if (end < 0) return null;
        const headerText = s.slice(0, end);
        const lines = headerText.split('\r\n');
        const headers = {};
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const idx = line.indexOf(':');
            if (idx < 0) continue;
            const k = line.slice(0, idx).trim().toLowerCase();
            const v = line.slice(idx + 1).trim();
            headers[k] = v;
        }
        const rest = buf.slice(end + 4);
        return { headers, rest };
    } catch (e) {
        return null;
    }
}

function wsAcceptKey(secWebSocketKey) {
    try {
        const key = String(secWebSocketKey || '').trim();
        if (!key) return '';
        return crypto.createHash('sha1').update(key + WS_GUID, 'utf8').digest('base64');
    } catch (e) {
        return '';
    }
}

function wsSendFrame(socket, opcode, payloadBuf) {
    try {
        const payload = payloadBuf || Buffer.alloc(0);
        const len = payload.length;
        let header;
        if (len < 126) {
            header = Buffer.alloc(2);
            header[0] = 0x80 | (opcode & 0x0f);
            header[1] = len;
        } else if (len < 65536) {
            header = Buffer.alloc(4);
            header[0] = 0x80 | (opcode & 0x0f);
            header[1] = 126;
            header.writeUInt16BE(len, 2);
        } else {
            header = Buffer.alloc(10);
            header[0] = 0x80 | (opcode & 0x0f);
            header[1] = 127;
            header.writeUInt32BE(0, 2);
            header.writeUInt32BE(len >>> 0, 6);
        }
        socket.write(Buffer.concat([header, payload]));
    } catch (e) {}
}

function wsSendJson(socket, obj) {
    try {
        const s = JSON.stringify(obj);
        wsSendFrame(socket, 0x1, Buffer.from(s, 'utf8'));
    } catch (e) {}
}

function wsSendPong(socket, payload) {
    try {
        wsSendFrame(socket, 0xA, payload || Buffer.alloc(0));
    } catch (e) {}
}

function wsTryConsumeFrames(socket) {
    try {
        let buf = socket._wsBuf || Buffer.alloc(0);
        let offset = 0;
        while (true) {
            if (buf.length - offset < 2) break;
            const b0 = buf[offset];
            const b1 = buf[offset + 1];
            const opcode = b0 & 0x0f;
            const masked = (b1 & 0x80) !== 0;
            let len = b1 & 0x7f;
            let headerLen = 2;
            if (len === 126) {
                if (buf.length - offset < 4) break;
                len = buf.readUInt16BE(offset + 2);
                headerLen = 4;
            } else if (len === 127) {
                if (buf.length - offset < 10) break;
                const high = buf.readUInt32BE(offset + 2);
                const low = buf.readUInt32BE(offset + 6);
                if (high !== 0) return;
                len = low >>> 0;
                headerLen = 10;
            }
            const maskLen = masked ? 4 : 0;
            const frameLen = headerLen + maskLen + len;
            if (buf.length - offset < frameLen) break;
            let payload = buf.slice(offset + headerLen + maskLen, offset + frameLen);
            if (masked) {
                const mask = buf.slice(offset + headerLen, offset + headerLen + 4);
                const out = Buffer.alloc(payload.length);
                for (let i = 0; i < payload.length; i++) out[i] = payload[i] ^ mask[i % 4];
                payload = out;
            }
            if (opcode === 0x8) {
                try { socket.end(); } catch (e) {}
                return;
            }
            if (opcode === 0x9) {
                wsSendPong(socket, payload);
            }
            offset += frameLen;
        }
        socket._wsBuf = offset > 0 ? buf.slice(offset) : buf;
    } catch (e) {}
}

function toLegacyWsEvent(type, data) {
    try {
        const t = String(type || '');
        if (t === 'ViewerCount') {
            const n = normalizeCount(data && typeof data === 'object' && 'value' in data ? data.value : data);
            if (n === null) return null;
            return { event: 'roomUser', data: { viewerCount: n } };
        }

        if (t === 'RoomStats') {
            const vc = deepFindViewerCount(data);
            const lt = deepFindLikeTotal(data);
            if (vc === null && lt === null) return null;
            return { event: 'roomUser', data: { viewerCount: vc ?? 0, totalLikeCount: lt ?? 0 } };
        }

        if (t === 'Chat') {
            const p = data?.payload || data || {};
            const common = p?.common || p?.payload?.common || {};
            const method = String(common?.method || '');
            const msgType = String(p?.type || p?.payload?.type || '');
            if (msgType === 'LeaveRoomMsg' || method === 'WebcastLeaveMessage') {
                const user = p?.user || p?.payload?.user || {};
                return { event: 'leave', data: { nickname: String(user?.nickname || ''), userId: String(user?.id || ''), uniqueId: String(user?.displayId || ''), secUid: String(user?.secUid || '') } };
            }
            if (method && method !== 'WebcastChatMessage' && method !== 'WebcastBarrageMessage') return null;
            const user = p?.user || p?.payload?.user || {};
            const comment = String(p?.content || p?.payload?.content || '').trim();
            if (!comment) return null;
            if (comment === '[object Object]') return null;
            if (/^\[object/.test(comment)) return null;
            const nickname = String(user?.nickname || '');
            const uniqueId = String(user?.displayId || '');
            const userId = String(user?.id || '');
            const secUid = String(user?.secUid || '');
            const profilePictureUrl = String(user?.avatarThumb?.urlListList?.[0] || user?.avatarThumb?.urlList?.[0] || '');
            const userKey = getUserKeyFromUser(user);

            const followInfoObj = user?.followInfo || user?.follow_info || p?.followInfo || p?.follow_info || data?.followInfo || data?.follow_info || {};
            const identity = p?.userIdentity || p?.payload?.userIdentity || null;
            const followStatusFromFollowInfo = normalizeCount(followInfoObj?.followStatus ?? followInfoObj?.follow_status);
            const followRoleFromUser = normalizeCount(
                user?.followRole ?? user?.follow_role ?? p?.followRole ?? p?.follow_role ?? followInfoObj?.followRole ?? followInfoObj?.follow_role
            );
            let isModerator = false;
            let isSubscriber = false;
            try {
                if (identity && typeof identity === 'object') {
                    isModerator =
                        identity?.isModeratorOfAnchor === true ||
                        identity?.isModerator === true;
                    isSubscriber =
                        identity?.isSubscriberOfAnchor === true ||
                        identity?.isSubscriber === true ||
                        identity?.isSub === true;
                }
            } catch (e) { isModerator = false; isSubscriber = false; }
            try {
                const ua = user?.userAttr;
                if (ua && typeof ua === 'object') {
                    if (ua?.isAdmin === true) isModerator = true;
                }
            } catch (e) {}
            let followFromIdentity = null;
            try {
                if (identity && typeof identity === 'object') {
                    const isMutual =
                        identity?.isMutualFollowingWithAnchor === true ||
                        identity?.isMutualFollow === true ||
                        identity?.isMutualFollowing === true;
                    const isFollower =
                        identity?.isFollowerOfAnchor === true ||
                        identity?.isFollower === true ||
                        identity?.isFollowing === true ||
                        identity?.isFollowingToAnchor === true;
                    followFromIdentity = isMutual ? 2 : (isFollower ? 1 : 0);
                }
            } catch (e) { followFromIdentity = null; }

            let followRole = followRoleFromUser;
            let followStatus = followStatusFromFollowInfo;
            if (followRole === null || followRole === undefined) followRole = followFromIdentity;
            if (followStatus === null || followStatus === undefined) followStatus = followFromIdentity;
            if (followRole === null || followRole === undefined) {
                const deep = deepFindFollowRole(user);
                if (deep === 0 || deep === 1 || deep === 2) followRole = deep;
            }
            if (followStatus === null || followStatus === undefined) {
                const deep = deepFindFollowStatus(user);
                if (deep === 0 || deep === 1 || deep === 2) followStatus = deep;
            }
            if (followRole === null || followRole === undefined)
                followRole = followStatus;
            if (followRole !== 0 && followRole !== 1 && followRole !== 2)
                followRole = 0;
            if (followStatus !== 0 && followStatus !== 1 && followStatus !== 2)
                followStatus = followRole;

            const followingCount = normalizeCount(followInfoObj?.followingCount ?? followInfoObj?.following_count) ?? 0;
            const followerCount = normalizeCount(followInfoObj?.followerCount ?? followInfoObj?.follower_count) ?? 0;
            const pushStatus = normalizeCount(followInfoObj?.pushStatus ?? followInfoObj?.push_status) ?? 0;
            const likeTotalFromUserDeep = deepFindLikeTotal(user);
            const likeTotalFromPDeep = deepFindLikeTotal(p);
            // Also scan the ENTIRE Chat payload (not just user) for any number keyed like "like"/"digg"/"totalLike" (drifts per-version)
            let likeTotalFromPayloadScan = null;
            try {
                const visited = new WeakSet();
                const stack = [p, data, user];
                let depth = 0;
                while (stack.length && depth < 5000) {
                    depth++;
                    const cur = stack.pop();
                    if (!cur) continue;
                    if (typeof cur !== 'object') continue;
                    try { if (visited.has(cur)) continue; visited.add(cur); } catch(e) {}
                    const keys = Object.keys(cur);
                    for (let ki = 0; ki < keys.length; ki++) {
                        try {
                            const k = keys[ki];
                            if (!k) continue;
                            const kl = String(k).toLowerCase();
                            const v = cur[k];
                            if (kl.includes('like') || kl.includes('digg')) {
                                const num = normalizeCount(v);
                                if (num !== null && num > 0 && (likeTotalFromPayloadScan === null || num > likeTotalFromPayloadScan)) {
                                    likeTotalFromPayloadScan = num;
                                }
                            }
                            if (v && typeof v === 'object') stack.push(v);
                        } catch(e) {}
                    }
                }
            } catch(e) {}
            const totalLikeCountDirect = normalizeCount(
                user?.totalLikeCount ?? user?.likeCount ?? user?.total ?? user?.totalLikes ?? user?.diggCount ??
                p?.user?.totalLikeCount ?? p?.user?.likeCount ?? p?.user?.total ?? p?.user?.totalLikes ?? p?.user?.diggCount ??
                data?.user?.totalLikeCount ?? data?.user?.likeCount ?? data?.user?.total ?? data?.user?.totalLikes ??
                p?.totalLikeCount ?? p?.likeCount ?? p?.total ?? p?.totalLikes ?? p?.diggCount ??
                data?.totalLikeCount ?? data?.likeCount ?? data?.total ?? data?.totalLikes ??
                (likeTotalFromPayloadScan && likeTotalFromPayloadScan > 0 ? likeTotalFromPayloadScan : null) ??
                (likeTotalFromUserDeep && likeTotalFromUserDeep > 0 ? likeTotalFromUserDeep : null) ??
                (likeTotalFromPDeep && likeTotalFromPDeep > 0 ? likeTotalFromPDeep : null)
            ) ?? null;
            // Merge in per-user server-grounded like totals cached from LIKE/GIFT/SHARE/SUB/ENTER events earlier this session.
            // TikTok often sends user.likeCount in LikeMsg payloads even when they don't send it in ChatMsg.
            const cached = getCachedUserLikeMaxFor(userId || user?.id, uniqueId || user?.displayId || user?.uniqueId, nickname || user?.nickname);
            let totalLikeCount = totalLikeCountDirect;
            if (typeof cached === 'number' && cached > 0) {
                if (totalLikeCount === null || cached > totalLikeCount) totalLikeCount = cached;
            }
            const topGifterRankHint =
                normalizeCount(p?.topGifterRank ?? p?.top_gifter_rank ?? user?.topGifterRank ?? user?.top_gifter_rank) ??
                normalizeCount(p?.topVipNo ?? p?.payload?.topVipNo ?? user?.topVipNo) ??
                deepFindTopGifterRank(user) ??
                deepFindRankFromOpenWebUrl(p) ??
                deepFindRankFromOpenWebUrl(user) ??
                0;
            if (userKey && topGifterRankHint) updateTopGifterLeaderboard(userKey, topGifterRankHint);
            const topGifterRank = userKey ? getTopGifterRankFor(userKey) : 0;

            return {
                event: 'chat',
                data: {
                    comment,
                    userId,
                    secUid,
                    uniqueId,
                    nickname,
                    profilePictureUrl,
                    followRole,
                    userBadges: [],
                    userDetails: { createTime: String(common?.createTime || ''), bioDescription: '', profilePictureUrls: profilePictureUrl ? [profilePictureUrl] : [] },
                    followInfo: { followingCount, followerCount, followStatus: followStatus ?? 0, pushStatus },
                    isModerator,
                    isNewGifter: false,
                    isSubscriber,
                    topGifterRank,
                    totalLikeCount,
                    msgId: String(common?.msgId || ''),
                    createTime: String(common?.createTime || '')
                }
            };
        }

        if (t === 'Gift') {
            const p = data?.payload || data || {};
            const common = p?.common || p?.payload?.common || {};
            const user = p?.user || p?.payload?.user || {};
            const nickname = String(user?.nickname || '');
            const userKey = getUserKeyFromUser(user);
            const identity = p?.userIdentity || p?.payload?.userIdentity || null;
            let isModerator = false;
            let isSubscriber = false;
            try {
                if (identity && typeof identity === 'object') {
                    isModerator =
                        identity?.isModeratorOfAnchor === true ||
                        identity?.isModerator === true;
                    isSubscriber =
                        identity?.isSubscriberOfAnchor === true ||
                        identity?.isSubscriber === true ||
                        identity?.isSub === true;
                }
            } catch (e) { isModerator = false; isSubscriber = false; }
            try {
                const ua = user?.userAttr;
                if (ua && typeof ua === 'object') {
                    if (ua?.isAdmin === true) isModerator = true;
                }
            } catch (e) {}
            const giftName = String(p?.giftName || p?.gift?.giftName || p?.gift?.name || '');
            const diamondCount =
                normalizeCount(p?.diamondCount) ??
                normalizeCount(p?.giftDiamondCount) ??
                normalizeCount(p?.gift?.diamondCount) ??
                normalizeCount(p?.gift?.diamondCost) ??
                normalizeCount(p?.gift?.value) ??
                normalizeCount(p?.gift?.price) ??
                0;
            const repeatCount = normalizeCount(p?.repeatCount) ?? normalizeCount(p?.comboCount) ?? 1;
            const giftType = normalizeCount(p?.giftType) ?? normalizeCount(p?.gift?.type) ?? 0;
            const repeatEnd = !!(p?.repeatEnd ?? p?.payload?.repeatEnd ?? true);
            const topGifterRankHint =
                normalizeCount(p?.topGifterRank ?? p?.top_gifter_rank ?? user?.topGifterRank ?? user?.top_gifter_rank) ??
                normalizeCount(p?.topVipNo ?? p?.payload?.topVipNo ?? user?.topVipNo) ??
                deepFindTopGifterRank(p) ??
                deepFindRankFromOpenWebUrl(p) ??
                deepFindRankFromOpenWebUrl(user) ??
                0;
            if (userKey && topGifterRankHint) updateTopGifterLeaderboard(userKey, topGifterRankHint);
            return {
                event: 'gift',
                data: {
                    nickname,
                    userId: String(user?.id || ''),
                    uniqueId: String(user?.displayId || ''),
                    secUid: String(user?.secUid || ''),
                    giftName: giftName || 'gift',
                    diamondCount,
                    giftValue: diamondCount,
                    giftType,
                    repeatCount,
                    repeatEnd,
                    topGifterRank: userKey ? getTopGifterRankFor(userKey) : 0,
                    isModerator,
                    isSubscriber,
                    msgId: String(common?.msgId || ''),
                    createTime: String(common?.createTime || '')
                }
            };
        }

        if (t === 'Follow') {
            const p = data?.payload || data || {};
            const user = p?.user || p?.payload?.user || {};
            const nickname = String(user?.nickname || '');
            return { event: 'follow', data: { nickname, userId: String(user?.id || ''), uniqueId: String(user?.displayId || ''), secUid: String(user?.secUid || '') } };
        }

        if (t === 'Share') {
            const p = data?.payload || data || {};
            const user = p?.user || p?.payload?.user || {};
            const nickname = String(user?.nickname || '');
            return { event: 'share', data: { nickname, userId: String(user?.id || ''), uniqueId: String(user?.displayId || ''), secUid: String(user?.secUid || '') } };
        }

        if (t === 'Subscription') {
            const p = data?.payload || data || {};
            const user = p?.user || p?.payload?.user || {};
            const nickname = String(user?.nickname || '');
            return { event: 'subscribe', data: { nickname, userId: String(user?.id || ''), uniqueId: String(user?.displayId || ''), secUid: String(user?.secUid || '') } };
        }

        if (t === 'Enter') {
            const p = data?.payload || data || {};
            const user = p?.user || p?.payload?.user || {};

            return {
                event: 'enter',
                data: {
                    nickname: String(user?.nickname || ''),
                    userId: String(user?.id || ''),
                    uniqueId: String(user?.displayId || ''),
                    secUid: String(user?.secUid || '')
                }
            };
        }

        if (t === 'Leave') {
            const p = data?.payload || data || {};
            const user = p?.user || p?.payload?.user || {};
            return { event: 'leave', data: { nickname: String(user?.nickname || ''), userId: String(user?.id || ''), uniqueId: String(user?.displayId || ''), secUid: String(user?.secUid || '') } };
        }

        if (t === 'Like') {
            const p = data?.payload || data || {};
            const common = p?.common || p?.payload?.common || {};
            const user = p?.user || p?.payload?.user || {};
            const nickname = String(user?.nickname || '');
            const likeCount = normalizeCount(p?.count) ?? 0;
            const totalLikeCount = normalizeCount(p?.total) ?? normalizeCount(p?.totalLikeCount) ?? normalizeCount(p?.likeCount) ?? null;
            return { event: 'like', data: { nickname, userId: String(user?.id || ''), uniqueId: String(user?.displayId || ''), secUid: String(user?.secUid || ''), likeCount, totalLikeCount, msgId: String(common?.msgId || '') } };
        }

        if (t === 'LikeTotal') {
            const n = normalizeCount(data && typeof data === 'object' && 'value' in data ? data.value : data);
            if (n === null) return null;
            return { event: 'likeTotal', data: { likeCount: 0, totalLikeCount: n } };
        }
    } catch (e) {}
    return null;
}

function findLikesTotalFromLiveDataList() {
    try {
        if (typeof document === 'undefined') return null;
        const lists = Array.from(document.querySelectorAll('[class*="live-data-list"]')).filter(isElementVisibleLoose);
        if (!lists.length) return null;
        const viewer = typeof lastViewerCount === 'number' ? lastViewerCount : null;

        const scoreVal = (val) => {
            let score = 0;
            if (val === null) return -1e9;
            score += Math.min(val, 200000) / 50;
            if (val > 0) score += 40;
            if (viewer !== null) {
                if (val === viewer) score -= 120;
                else score += 60;
                if (val > viewer) score += 20;
            }
            return score;
        };

        for (const list of lists) {
            const items = Array.from(list.querySelectorAll('[class*="live-data-item"]')).filter(isElementVisibleLoose);
            if (!items.length) continue;
            const candidates = [];
            for (const item of items) {
                const valueEl = item.querySelector?.('[class*="value"]') || item;
                const val = parseCountFromElement(valueEl);
                if (val === null) continue;
                candidates.push({ item, val, score: scoreVal(val) });
            }
            if (!candidates.length) continue;
            candidates.sort((a, b) => b.score - a.score);
            return candidates[0].val;
        }
    } catch (e) {}
    return null;
}

function findLikesTotalFromRootSummaryText() {
    try {
        if (typeof document === 'undefined') return null;
        const root = document.getElementById('root') || document.body;
        if (!root) return null;
        const text = safeSmallText(root.innerText || root.textContent || '', 1200);
        if (!text) return null;
        const re =
            /LIVE\s+\d{2}:\d{2}:\d{2}\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?/g;
        let m;
        let last = null;
        while ((m = re.exec(text))) {
            const like = normalizeCount(String(m[9] || '') + String(m[10] || ''));
            if (like !== null) last = like;
        }
        return last;
    } catch (e) {
        return null;
    }
}

function findViewerCountFromRootSummaryText() {
    try {
        if (typeof document === 'undefined') return null;
        const root = document.getElementById('root') || document.body;
        if (!root) return null;
        const text = safeSmallText(root.innerText || root.textContent || '', 1200);
        if (!text) return null;
        const re =
            /LIVE\s+\d{2}:\d{2}:\d{2}\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?\s+([0-9][0-9.,]*)(?:\s*([kKmMbB]))?/g;
        let m;
        let last = null;
        while ((m = re.exec(text))) {
            const viewers = normalizeCount(String(m[1] || '') + String(m[2] || ''));
            if (viewers !== null) last = viewers;
        }
        return last;
    } catch (e) {
        return null;
    }
}

function isElementVisibleLoose(el) {
    try {
        if (!el || !el.getBoundingClientRect) return false;
        const rect = el.getBoundingClientRect();
        if (!rect || rect.width <= 0 || rect.height <= 0) return false;
        const style = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : null;
        if (!style) return true;
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        return true;
    } catch (e) {
        return false;
    }
}

function getLikesLabelForNode(n) {
    try {
        if (!n) return '';
        const tag = String(n.tagName || '').toLowerCase();
        if (tag === 'img') return String(n.getAttribute?.('alt') || '').trim();
        return String(n.getAttribute?.('aria-label') || n.getAttribute?.('title') || '').trim();
    } catch (e) {
        return '';
    }
}

function hasCountHintAttrs(el) {
    try {
        if (!el || !el.getAttribute) return false;
        const keys = ['data-count', 'data-value', 'data-number', 'aria-valuenow', 'data-like-count', 'data-likes', 'data-digg-count'];
        for (const k of keys) {
            const v = el.getAttribute(k);
            if (v !== null && v !== undefined && String(v).trim() !== '') return true;
        }
    } catch (e) {}
    return false;
}

function parseCountFromElement(el) {
    try {
        if (!el) return null;
        const attrKeys = ['data-count', 'data-value', 'data-number', 'aria-valuenow', 'data-like-count', 'data-likes', 'data-digg-count'];
        for (const k of attrKeys) {
            const v = el.getAttribute?.(k);
            const n = normalizeCount(v);
            if (n !== null) return n;
        }
        const txt = safeSmallText(el.innerText || el.textContent || '', 200);
        const direct = parseCompactCountFromText(txt);

        const shortText = (node) => {
            try {
                if (!node) return '';
                const t = safeSmallText(node.innerText || node.textContent || '', 24);
                return String(t || '').replace(/\s+/g, '').trim();
            } catch (e) { return ''; }
        };
        const isFrag = (s) => {
            if (!s) return false;
            if (s.length > 8) return false;
            return /^[0-9.,kKmMbB]+$/.test(s);
        };

        let parts = [];
        try {
            const own = shortText(el);
            if (isFrag(own)) parts.push(own);
            let p = el.previousSibling;
            for (let i = 0; i < 2 && p; i++) {
                const s = shortText(p);
                if (isFrag(s)) parts.unshift(s); else break;
                p = p.previousSibling;
            }
            let n = el.nextSibling;
            for (let i = 0; i < 2 && n; i++) {
                const s = shortText(n);
                if (isFrag(s)) parts.push(s); else break;
                n = n.nextSibling;
            }
        } catch (e) {}

        if (parts.length) {
            const joined = parts.join('');
            const joinedNorm = normalizeCount(joined);
            if (joinedNorm !== null) {
                if (direct === null || joinedNorm > direct) return joinedNorm;
            }
            const joinedParsed = parseCompactCountFromText(joined);
            if (joinedParsed !== null) {
                if (direct === null || joinedParsed > direct) return joinedParsed;
            }
        }

        return direct;
    } catch (e) {
        return null;
    }
}

function tryFindLikeTotalNearAnchor(anchorNode) {
    try {
        if (!anchorNode || typeof document === 'undefined') return null;
        try {
            const lbl = getLikesLabelForNode(anchorNode) || String(anchorNode.innerText || anchorNode.textContent || '');
            const direct = parseCompactCountFromText(lbl);
            if (direct !== null) return direct;
        } catch (e) {}
        const base = (anchorNode.tagName && String(anchorNode.tagName).toLowerCase() === 'img')
            ? (anchorNode.closest?.('button,[role="button"]') || anchorNode.parentElement || anchorNode)
            : anchorNode;
        if (!isElementVisibleLoose(base)) return null;

        const baseRect = base.getBoundingClientRect?.();
        if (!baseRect) return null;

        let root =
            base.closest?.('[role="toolbar"]') ||
            base.closest?.('header') ||
            base.closest?.('[class*="header"]') ||
            base.closest?.('[class*="toolbar"]') ||
            base.closest?.('[class*="chat"]') ||
            base.parentElement;
        if (!root) root = document.body;

        const textBlob = safeSmallText(root.innerText || root.textContent || '', 500);
        const explicit = /likes\s*([0-9][0-9.,]*\s*[kKmMbB]?)/i.exec(textBlob) || /([0-9][0-9.,]*\s*[kKmMbB]?)\s*likes/i.exec(textBlob);
        if (explicit && explicit[1]) {
            const n = parseCompactCountFromText(explicit[1]);
            if (n !== null) return n;
        }

        const candidates = Array.from(root.querySelectorAll('span,div,button'))
            .filter(el => isElementVisibleLoose(el) && ((/\d/.test(String(el.innerText || el.textContent || ''))) || hasCountHintAttrs(el)))
            .slice(0, 900);

        let best = null;
        let bestScore = -1e9;
        for (const el of candidates) {
            const val = parseCountFromElement(el);
            if (val === null) continue;
            const r = el.getBoundingClientRect?.();
            if (!r) continue;
            const cx = (r.left + r.right) / 2;
            const cy = (r.top + r.bottom) / 2;
            const bx = (baseRect.left + baseRect.right) / 2;
            const by = (baseRect.top + baseRect.bottom) / 2;
            const dx = cx - bx;
            const dy = cy - by;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const rightBonus = cx >= baseRect.right - 2 ? 40 : 0;
            const compactBonus = (String(el.innerText || el.textContent || '').trim().length <= 12) ? 15 : 0;
            const score = -dist + rightBonus + compactBonus + Math.min(val, 50000) / 500;
            if (score > bestScore) {
                bestScore = score;
                best = val;
            }
        }

        return best;
    } catch (e) {
        return null;
    }
}

function findLikesTotalFromDom() {
    try {
        if (typeof document === 'undefined') return null;
        const fromRootSummary = findLikesTotalFromRootSummaryText();
        if (fromRootSummary !== null) return fromRootSummary;
        const fromLiveData = findLikesTotalFromLiveDataList();
        if (fromLiveData !== null) return fromLiveData;
        const exact = Array.from(document.querySelectorAll('[aria-label="Likes"],[title="Likes"],img[alt="Likes"]'));
        const textAnchors = exact.length ? [] : Array.from(document.querySelectorAll('button, [role="button"], span, div'))
            .filter(el => {
                try {
                    const t = String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
                    return t === 'Likes';
                } catch (e) {
                    return false;
                }
            })
            .slice(0, 120);
        const nodes = exact.length
            ? exact
            : [
                ...textAnchors,
                ...Array.from(document.querySelectorAll('[aria-label],[title],img[alt]')).slice(0, 2500)
            ];

        let best = null;
        for (const n of nodes) {
            let label = getLikesLabelForNode(n);
            if (!label) {
                try { label = String(n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) { label = ''; }
            }
            if (!label) continue;
            const l = label.trim();
            if (l !== 'Likes' && !l.toLowerCase().includes('likes')) continue;
            const val = tryFindLikeTotalNearAnchor(n);
            if (val === null) continue;
            if (best === null || val > best) best = val;
        }
        return best;
    } catch (e) {
        return null;
    }
}

let likesDomPollerStarted = false;
let likesDomObserver = null;
let likesDomObserverRoot = null;

function ensureLikesDomObserver() {
    try {
        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
        if (!isLikelyChatUiContext()) return;

        const anchors = Array.from(document.querySelectorAll('[aria-label="Likes"],[title="Likes"],img[alt="Likes"]'));
        const anchor = anchors[0] || Array.from(document.querySelectorAll('button, [role="button"], span, div'))
            .find(el => {
                try {
                    const t = String(el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
                    return t === 'Likes';
                } catch (e) {
                    return false;
                }
            }) || null;
        if (!anchor) return;

        const base = (anchor.tagName && String(anchor.tagName).toLowerCase() === 'img')
            ? (anchor.closest?.('button,[role="button"]') || anchor.parentElement || anchor)
            : anchor;
        const root =
            base.closest?.('[role="toolbar"]') ||
            base.closest?.('header') ||
            base.closest?.('[class*="header"]') ||
            base.closest?.('[class*="toolbar"]') ||
            base.closest?.('[class*="chat"]') ||
            base.parentElement ||
            document.body;

        if (likesDomObserver && likesDomObserverRoot === root) return;

        try { likesDomObserver?.disconnect?.(); } catch (e) {}
        likesDomObserver = new MutationObserver(() => {
            try {
                const total = findLikesTotalFromDom();
                if (total !== null) maybeBroadcastLikeTotal(total, 'dom_likes_observer');
            } catch (e) {}
        });
        likesDomObserver.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
        likesDomObserverRoot = root;
    } catch (e) {}
}

function startLikesDomPoller() {
    if (likesDomPollerStarted) return;
    likesDomPollerStarted = true;
    setInterval(() => {
        try {
            if (!broadcastToClients) return;
            if (!isLikelyChatUiContext()) return;
            ensureLikesDomObserver();
            const viewers = findViewerCountFromRootSummaryText();
            if (viewers !== null) maybeBroadcastViewerCount(viewers, 'dom_summary_text');
            const total = findLikesTotalFromDom();
            if (total !== null) maybeBroadcastLikeTotal(total, 'dom_likes_poller');
        } catch (e) {}
    }, 400);
}

function deepFindLikeTotal(value) {
    const visited = new Set();
    const queue = [{ v: value, d: 0 }];
    let best = null;
    let steps = 0;

    const directCandidates = (v) => [
        v?.payload?.totalLikeCount,
        v?.payload?.likeCount,
        v?.payload?.diggCount,
        v?.payload?.total,
        v?.totalLikeCount,
        v?.likeCount,
        v?.diggCount,
        v?.total
    ];

    while (queue.length > 0) {
        const { v, d } = queue.shift();
        steps++;
        if (steps > 5000) break;
        if (v === null || v === undefined) continue;
        if (d > 12) continue;

        for (const c of directCandidates(v)) {
            const n = normalizeCount(c);
            if (n !== null) best = best === null ? n : Math.max(best, n);
        }

        if (typeof v !== 'object') continue;
        if (visited.has(v)) continue;
        visited.add(v);

        if (Array.isArray(v)) {
            for (const item of v) queue.push({ v: item, d: d + 1 });
            continue;
        }

        for (const key of Object.keys(v)) {
            const lower = String(key).toLowerCase();
            const next = v[key];
            if (lower.includes('like') || lower.includes('digg') || lower.includes('heart')) {
                const n = normalizeCount(next);
                if (n !== null) best = best === null ? n : Math.max(best, n);
            }
            queue.push({ v: next, d: d + 1 });
        }
    }

    return best;
}

function deepFindViewerCount(value) {
    const visited = new Set();
    const queue = [{ v: value, d: 0 }];
    let best = null;
    let steps = 0;

    while (queue.length > 0) {
        const { v, d } = queue.shift();
        steps++;
        if (steps > 5000) break;
        if (v === null || v === undefined) continue;
        if (d > 12) continue;

        const direct = normalizeCount(getViewerCountFromPayload(v));
        if (direct !== null) return direct;

        if (typeof v !== 'object') continue;
        if (visited.has(v)) continue;
        visited.add(v);

        if (Array.isArray(v)) {
            for (const item of v) queue.push({ v: item, d: d + 1 });
            continue;
        }

        for (const key of Object.keys(v)) {
            const lower = String(key).toLowerCase();
            const next = v[key];
            if (lower.includes('count') || lower.includes('audience') || lower.includes('viewer') || lower.includes('online') || lower.includes('member')) {
                const c = normalizeCount(next);
                if (c !== null) best = c;
            }
            queue.push({ v: next, d: d + 1 });
        }
    }

    return best;
}

function deepFindFollowRole(value) {
    const visited = new Set();
    const queue = [{ v: value, d: 0 }];
    let best = null;
    let steps = 0;
    while (queue.length > 0) {
        const { v, d } = queue.shift();
        steps++;
        if (steps > 5000) break;
        if (v === null || v === undefined) continue;
        if (d > 12) continue;

        if (typeof v !== 'object') continue;
        if (visited.has(v)) continue;
        visited.add(v);

        if (Array.isArray(v)) {
            for (const item of v) queue.push({ v: item, d: d + 1 });
            continue;
        }

        for (const key of Object.keys(v)) {
            const lower = String(key).toLowerCase();
            const next = v[key];
            if (lower.includes('followrole') || (lower.includes('follow') && lower.includes('role'))) {
                const n = normalizeCount(next);
                if (n === 0 || n === 1 || n === 2) best = best === null ? n : Math.max(best, n);
            }
            queue.push({ v: next, d: d + 1 });
        }
    }
    return best;
}

function deepFindFollowStatus(value) {
    const visited = new Set();
    const queue = [{ v: value, d: 0 }];
    let best = null;
    let steps = 0;
    while (queue.length > 0) {
        const { v, d } = queue.shift();
        steps++;
        if (steps > 5000) break;
        if (v === null || v === undefined) continue;
        if (d > 12) continue;

        if (typeof v !== 'object') continue;
        if (visited.has(v)) continue;
        visited.add(v);

        if (Array.isArray(v)) {
            for (const item of v) queue.push({ v: item, d: d + 1 });
            continue;
        }

        for (const key of Object.keys(v)) {
            const lower = String(key).toLowerCase();
            const next = v[key];
            if (lower.includes('followstatus') || (lower.includes('follow') && lower.includes('status'))) {
                const n = normalizeCount(next);
                if (n === 0 || n === 1 || n === 2) best = best === null ? n : Math.max(best, n);
            }
            queue.push({ v: next, d: d + 1 });
        }
    }
    return best;
}

function deepFindTopGifterRank(value) {
    const visited = new Set();
    const queue = [{ v: value, d: 0 }];
    let best = null;
    let steps = 0;
    while (queue.length > 0) {
        const { v, d } = queue.shift();
        steps++;
        if (steps > 5000) break;
        if (v === null || v === undefined) continue;
        if (d > 12) continue;

        if (typeof v !== 'object') continue;
        if (visited.has(v)) continue;
        visited.add(v);

        if (Array.isArray(v)) {
            for (const item of v) queue.push({ v: item, d: d + 1 });
            continue;
        }

        for (const key of Object.keys(v)) {
            const lower = String(key).toLowerCase();
            const next = v[key];
            if ((lower.includes('top') && lower.includes('gifter') && lower.includes('rank')) || lower === 'topgifterrank') {
                const n = normalizeCount(next);
                if (n !== null) best = best === null ? n : Math.max(best, n);
            }
            queue.push({ v: next, d: d + 1 });
        }
    }
    return best;
}

function maybeBroadcastViewerCount(count, src) {
    if (!broadcastToClients) return;
    if (!liveActive) return;
    const normalized = normalizeCount(count);
    if (normalized === null) return;
    if (normalized === lastViewerCount) return;
    lastViewerCount = normalized;
    broadcastToClients('ViewerCount', { value: normalized, _src: String(src || 'unknown') });
}

function maybeBroadcastLikeTotal(total, src) {
    if (!broadcastToClients) return;
    if (!liveActive) return;
    const normalized = normalizeCount(total);
    if (normalized === null) return;
    if (normalized < 0) return;
    if (normalized === lastLikesTotal) return;
    lastLikesTotal = normalized;
    broadcastToClients('LikeTotal', { value: normalized, _src: String(src || 'unknown') });
}

function maybeBroadcastLiveStart(roomId, source) {
    if (!broadcastToClients) return;
    // === EXPLICIT PER-LIVE RESET (guaranteed here, not monkey-patched wrapper) ===
    // Per-user server-grounded like totals MUST be empty per new live.
    // User explicitly asked: confirm reset on each live session.
    const likesCacheSizeBefore = globalUserMaxLikes.size;
    globalUserMaxLikes.clear();
    globalUserMaxLikesLiveId = null;
    let rid = coerceRoomId(roomId);
    if (!rid) {
        // Fallback: DOM widget started emitting 6 stats but payload room id extractor returned empty.
        // Use deterministic domSessionSeed so dedupe still works (won't fire LiveStart twice for same "dom-" rid).
        if (!domSessionSeed) domSessionSeed = 'dom_' + Math.floor(Math.random() * 0x7fffffff).toString(36) + '_' + Date.now().toString(36);
        rid = domSessionSeed;
    }
    const now = Date.now();
    if (liveActive && liveRoomId === rid) return;
    if (now - lastLiveTransitionAt < 300) return;
    globalUserMaxLikesLiveId = String(rid);
    liveActive = true;
    liveRoomId = rid;
    lastLiveTransitionAt = now;
    lastDomStatsSeenAt = now;
    lastLikesTotal = null;
    lastDiamondCount = null;
    lastEarnedCents = null;
    lastNewFollowersCount = null;
    lastGiftCount = null;
    lastSubscriberCount = null;
    // Reset audit emit — user can verify this fires (shows in Debug Panel → Counters or System filter)
    broadcastToClients('System', {
        message: 'likes_cache_reset',
        scope: 'LiveStart',
        cacheSizeBefore: likesCacheSizeBefore,
        cacheSizeAfter: 0,
        roomId: rid,
        source: String(source || 'unknown'),
        _src: 'live_start_reset_likes_cache_clear'
    });
    broadcastToClients('LikeTotal', { value: 0, _src: 'live_start_reset' });
    broadcastToClients('DiamondCount', { value: 0, _src: 'live_start_reset' });
    broadcastToClients('EarnedCents', { value: 0, _src: 'live_start_reset' });
    broadcastToClients('NewFollowersCount', { value: 0, _src: 'live_start_reset' });
    broadcastToClients('GiftCount', { value: 0, _src: 'live_start_reset' });
    broadcastToClients('SubscriberCount', { value: 0, _src: 'live_start_reset' });
    broadcastToClients('LiveStart', { roomId: rid, source: String(source || ''), likesCacheResetBefore: likesCacheSizeBefore });
}

function maybeBroadcastLiveEnd(reason) {
    if (!broadcastToClients) return;
    if (!liveActive) return;
    const now = Date.now();
    if (now - lastLiveTransitionAt < 300) return;
    const rid = liveRoomId;
    const likesCacheSizeBefore = globalUserMaxLikes.size;
    globalUserMaxLikes.clear();
    globalUserMaxLikesLiveId = null;
    liveActive = false;
    liveRoomId = null;
    lastLiveTransitionAt = now;
    broadcastToClients('System', {
        message: 'likes_cache_reset',
        scope: 'LiveEnd',
        cacheSizeBefore: likesCacheSizeBefore,
        cacheSizeAfter: 0,
        roomId: rid || null,
        reason: String(reason || ''),
        _src: 'live_end_reset_likes_cache_clear'
    });
    broadcastToClients('LiveEnd', { roomId: rid, reason: String(reason || ''), likesCacheResetBefore: likesCacheSizeBefore });
}

function maybeBroadcastDiamondCount(count, src) {
    if (!broadcastToClients) return;
    if (!liveActive) return;
    const n = normalizeCount(count);
    if (n === null) return;
    if (n === lastDiamondCount) return;
    lastDiamondCount = n;
    broadcastToClients('DiamondCount', { value: n, _src: String(src || 'unknown') });
}

function maybeBroadcastEarnedCents(cents, src) {
    if (!broadcastToClients) return;
    if (!liveActive) return;
    const n = normalizeCount(cents);
    if (n === null) return;
    if (n === lastEarnedCents) return;
    lastEarnedCents = n;
    broadcastToClients('EarnedCents', { value: n, _src: String(src || 'unknown') });
}

function maybeBroadcastNewFollowersCount(count, src) {
    if (!broadcastToClients) return;
    if (!liveActive) return;
    const n = normalizeCount(count);
    if (n === null) return;
    if (n === lastNewFollowersCount) return;
    lastNewFollowersCount = n;
    broadcastToClients('NewFollowersCount', { value: n, _src: String(src || 'unknown') });
}

function maybeBroadcastGiftCount(count, src) {
    if (!broadcastToClients) return;
    if (!liveActive) return;
    const n = normalizeCount(count);
    if (n === null) return;
    if (n === lastGiftCount) return;
    lastGiftCount = n;
    broadcastToClients('GiftCount', { value: n, _src: String(src || 'unknown') });
}

function maybeBroadcastSubscriberCount(count, src) {
    if (!broadcastToClients) return;
    if (!liveActive) return;
    const n = normalizeCount(count);
    if (n === null) return;
    if (n === lastSubscriberCount) return;
    lastSubscriberCount = n;
    broadcastToClients('SubscriberCount', { value: n, _src: String(src || 'unknown') });
}

function classifySocialAction(payload) {
    try {
        const outer = payload || {};
        const p = outer?.payload || outer || {};

        const msgType = String(outer?.type || p?.type || p?.payload?.type || '').toLowerCase();
        if (msgType.includes('follow')) return 'Follow';
        if (msgType.includes('share')) return 'Share';

        const displayType = p?.displayType ?? p?.payload?.displayType ?? outer?.displayType ?? outer?.payload?.displayType;
        if (displayType === 2) return 'Share';
        if (displayType === 1) return 'Follow';
        const common = p?.common || p?.payload?.common || outer?.common || outer?.payload?.common || {};
        const describe = String(common?.describe || '');
        const displayText = common?.displayText || {};
        const key = String(displayText?.key || '');
        const defaultPattern = String(displayText?.defaultPattern || '');
        const pieces = displayText?.piecesList || [];
        const blob = `${describe} ${key} ${defaultPattern} ${JSON.stringify(pieces).slice(0, 240)}`.toLowerCase();
        if (blob.includes('share')) return 'Share';
        if (blob.includes('follow')) return 'Follow';
    } catch (e) {}
    return 'Share';
}

function normalizeHeaders(headers) {
    const out = {};
    if (!headers) return out;
    if (headers instanceof Headers) {
        headers.forEach((v, k) => { out[k] = v; });
        return out;
    }
    if (Array.isArray(headers)) {
        for (const [k, v] of headers) out[String(k)] = String(v);
        return out;
    }
    if (typeof headers === 'object') {
        for (const k of Object.keys(headers)) out[String(k)] = String(headers[k]);
        return out;
    }
    return out;
}

function coerceRoomId(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        return trimmed;
    }
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return null;
}

function extractRoomIdFromPayload(payload) {
    try {
        if (!payload || typeof payload !== 'object') return null;
        // Fast path: common 4 direct-level hits from 1.34.0 signal shapes.
        const direct = coerceRoomId(
            payload?.payload?.common?.roomId ||
            payload?.common?.roomId ||
            payload?.payload?.roomId ||
            payload?.roomId
        );
        if (direct) return direct;
        // Slow path (1.34.0 welcome SystemMessage has roomId nested under
        // payload.payload.common.roomId OR payload.payload.common.params.roomId
        // OR deep inside the outer signal wrapper object — BFS anywhere).
        const visited = new WeakSet();
        const q = [payload];
        let steps = 0;
        while (q.length > 0 && steps < 8000) {
            steps++;
            const node = q.shift();
            if (!node || typeof node !== 'object') continue;
            try { if (visited.has(node)) continue; visited.add(node); } catch(e) {}
            const c1 = coerceRoomId(node?.common?.roomId ?? null);
            if (c1) return c1;
            const c2 = coerceRoomId(node?.roomId ?? null);
            if (c2) return c2;
            const c3 = coerceRoomId(node?.params?.roomId ?? null);
            if (c3) return c3;
            const c4 = coerceRoomId(node?.data?.roomId ?? null);
            if (c4) return c4;
            const keys = Object.keys(node);
            for (let i = 0; i < keys.length; i++) {
                const k = keys[i];
                if (k === 'roomId') {
                    const v = coerceRoomId(node[k]);
                    if (v) return v;
                }
                let v;
                try { v = node[k]; } catch(e) { v = null; }
                if (v && typeof v === 'object') q.push(v);
            }
        }
        return null;
    } catch(e) { return null; }
}
function extractRoomIdFromUrl() {
    try {
        if (typeof location === 'undefined' || !location) return null;
        const href = String(location.href || '');
        if (!href) return null;
        try {
            const u = new URL(href);
            const fromParam = coerceRoomId(u.searchParams.get('roomId') || u.searchParams.get('room_id') || u.searchParams.get('roomid'));
            if (fromParam) return fromParam;
        } catch(e) {}
        const m = href.match(/room[\/=_-]?([a-z0-9]{6,})/i);
        if (m && m[1]) return coerceRoomId(m[1]);
    } catch(e) {}
    return null;
}

function broadcastSystem(msg) {
    if (!broadcastToClients) return;
    broadcastToClients('System', msg);
}

function getContextInfo() {
    let href = '';
    let title = '';
    try { href = typeof location !== 'undefined' && location && location.href ? String(location.href) : ''; } catch (e) {}
    try { title = typeof document !== 'undefined' && document && document.title ? String(document.title) : ''; } catch (e) {}
    let type = '';
    try { type = typeof process !== 'undefined' && process && process.type ? String(process.type) : ''; } catch (e) {}
    return { href, title, type };
}

function injectContextIntoData(data, ctx) {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (!data._ctx) data._ctx = ctx;
        return data;
    }
    return { _ctx: ctx, value: data };
}

function sendUpstream(type, data) {
    if (!upstreamSocket || !upstreamConnected) {
        if (upstreamPending.length < 200) upstreamPending.push({ type, data });
        return;
    }
    try {
        const ctx = getContextInfo();
        upstreamSocket.write(JSON.stringify({ type: '__emit', eventType: type, data, ctx }) + '\n');
    } catch (e) {}
}

function ensureUpstreamConnected() {
    if (upstreamConnected || upstreamConnecting) return;
    upstreamConnecting = true;
    try {
        const sock = net.createConnection({ host: '127.0.0.1', port: BRIDGE_PORT }, () => {
            upstreamSocket = sock;
            upstreamConnected = true;
            upstreamConnecting = false;
            let buf = '';
            sock.on('data', (chunk) => {
                try {
                    buf += chunk.toString('utf8');
                    let idx;
                    while ((idx = buf.indexOf('\n')) >= 0) {
                        const line = buf.slice(0, idx).trim();
                        buf = buf.slice(idx + 1);
                        if (!line) continue;
                        let msg = null;
                        try { msg = JSON.parse(line); } catch (e) { msg = null; }
                        if (!msg || typeof msg !== 'object') continue;
                        if (msg.type === '__cmd' && msg.cmd) {
                            handleIncomingCommandFromServer(msg);
                        }
                    }
                } catch (e) {}
            });
            sock.on('error', () => {});
            sock.on('close', () => { upstreamConnected = false; upstreamSocket = null; });
            if (!broadcastToClients) broadcastToClients = (t, d) => sendUpstream(t, d);
            try {
                sock.write(JSON.stringify({ type: '__hello', role: 'upstream', ctx: getContextInfo() }) + '\n');
            } catch (e) {}
            const pending = upstreamPending;
            upstreamPending = [];
            pending.forEach(m => sendUpstream(m.type, m.data));
            broadcastSystem('Upstream bridge connected.');
        });
        sock.on('error', () => {
            upstreamConnecting = false;
            try { sock.destroy(); } catch (e) {}
        });
    } catch (e) {
        upstreamConnecting = false;
    }
}

function startUpstreamObserver() {
    if (!broadcastToClients) broadcastToClients = (t, d) => sendUpstream(t, d);
    ensureUpstreamConnected();
    setInterval(() => ensureUpstreamConnected(), 1500);
}

function isLikelyChatUiContext() {
    try {
        const href = typeof location !== 'undefined' && location && location.href ? String(location.href) : '';
        return href.includes('/html/serviceWindow/') || href.includes('/html/liveChatFloat/') || href.includes('/html/main/') || href.toLowerCase().includes('/html/popupwindow/');
    } catch (e) {
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isElementVisible(el) {
    try {
        if (!el || !el.getBoundingClientRect) return false;
        const rect = el.getBoundingClientRect();
        if (!rect || rect.width < 20 || rect.height < 14) return false;
        const style = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : null;
        if (!style) return true;
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
    } catch (e) {
        return false;
    }
}

function scoreComposer(el) {
    let score = 0;
    try {
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'textarea') score += 30;
        if (tag === 'input') score += 10;
        if (el.isContentEditable) score += 20;
        const ph = String(el.getAttribute?.('placeholder') || '').toLowerCase();
        const aria = String(el.getAttribute?.('aria-label') || '').toLowerCase();
        const role = String(el.getAttribute?.('role') || '').toLowerCase();
        const idc = `${el.id || ''} ${el.className || ''}`.toLowerCase();
        const txt = `${ph} ${aria} ${role} ${idc}`;
        if (txt.includes('chat')) score += 40;
        if (txt.includes('message')) score += 30;
        if (txt.includes('comment')) score += 25;
        if (txt.includes('search')) score -= 50;
        if (txt.includes('filter')) score -= 20;
        if (isElementVisible(el)) score += 10;
        const rect = el.getBoundingClientRect?.();
        if (rect && rect.bottom > (window.innerHeight || 0) * 0.55) score += 15;
    } catch (e) {}
    return score;
}

function findChatComposer() {
    if (typeof document === 'undefined') return null;
    const candidates = [];
    try {
        const inputs = Array.from(document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]'));
        for (const el of inputs) {
            if (!isElementVisible(el)) continue;
            candidates.push(el);
        }
    } catch (e) {}

    let best = null;
    let bestScore = -1e9;
    for (const el of candidates) {
        const s = scoreComposer(el);
        if (s > bestScore) {
            bestScore = s;
            best = el;
        }
    }
    return best;
}

function describeElement(el) {
    try {
        const tag = (el.tagName || '').toUpperCase();
        const ph = String(el.getAttribute?.('placeholder') || '');
        const aria = String(el.getAttribute?.('aria-label') || '');
        const role = String(el.getAttribute?.('role') || '');
        const title = String(el.getAttribute?.('title') || '');
        const id = String(el.id || '');
        const cls = String(el.className || '');
        const type = String(el.getAttribute?.('type') || '');
        const disabled = String(!!(el.disabled || el.getAttribute?.('aria-disabled') === 'true'));
        return `${tag} id="${id}" class="${cls.slice(0, 120)}" role="${role}" type="${type}" disabled="${disabled}" title="${title.slice(0, 120)}" placeholder="${ph.slice(0, 120)}" aria="${aria.slice(0, 120)}"`;
    } catch (e) {
        return 'unknown-element';
    }
}

function getActionText(el) {
    try {
        if (!el) return '';
        const parts = [];
        const aria = String(el.getAttribute?.('aria-label') || '').trim();
        const title = String(el.getAttribute?.('title') || '').trim();
        const dt = String(el.getAttribute?.('data-tooltip') || el.getAttribute?.('data-tip') || el.getAttribute?.('data-original-title') || '').trim();
        const imgAlt = String(el.querySelector?.('img[alt]')?.getAttribute?.('alt') || '').trim();
        if (aria) parts.push(aria);
        if (title) parts.push(title);
        if (dt) parts.push(dt);
        if (imgAlt) parts.push(imgAlt);
        return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 240);
    } catch (e) {
        return '';
    }
}

function isTransparentColor(c) {
    const s = String(c || '').trim().toLowerCase();
    if (!s) return true;
    if (s === 'transparent') return true;
    if (s.startsWith('rgba(') && s.endsWith(')')) {
        const parts = s.slice(5, -1).split(',').map(x => x.trim());
        const a = parts.length >= 4 ? Number(parts[3]) : NaN;
        if (Number.isFinite(a) && a === 0) return true;
    }
    return false;
}

function findComposerBar(composerEl) {
    try {
        let cur = composerEl;
        for (let i = 0; i < 7 && cur; i++) {
            const rect = cur.getBoundingClientRect?.();
            if (rect && rect.width >= 220 && rect.height >= 24 && rect.height <= 140) {
                const style = window.getComputedStyle?.(cur);
                const bg = style ? style.backgroundColor : '';
                const br = style ? style.borderColor : '';
                if (!isTransparentColor(bg) || (!isTransparentColor(br) && style.borderStyle !== 'none')) {
                    return cur;
                }
            }
            cur = cur.parentElement;
        }
    } catch (e) {}
    return null;
}

function isLikelyBadActionButton(btn) {
    try {
        const cls = String(btn?.className || '').toLowerCase();
        if (cls.includes('setting-icon') || cls.includes('settings') || cls.includes('dock') || cls.includes('undock') || cls.includes('pin')) return true;
        const desc = describeElement(btn);
        const hint = getButtonHint(btn);
        const label = getActionText(btn);
        const score = getSendKeywordScore(`${desc} ${label}`) + getButtonHintScore(hint);
        return score <= -25;
    } catch (e) {
        return false;
    }
}

function findSendButtonToRightOfBar(barEl) {
    try {
        if (!barEl || typeof document === 'undefined') return null;
        const barRect = barEl.getBoundingClientRect?.();
        if (!barRect) return null;

        const all = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'));
        const candidates = [];
        for (const b of all) {
            if (!isElementVisible(b)) continue;
            if (b.disabled === true) continue;
            if (String(b.getAttribute?.('aria-disabled') || '').toLowerCase() === 'true') continue;
            const r = b.getBoundingClientRect?.();
            if (!r) continue;
            const vOverlap = r.bottom >= barRect.top - 22 && r.top <= barRect.bottom + 22;
            if (!vOverlap) continue;
            if (r.left < barRect.right + 2) continue;
            if (r.left > barRect.right + 320) continue;
            candidates.push(b);
        }

        if (!candidates.length) return null;

        candidates.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            return ra.left - rb.left;
        });

        for (const b of candidates) {
            if (!isLikelyBadActionButton(b)) return b;
        }
        return candidates[0] || null;
    } catch (e) {
        return null;
    }
}

function getRectForLog(el) {
    try {
        const r = el?.getBoundingClientRect?.();
        if (!r) return null;
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
    } catch (e) {
        return null;
    }
}

function getComputedForLog(el) {
    try {
        const s = window.getComputedStyle?.(el);
        if (!s) return null;
        const bg = String(s.backgroundImage || '');
        const mask = String(s.maskImage || '');
        const webkitMask = String(s.webkitMaskImage || '');
        const cursor = String(s.cursor || '');
        return {
            cursor,
            backgroundImage: bg && bg !== 'none' ? bg.slice(0, 180) : '',
            maskImage: mask && mask !== 'none' ? mask.slice(0, 180) : '',
            webkitMaskImage: webkitMask && webkitMask !== 'none' ? webkitMask.slice(0, 180) : ''
        };
    } catch (e) {
        return null;
    }
}

function getHtmlForLog(el, maxLen = 260) {
    try {
        const html = String(el?.outerHTML || '');
        if (!html) return '';
        const compact = html.replace(/\s+/g, ' ').trim();
        return compact.length > maxLen ? compact.slice(0, maxLen) : compact;
    } catch (e) {
        return '';
    }
}

function isClickableElement(el) {
    try {
        if (!el) return false;
        const tag = String(el.tagName || '').toLowerCase();
        if (tag === 'button') return true;
        if (tag === 'input') {
            const type = String(el.getAttribute?.('type') || '').toLowerCase();
            if (type === 'button' || type === 'submit') return true;
        }
        const role = String(el.getAttribute?.('role') || '').toLowerCase();
        if (role === 'button') return true;
        if (typeof el.onclick === 'function') return true;
        const tabIndex = Number(el.tabIndex);
        if (Number.isFinite(tabIndex) && tabIndex >= 0) {
            const s = window.getComputedStyle?.(el);
            const cursor = s ? String(s.cursor || '').toLowerCase() : '';
            if (cursor === 'pointer') return true;
        }
    } catch (e) {}
    return false;
}

function getClickableFromPoint(x, y) {
    try {
        let el = document.elementFromPoint(x, y);
        for (let i = 0; i < 7 && el; i++) {
            if (isClickableElement(el) && isElementVisible(el)) {
                if (el.disabled === true) return null;
                if (String(el.getAttribute?.('aria-disabled') || '').toLowerCase() === 'true') return null;
                return el;
            }
            el = el.parentElement;
        }
    } catch (e) {}
    return null;
}

function scanClickablesAlongLine(y, startX, endX, step = 8) {
    const results = [];
    try {
        const seen = new Set();
        for (let x = startX; x <= endX; x += step) {
            const el = getClickableFromPoint(x, y);
            if (!el) continue;
            const rect = getRectForLog(el);
            const key = `${el.tagName || ''}|${el.id || ''}|${el.className || ''}|${rect ? `${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.w)}:${Math.round(rect.h)}` : 'norect'}`;
            if (seen.has(key)) continue;
            seen.add(key);
            results.push(el);
        }
    } catch (e) {}
    return results;
}

function exportButtonInfo(btn, extra = {}) {
    try {
        const desc = describeElement(btn);
        const hint = getButtonHint(btn);
        const label = getActionText(btn);
        const rect = getRectForLog(btn);
        const computed = getComputedForLog(btn);
        const html = getHtmlForLog(btn);
        return { desc, hint, label, rect, computed, html, ...extra };
    } catch (e) {
        return { desc: 'unknown', hint: '', label: '', rect: null, computed: null, html: '', ...extra };
    }
}

function findSendButtonByBarEndHitTest(barEl) {
    try {
        if (!barEl || !barEl.getBoundingClientRect) return { button: null, candidates: [] };
        const r = barEl.getBoundingClientRect();
        const y = Math.round((r.top + r.bottom) / 2);
        const startX = Math.round(Math.max(2, r.right - 6));
        const endX = Math.round(Math.min((window.innerWidth || 0) - 2, r.right + 360));
        const els = scanClickablesAlongLine(y, startX, endX, 8);
        const candidates = els.map((b, idx) => exportButtonInfo(b, { idx }));

        const scorePick = (el) => {
            try {
                const info = exportButtonInfo(el);
                const rect = info.rect;
                const sizePenalty = rect && (rect.w > 140 || rect.h > 120) ? -200 : 0;
                const cursorBonus = info.computed && String(info.computed.cursor || '').toLowerCase() === 'pointer' ? 40 : 0;
                const blob = `${info.hint || ''} ${info.label || ''} ${info.html || ''} ${info.desc || ''}`.toLowerCase();
                const sendBonus = (blob.includes('tt-live-comment-input-post') || blob.includes('comment-input-post-button') || blob.includes('comment-input-post')) ? 250 : 0;
                const sendCommentBonus = blob.includes('send') && blob.includes('comment') ? 80 : 0;
                const emojiPenalty = blob.includes('emoji') ? -250 : 0;
                const badPenalty = isLikelyBadActionButton(el) ? -250 : 0;
                return sizePenalty + cursorBonus + sendBonus + sendCommentBonus + emojiPenalty + badPenalty;
            } catch (e) {
                return -1e9;
            }
        };

        let best = null;
        let bestScore = -1e9;
        for (const el of els) {
            const s = scorePick(el);
            if (s > bestScore) {
                bestScore = s;
                best = el;
            }
        }

        const pick = best && bestScore > -200 ? best : (els.find(b => !isLikelyBadActionButton(b)) || null);
        return { button: pick, candidates, elements: els };
    } catch (e) {
        return { button: null, candidates: [] };
    }
}

function getClickableButtonsAround(el) {
    if (!el || typeof document === 'undefined') return [];
    const root = el.closest?.('form') || el.closest?.('[role="form"]') || el.parentElement;
    const scopes = [];
    if (root) scopes.push(root);
    scopes.push(document);

    const btns = [];
    for (const scope of scopes) {
        try {
            for (const b of Array.from(scope.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'))) {
                if (!isElementVisible(b)) continue;
                if (b.disabled === true) continue;
                if (String(b.getAttribute?.('aria-disabled') || '').toLowerCase() === 'true') continue;
                btns.push(b);
            }
        } catch (e) {}
        if (btns.length) break;
    }
    return btns;
}

function getSendKeywordScore(textBlob) {
    const blob = String(textBlob || '').toLowerCase();
    if (!blob) return 0;
    const positives = [
        'send', 'post', 'publish', 'submit',
        'comment', 'chat', 'message',
        '发送', '發送', '发布', '發佈', '提交', '发送消息', '發送訊息'
    ];
    const negatives = ['search', 'filter', 'close', 'cancel', 'setting', 'settings', 'dock', 'undock', 'pin', 'unpin', 'layout', 'panel', 'more'];
    let score = 0;
    for (const p of positives) if (blob.includes(p)) score += 25;
    for (const n of negatives) if (blob.includes(n)) score -= 25;
    return score;
}

function getButtonHint(btn) {
    try {
        if (!btn) return '';
        const use = btn.querySelector?.('use');
        const href = String(use?.getAttribute?.('href') || use?.getAttribute?.('xlink:href') || '');
        const svgClass = String(btn.querySelector?.('svg')?.getAttribute?.('class') || '');
        const dataKeys = [];
        if (btn.getAttributeNames) {
            for (const n of btn.getAttributeNames()) {
                const nl = String(n || '').toLowerCase();
                if (nl.startsWith('data-') || nl.startsWith('aria-')) dataKeys.push(`${nl}=${String(btn.getAttribute(n) || '').slice(0, 80)}`);
            }
        }
        return `${href} ${svgClass} ${dataKeys.join(' ')}`.trim().slice(0, 240);
    } catch (e) {
        return '';
    }
}

function getButtonHintScore(hint) {
    const h = String(hint || '').toLowerCase();
    if (!h) return 0;
    const positives = ['send', 'paper', 'plane', 'submit', 'post', 'comment', 'chat', 'message'];
    const negatives = ['dock', 'undock', 'pin', 'unpin', 'layout', 'panel', 'setting', 'settings', 'gear', 'close', 'fold', 'expand'];
    let score = 0;
    for (const p of positives) if (h.includes(p)) score += 35;
    for (const n of negatives) if (h.includes(n)) score -= 45;
    return score;
}

function scoreButtonForComposer(btn, composerRect) {
    let score = 0;
    try {
        const tag = (btn.tagName || '').toLowerCase();
        if (tag === 'button') score += 10;
        const type = String(btn.getAttribute?.('type') || '').toLowerCase();
        if (type === 'submit') score += 20;

        const text = String(btn.innerText || '').trim();
        const aria = String(btn.getAttribute?.('aria-label') || '').trim();
        const title = String(btn.getAttribute?.('title') || '').trim();
        const label = getActionText(btn);
        const idc = `${btn.id || ''} ${btn.className || ''}`.toLowerCase();
        score += getSendKeywordScore(`${text} ${aria} ${title} ${label} ${idc}`);

        const hint = getButtonHint(btn);
        score += getButtonHintScore(hint);

        const rect = btn.getBoundingClientRect?.();
        if (rect && composerRect) {
            const dx = Math.abs(rect.left - composerRect.right);
            const dy = Math.abs((rect.top + rect.bottom) / 2 - (composerRect.top + composerRect.bottom) / 2);
            score -= Math.min(dx, 800) / 10;
            score -= Math.min(dy, 800) / 10;
            if (rect.left >= composerRect.right - 10) score += 12;
            if (rect.top <= composerRect.bottom + 30 && rect.bottom >= composerRect.top - 30) score += 8;
            if (rect.left >= composerRect.left - 10 && rect.right <= composerRect.right + 220) score += 6;
        }

        if (btn.querySelector && btn.querySelector('svg')) score += 5;
    } catch (e) {}
    return score;
}

function dispatchPointerClickSequence(targetEl) {
    try {
        if (!targetEl || !targetEl.getBoundingClientRect) return false;
        const r = targetEl.getBoundingClientRect();
        const clientX = Math.round(r.left + r.width / 2);
        const clientY = Math.round(r.top + r.height / 2);
        const common = { bubbles: true, cancelable: true, view: window, clientX, clientY, button: 0, buttons: 1 };
        const pe = (type, opts) => {
            try {
                if (typeof PointerEvent === 'function') targetEl.dispatchEvent(new PointerEvent(type, { ...common, pointerId: 1, pointerType: 'mouse', isPrimary: true, ...opts }));
            } catch (e) {}
        };
        pe('pointerover');
        pe('pointerenter');
        pe('pointerdown');
        try { targetEl.dispatchEvent(new MouseEvent('mouseover', common)); } catch (e) {}
        try { targetEl.dispatchEvent(new MouseEvent('mouseenter', common)); } catch (e) {}
        try { targetEl.dispatchEvent(new MouseEvent('mousedown', common)); } catch (e) {}
        pe('pointerup', { buttons: 0 });
        try { targetEl.dispatchEvent(new MouseEvent('mouseup', { ...common, buttons: 0 })); } catch (e) {}
        try { targetEl.dispatchEvent(new MouseEvent('click', { ...common, buttons: 0 })); } catch (e) {}
        return true;
    } catch (e) {
        return false;
    }
}

function clickElementBestEffort(el) {
    try { el?.focus?.(); } catch (e) {}
    const okSeq = dispatchPointerClickSequence(el);
    try { el?.click?.(); } catch (e) {}
    return okSeq;
}

function getButtonDisabledState(btn) {
    try {
        if (!btn) return true;
        if (btn.disabled === true) return true;
        const aria = String(btn.getAttribute?.('aria-disabled') || '').toLowerCase();
        if (aria === 'true') return true;
        const cls = String(btn.className || '').toLowerCase();
        if (cls.includes('disabled')) return true;
    } catch (e) {}
    return false;
}

function snapshotButtonsAroundComposer(el) {
    const composerRect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    return getClickableButtonsAround(el).map(b => {
        let rect = null;
        try {
            const r = b.getBoundingClientRect?.();
            if (r) rect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
        } catch (e) {}
        const desc = describeElement(b);
        const hint = getButtonHint(b);
        return {
            el: b,
            key: `${desc}|${hint}|${rect ? `${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.w)}:${Math.round(rect.h)}` : 'norect'}`,
            desc,
            hint,
            disabled: getButtonDisabledState(b),
            score: scoreButtonForComposer(b, composerRect),
            rect
        };
    });
}

function pickButtonByEnableTransition(before, after) {
    try {
        const afterByKey = new Map(after.map(x => [x.key, x]));
        const transitions = [];
        for (const b of before) {
            const a = afterByKey.get(b.key);
            if (!a) continue;
            if (b.disabled && !a.disabled) transitions.push(a);
        }
        transitions.sort((x, y) => y.score - x.score);
        return transitions[0] || null;
    } catch (e) {
        return null;
    }
}

function getButtonFromPoint(x, y) {
    try {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        const btn = el.closest?.('button, [role="button"], input[type="button"], input[type="submit"]');
        if (!btn) return null;
        if (!isElementVisible(btn)) return null;
        if (btn.disabled === true) return null;
        if (String(btn.getAttribute?.('aria-disabled') || '').toLowerCase() === 'true') return null;
        return btn;
    } catch (e) {
        return null;
    }
}

function findSendButtonByHitTest(composerEl) {
    try {
        if (!composerEl || !composerEl.getBoundingClientRect || typeof document === 'undefined') return null;
        const r = composerEl.getBoundingClientRect();
        if (!r) return null;
        const midY = Math.round((r.top + r.bottom) / 2);
        const startX = Math.round(r.right + 6);
        const endX = Math.round(Math.min((window.innerWidth || 0) - 2, r.right + 280));
        const seen = new Set();
        const candidates = [];

        for (let x = startX; x <= endX; x += 8) {
            const b = getButtonFromPoint(x, midY);
            if (!b) continue;
            let rectKey = 'norect';
            try {
                const br = b.getBoundingClientRect?.();
                if (br) rectKey = `${Math.round(br.left)}:${Math.round(br.top)}:${Math.round(br.width)}:${Math.round(br.height)}`;
            } catch (e) {}
            const key = `${b.tagName}|${b.className || ''}|${b.id || ''}|${rectKey}`;
            if (seen.has(key)) continue;
            seen.add(key);
            candidates.push(b);
        }

        if (!candidates.length) return null;

        const isBad = (b) => {
            try {
                const desc = describeElement(b);
                const hint = getButtonHint(b);
                const score = getSendKeywordScore(desc) + getButtonHintScore(hint);
                return score <= -25;
            } catch (e) {
                return false;
            }
        };

        if (candidates.length >= 2) {
            for (let i = 1; i < candidates.length; i++) {
                const b = candidates[i];
                if (!isBad(b)) return b;
            }
        }
        return !isBad(candidates[0]) ? candidates[0] : null;
    } catch (e) {
        return null;
    }
}

function findSendButtonNear(el) {
    if (!el || typeof document === 'undefined') return null;
    const composerRect = el.getBoundingClientRect?.();
    const btns = getClickableButtonsAround(el);
    if (!btns.length) return null;

    let best = null;
    let bestScore = -1e9;
    for (const b of btns) {
        const s = scoreButtonForComposer(b, composerRect);
        if (s > bestScore) {
            bestScore = s;
            best = b;
        }
    }
    return best;
}

function setComposerText(el, text) {
    if (!el) return;
    try {
        el.focus?.();
    } catch (e) {}

    const t = String(text ?? '');
    try {
        if (el.isContentEditable) {
            el.textContent = t;
            try {
                el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: t, inputType: 'insertText' }));
            } catch (e) {
                try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e2) {}
            }
            return;
        }
    } catch (e) {}

    try {
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'textarea' || tag === 'input') {
            const proto = tag === 'textarea' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            const setter = desc && desc.set ? desc.set : null;
            if (setter) setter.call(el, t);
            else el.value = t;
            try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e2) {}
            try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e3) {}
        }
    } catch (e) {}
}

function readComposerText(el) {
    try {
        if (!el) return '';
        if (el.isContentEditable) return String(el.textContent || '');
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'textarea' || tag === 'input') return String(el.value || '');
        return '';
    } catch (e) {
        return '';
    }
}

function dispatchEnter(el) {
    try {
        const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
        el.dispatchEvent(new KeyboardEvent('keydown', opts));
        el.dispatchEvent(new KeyboardEvent('keypress', opts));
        el.dispatchEvent(new KeyboardEvent('keyup', opts));
    } catch (e) {}
}

function trySubmitFormNear(el) {
    try {
        const form = el && el.closest ? el.closest('form') : null;
        if (!form) return false;
        if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
            return true;
        }
        if (typeof form.dispatchEvent === 'function') {
            const ev = new Event('submit', { bubbles: true, cancelable: true });
            const ok = form.dispatchEvent(ev);
            if (!ok) return true;
        }
        if (typeof form.submit === 'function') {
            form.submit();
            return true;
        }
    } catch (e) {}
    return false;
}

async function sendViaOfficialUi(text) {
    if (!isLikelyChatUiContext()) return { ok: false, reason: 'not_chat_context' };
    const el = findChatComposer();
    if (!el) return { ok: false, reason: 'no_composer' };

    const buttonsBefore = snapshotButtonsAroundComposer(el);
    const before = readComposerText(el);
    setComposerText(el, text);
    await sleep(25);

    const now = readComposerText(el);
    if (!now || now.trim() !== String(text).trim()) {
        await sleep(25);
    }

    const buttonsAfter = snapshotButtonsAroundComposer(el);
    const transitioned = pickButtonByEnableTransition(buttonsBefore, buttonsAfter);
    const bar = findComposerBar(el);
    const barEndPick = bar ? findSendButtonByBarEndHitTest(bar) : { button: null, candidates: [], elements: [] };
    const barBtn = barEndPick?.button || (bar ? findSendButtonToRightOfBar(bar) : null);
    const hitBtn = findSendButtonByHitTest(el);
    const nearBtn = findSendButtonNear(el);
    const composerRect = el.getBoundingClientRect?.() || null;

    const uniq = (arr) => {
        const out = [];
        const seen = new Set();
        for (const x of arr) {
            if (!x || !x.getBoundingClientRect) continue;
            const r = getRectForLog(x);
            const key = `${x.tagName || ''}|${x.id || ''}|${x.className || ''}|${r ? `${Math.round(r.left)}:${Math.round(r.top)}:${Math.round(r.w)}:${Math.round(r.h)}` : 'norect'}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(x);
        }
        return out;
    };

    const scoreSendCandidate = (candidate) => {
        try {
            const info = exportButtonInfo(candidate);
            const rect = info.rect;
            const sizePenalty = rect && (rect.w > 140 || rect.h > 120) ? -200 : 0;
            const cursorBonus = info.computed && String(info.computed.cursor || '').toLowerCase() === 'pointer' ? 40 : 0;
            const blob = `${info.hint || ''} ${info.label || ''} ${info.html || ''} ${info.desc || ''}`.toLowerCase();
            const sendBonus = (blob.includes('tt-live-comment-input-post') || blob.includes('comment-input-post-button') || blob.includes('comment-input-post')) ? 250 : 0;
            const sendCommentBonus = blob.includes('send') && blob.includes('comment') ? 80 : 0;
            const badPenalty = isLikelyBadActionButton(candidate) ? -250 : 0;
            const proximity = composerRect ? scoreButtonForComposer(candidate, composerRect) : 0;
            return sizePenalty + cursorBonus + sendBonus + sendCommentBonus + badPenalty + proximity;
        } catch (e) {
            return -1e9;
        }
    };

    const candidates = uniq([
        transitioned ? transitioned.el : null,
        barBtn,
        hitBtn,
        nearBtn,
        ...(barEndPick?.elements || [])
    ]).filter(b => isElementVisible(b));

    candidates.sort((a, b) => scoreSendCandidate(b) - scoreSendCandidate(a));
    const debugPicked = transitioned
        ? { mode: 'enabled_transition', score: transitioned.score, desc: transitioned.desc, hint: transitioned.hint }
        : (barBtn ? { mode: 'bar_right', ...exportButtonInfo(barBtn) }
            : (hitBtn ? { mode: 'hit_test', desc: describeElement(hitBtn), hint: getButtonHint(hitBtn) } : null));

    let usedButton = false;
    let usedSubmit = false;
    let hadEnter = false;
    let clicked = null;

    const targetText = String(text).trim();
    const isStuck = () => {
        const t = readComposerText(el).trim();
        return !!t && t === targetText;
    };

    const tryClick = async (b) => {
        try {
            if (!b) return false;
            usedButton = true;
            clicked = b;
            clickElementBestEffort(b);
            await sleep(80);
            return !isStuck();
        } catch (e) {
            return false;
        }
    };

    let sent = false;
    const labelCandidates = candidates.filter(b => {
        const label = getActionText(b);
        return label && label.includes('Send') && label.includes('comment');
    });

    const firstPass = labelCandidates.length ? labelCandidates : candidates;
    for (const b of firstPass.slice(0, 2)) {
        if (!labelCandidates.length && isLikelyBadActionButton(b)) continue;
        sent = await tryClick(b);
        if (sent) break;
    }

    if (!sent) {
        usedSubmit = trySubmitFormNear(el);
        if (usedSubmit) {
            await sleep(90);
            sent = !isStuck();
        }
    }

    if (!sent) {
        hadEnter = true;
        dispatchEnter(el);
        await sleep(110);
        sent = !isStuck();
    }

    if (!usedButton && !usedSubmit && !hadEnter) {
        return {
            ok: false,
            reason: 'no_send_action',
            composer: describeElement(el),
            picked: debugPicked,
            candidates: buttonsAfter.slice(0, 5).sort((a, b) => b.score - a.score).map(x => ({ score: x.score, desc: x.desc, hint: x.hint, disabled: x.disabled }))
        };
    }

    if (!sent && clicked) {
        clickElementBestEffort(clicked);
        await sleep(120);
    }

    const final = readComposerText(el).trim();
    const ok = final.length === 0 || final !== targetText;
    return { ok, reason: ok ? 'sent' : 'stuck', composer: describeElement(el), hadButton: usedButton, hadSubmit: usedSubmit, before: String(before || '').slice(0, 80), after: String(final || '').slice(0, 80) };
}


function probeUi() {
    if (!isLikelyChatUiContext()) return { ok: false, reason: 'not_chat_context' };
    const el = findChatComposer();
    if (!el) return { ok: false, reason: 'no_composer' };
    const bar = findComposerBar(el);
    const barEndPick = bar ? findSendButtonByBarEndHitTest(bar) : { button: null, candidates: [] };
    const barBtn = barEndPick?.button || (bar ? findSendButtonToRightOfBar(bar) : null);
    const btn = findSendButtonNear(el);
    const composerRect = el.getBoundingClientRect?.();
    const candidates = getClickableButtonsAround(el)
        .map(b => ({
            score: scoreButtonForComposer(b, composerRect),
            desc: describeElement(b),
            hint: getButtonHint(b),
            rect: getRectForLog(b),
            computed: getComputedForLog(b),
            html: getHtmlForLog(b)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

    let allButtons = [];
    try {
        allButtons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'))
            .filter(b => isElementVisible(b))
            .slice(0, 80)
            .map((b, idx) => exportButtonInfo(b, { idx }));
    } catch (e) {}

    let likesAnchors = [];
    try {
        const exact = Array.from(document.querySelectorAll('[aria-label="Likes"],[title="Likes"],img[alt="Likes"]'));
        const textAnchors = exact.length ? [] : Array.from(document.querySelectorAll('button,[role="button"],span,div'))
            .filter(x => {
                try {
                    const t = String(x.innerText || x.textContent || '').replace(/\s+/g, ' ').trim();
                    return t === 'Likes';
                } catch (e) {
                    return false;
                }
            })
            .slice(0, 80);
        likesAnchors = [...exact, ...textAnchors]
            .filter(x => isElementVisibleLoose(x))
            .slice(0, 50)
            .map((x, idx) => ({
                idx,
                desc: describeElement(x),
                label: getActionText(x),
                text: safeSmallText(x.innerText || x.textContent || '', 160),
                rect: getRectForLog(x),
                computed: getComputedForLog(x),
                html: getHtmlForLog(x, 220)
            }));
    } catch (e) {}

    let numberElements = [];
    try {
        const attrKeys = ['data-count', 'data-value', 'data-number', 'aria-valuenow', 'data-like-count', 'data-likes', 'data-digg-count'];
        const els = Array.from(document.querySelectorAll('span,div,button,[role],img')).slice(0, 9000);
        const seen = new Set();
        const out = [];

        const getNumFromEl = (node) => {
            try {
                for (const k of attrKeys) {
                    const v = node.getAttribute?.(k);
                    const n = normalizeCount(v);
                    if (n !== null) return n;
                }
                const label = getActionText(node);
                const fromLabel = parseCompactCountFromText(label);
                if (fromLabel !== null) return fromLabel;
                const txt = safeSmallText(node.innerText || node.textContent || '', 220);
                const n = parseCompactCountFromText(txt);
                return n;
            } catch (e) {
                return null;
            }
        };

        for (const node of els) {
            if (!isElementVisibleLoose(node)) continue;
            const num = getNumFromEl(node);
            if (num === null) continue;
            const rect = getRectForLog(node);
            if (!rect) continue;
            const desc = describeElement(node);
            const cls = String(node.className || '');
            const key = `${desc}|${cls}|${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.w)}:${Math.round(rect.h)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({
                num,
                desc,
                label: getActionText(node),
                text: safeSmallText(node.innerText || node.textContent || '', 220),
                rect,
                computed: getComputedForLog(node),
                html: getHtmlForLog(node, 220)
            });
            if (out.length >= 600) break;
        }

        out.sort((a, b) => (b.num - a.num) || (a.rect.top - b.rect.top) || (a.rect.left - b.rect.left));
        numberElements = out.slice(0, 300);
    } catch (e) {}

    return {
        ok: true,
        composer: describeElement(el),
        bar: bar ? describeElement(bar) : null,
        barSendButton: barBtn ? exportButtonInfo(barBtn) : null,
        barHitCandidates: barEndPick?.candidates || [],
        hasSendButton: !!btn,
        sendButton: btn ? describeElement(btn) : null,
        candidates,
        allButtons,
        likesAnchors,
        likeTotalFromDom: findLikesTotalFromDom(),
        numberElements
    };
}

async function handleIncomingCommandFromServer(msg) {
    try {
        const cmd = String(msg.cmd || '');
        if (cmd === 'send_chat') {
            const text = String(msg.text || '').trim();
            if (!text) return;
            const res = await sendViaOfficialUi(text);
            if (res.ok) sendUpstream('System', `UI send OK (${res.hadButton ? 'button' : (res.hadSubmit ? 'submit' : 'unknown')}): ${text}`);
            else sendUpstream('System', `UI send failed (${res.reason}). ${res.composer ? `composer=${res.composer}` : ''}`);
        } else if (cmd === 'probe_ui') {
            const info = probeUi();
            sendUpstream('Probe', info);
        }
    } catch (e) {}
}

function startBridge() {
    console.log('[TikTok Bridge] v1.28.0 Finalized Interceptor Active...');

    let broadcast = null;
    const sendToUpstreams = (obj) => {
        const payload = JSON.stringify(obj) + '\n';
        clients.forEach(c => {
            try {
                if (c && c._bridgeRole === 'upstream') c.write(payload);
            } catch (e) {}
        });
    };
    const server = net.createServer((socket) => {
        clients.add(socket);
        socket.on('close', () => clients.delete(socket));
        socket.on('error', () => clients.delete(socket));
        socket._bridgeRole = 'client';
        socket._bridgeMode = 'unknown';
        socket._isWebSocket = false;
        socket._hsBuf = null;
        socket._wsBuf = Buffer.alloc(0);
        let buf = '';
        socket.on('data', (chunk) => {
            try {
                if (socket._bridgeMode === 'unknown') {
                    if (socket._hsBuf || isLikelyWebSocketHandshake(chunk)) {
                        socket._hsBuf = socket._hsBuf ? Buffer.concat([socket._hsBuf, chunk]) : Buffer.from(chunk);
                        const parsed = tryParseHttpHeaders(socket._hsBuf);
                        if (!parsed) return;
                        const key = parsed.headers ? parsed.headers['sec-websocket-key'] : '';
                        const accept = wsAcceptKey(key);
                        if (!accept) {
                            try { socket.end(); } catch (e) {}
                            return;
                        }
                        try {
                            socket.write(
                                'HTTP/1.1 101 Switching Protocols\r\n' +
                                'Upgrade: websocket\r\n' +
                                'Connection: Upgrade\r\n' +
                                `Sec-WebSocket-Accept: ${accept}\r\n` +
                                '\r\n'
                            );
                        } catch (e) {}
                        socket._isWebSocket = true;
                        socket._bridgeMode = 'ws';
                        socket._bridgeRole = 'wsclient';
                        socket._hsBuf = null;
                        socket._wsBuf = parsed.rest && parsed.rest.length ? parsed.rest : Buffer.alloc(0);
                        if (socket._wsBuf.length) wsTryConsumeFrames(socket);
                        return;
                    }
                    socket._bridgeMode = 'raw';
                }

                if (socket._bridgeMode === 'ws') {
                    socket._wsBuf = socket._wsBuf && socket._wsBuf.length ? Buffer.concat([socket._wsBuf, chunk]) : Buffer.from(chunk);
                    wsTryConsumeFrames(socket);
                    return;
                }

                buf += chunk.toString('utf8');
                let idx;
                while ((idx = buf.indexOf('\n')) >= 0) {
                    const line = buf.slice(0, idx).trim();
                    buf = buf.slice(idx + 1);
                    if (!line) continue;
                    let msg = null;
                    try { msg = JSON.parse(line); } catch (e) { msg = null; }
                    if (!msg || typeof msg !== 'object') continue;

                    if (msg.type === '__hello' && msg.role === 'upstream') {
                        socket._bridgeRole = 'upstream';
                        continue;
                    }
                    if (msg.type === '__hello' && msg.wantsRaw === true) {
                        socket._wantsRaw = true;
                        continue;
                    }

                    if (msg.type === '__emit' && msg.eventType) {
                        if (!broadcast) continue;
                        const ctx = msg.ctx && typeof msg.ctx === 'object' ? msg.ctx : {};
                        const data = injectContextIntoData(msg.data, ctx);
                        broadcast(String(msg.eventType), data);
                        continue;
                    }

                    if (msg.type === 'send_chat') {
                        const text = String(msg.text || '').trim();
                        if (!text) continue;
                        sendToUpstreams({ type: '__cmd', cmd: 'send_chat', text });
                        if (broadcastToClients) broadcastToClients('System', `Dispatch send_chat: ${text}`);
                        continue;
                    }

                    if (msg.type === 'probe_ui') {
                        sendToUpstreams({ type: '__cmd', cmd: 'probe_ui' });
                        if (broadcastToClients) broadcastToClients('System', 'Dispatch probe_ui');
                        continue;
                    }
                }
            } catch (e) {}
        });
    });

    server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
            console.log('[TikTok Bridge] Bridge port already in use in another window.');
            return;
        }
        console.log('[TikTok Bridge] Server error:', err && err.message ? err.message : String(err));
    });

    server.listen(BRIDGE_PORT, '127.0.0.1', () => {
        broadcast = function (type, data) {
            // Cache server-grounded per-user total likes from any incoming event's payload.user subtree.
            // TikTok attaches user.likeCount / user.totalLikeCount on LikeMsg/GiftMsg/ShareMsg/SubMsg/EnterMsg user subtrees
            // but NOT on every ChatMsg. Cache here globally, then inject into every Chat emit below so the
            // 💗 tag always shows a server-total once seen once this live session.
            try { cacheUserLikeTotalsFromPayload(data); } catch(e) {}
            const payload = JSON.stringify({ type, data }) + '\n';
            const legacy = toLegacyWsEvent(type, data);
            clients.forEach(c => {
                try {
                    if (c && c._bridgeRole === 'upstream') return;
                    if (c && c._isWebSocket) {
                        if (legacy) wsSendJson(c, legacy);
                    } else {
                        if (c && c._wantsRaw) c.write(payload);
                        else if (legacy) c.write(JSON.stringify(legacy) + '\n');
                        else c.write(payload);
                    }
                } catch(e) { clients.delete(c); }
            });
        };
        broadcastToClients = broadcast;

        (function startDirectIpcPolling() {
            // REMOVED: Direct IPC polling was invoking random IPC channels from renderer and not producing useful data,
            // plus it caused unnecessary overhead. Keeping the original services.signal-only bridge.
        })();

        const hookSignals = setInterval(() => {
            if (typeof window !== 'undefined' && window.__ls_plugin_require_external__) {
                try {
                    const services = window.__ls_plugin_require_external__('@services/index');
                    if (services && services.signal) {
                        clearInterval(hookSignals);
                        console.log('[TikTok Bridge] Hooking all target events...');

                        const rawSignalCounts = Object.create(null);
                        const subscribedSignals = new Set();
                        const emitRawSignal = (internalName, payload) => {
                            try {
                                if (!broadcastToClients) return;
                                const k = String(internalName || '');
                                rawSignalCounts[k] = (rawSignalCounts[k] || 0) + 1;
                                const c = rawSignalCounts[k];
                                broadcastToClients('RawSignal', { internalName: k, count: c, ctx: getContextInfo(), payload });
                            } catch (e) {}
                        };

                        const discoverSignalNames = (signal) => {
                            const out = new Set();
                            try {
                                if (!signal || typeof signal !== 'object') return out;

                                if (typeof signal.eventNames === 'function') {
                                    try {
                                        const names = signal.eventNames();
                                        if (Array.isArray(names)) names.forEach(n => out.add(String(n)));
                                    } catch (e) {}
                                }

                                for (const prop of Object.keys(signal)) {
                                    const v = signal[prop];
                                    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;

                                    const keys = Object.keys(v);
                                    if (!keys.length) continue;

                                    keys.forEach(k => out.add(String(k)));
                                }
                            } catch (e) {}
                            return out;
                        };

                        const classifyPayload = (name, payload) => {
                            try {
                                if (!name || typeof name !== 'string') return null;
                                const n = name;
                                const nLower = n.toLowerCase();
                                if (n === 'chatBoxMsg' || nLower.includes('immsgchat') || nLower.includes('chat')) {
                                    const method = payload?.payload?.common?.method || payload?.common?.method || '';
                                    const msgType = payload?.type || payload?.payload?.type || '';
                                    if (msgType === 'EnterRoomMsg' || method === 'WebcastMemberMessage') return { type: 'Enter', payload };
                                    if (msgType === 'LeaveRoomMsg' || method === 'WebcastLeaveMessage') return { type: 'Leave', payload };
                                    if (msgType === 'GiftMsg' || method === 'WebcastGiftMessage') return { type: 'Gift', payload };
                                    if (msgType === 'LikeMsg' || method === 'WebcastLikeMessage') return { type: 'Like', payload };
                                    if (msgType === 'SocialMsg' || method === 'WebcastSocialMessage') {
                                        const action = classifySocialAction(payload);
                                        return { type: action === 'Follow' ? 'Follow' : 'Share', payload };
                                    }
                                    if (method === 'WebcastChatMessage' || method === 'WebcastBarrageMessage' || msgType === 'NormalMsg' || msgType === 'ChatMsg') {
                                        return { type: 'Chat', payload };
                                    }
                                    return { type: 'Chat', payload };
                                }
                                if (nLower.includes('immsgroomuser') || nLower.includes('immsgroomstat')) return { type: 'RoomStats', payload };
                                if (nLower.includes('immsgaudience') || nLower.includes('immsgviewercount') || nLower.includes('roomaudiencecount')) return { type: 'ViewerCount', payload };
                                if (nLower.includes('immsglike') || nLower.includes('immsgdigg')) {
                                    if (nLower.includes('count') || nLower.includes('total')) return { type: 'LikeTotal', payload };
                                    return { type: 'Like', payload };
                                }
                                if (nLower.includes('immsgift') || nLower.includes('immsggift')) return { type: 'Gift', payload };
                                if (nLower.includes('immsgfollow')) return { type: 'Follow', payload };
                                if (nLower.includes('immsgshare') || nLower.includes('immsgsocial')) return { type: 'Share', payload };
                                if (nLower.includes('immsgsub')) return { type: 'Subscription', payload };
                            } catch (e) {}
                            return null;
                        };

                        const trySubscribeAllSignals = () => {
                            try {
                                const names = discoverSignalNames(services.signal);
                                let added = 0;
                                names.forEach(name => {
                                    if (!name || subscribedSignals.has(name)) return;
                                    subscribedSignals.add(name);
                                    try {
                                        if (events[name]) {
                                            added++;
                                            return;
                                        }
                                        services.signal.sub(name, (payload) => {
                                            try { emitRawSignal(name, payload); } catch (e) {}
                                            const classified = classifyPayload(name, payload);
                                            try {
                                                const roomId = extractRoomIdFromPayload(payload);
                                                if (classified && classified.type === 'ViewerCount') {
                                                    if (roomId) maybeBroadcastLiveStart(roomId, name);
                                                    return;
                                                }
                                                if (classified && classified.type === 'LikeTotal') {
                                                    return;
                                                }
                                                if (classified && classified.type === 'RoomStats') {
                                                    return;
                                                }
                                                if (classified && classified.type === 'Like') {
                                                    broadcast('Like', payload);
                                                    return;
                                                }
                                                if (classified && classified.type === 'Gift') { broadcast('Gift', payload); return; }
                                                if (classified && classified.type === 'Follow') { broadcast('Follow', payload); return; }
                                                if (classified && classified.type === 'Share') { broadcast('Share', payload); return; }
                                                if (classified && classified.type === 'Subscription') { broadcast('Subscription', payload); return; }
                                                if (classified && classified.type === 'Enter') {
                                                    broadcast('Enter', payload);
                                                    return;
                                                }
                                                if (classified && classified.type === 'Leave') {
                                                    broadcast('Leave', payload);
                                                    return;
                                                }
                                                if (classified && classified.type === 'Chat') { broadcast('Chat', payload); return; }
                                            } catch (e) {}
                                        });
                                        added++;
                                    } catch (e) {}
                                });
                                if (added > 0) broadcastSystem(`Raw signal discovery: subscribed to ${added} additional signal(s).`);
                            } catch (e) {}
                        };

                        const events = {
                            'chatBoxMsg': 'Chat',
                            'IMMsgGift': 'Gift',
                            'IMMsgFollow': 'Follow',
                            'IMMsgLike': 'Like',
                            'IMMsgLikeMsg': 'Like',
                            'IMMsgLikeMessage': 'Like',
                            'IMMsgDigg': 'Like',
                            'IMMsgLikeEcom': 'Like',
                            'IMMsgShare': 'Share',
                            'IMMsgSocial': 'Share',
                            'IMMsgRoomUserSeq': 'RoomStats',
                            'IMMsgRoomUserSeqMessage': 'RoomStats',
                            'IMMsgRoomStats': 'RoomStats',
                            'IMMsgRoomStatsMessage': 'RoomStats',
                            'IMMsgSubNotify': 'Subscription',
                            'IMMsgRoomAudienceCount': 'ViewerCount',
                            'IMMsgLiveRoomStats': 'RoomStats',
                            'IMMsgLiveRoomStatsMessage': 'RoomStats',
                            'IMMsgAudienceCount': 'ViewerCount',
                            'IMMsgRoomUserCount': 'ViewerCount',
                            'IMMsgDiggCount': 'LikeTotal',
                            'IMMsgLikeCount': 'LikeTotal',
                            'IMMsgTotalLike': 'LikeTotal'
                        };

                        Object.keys(events).forEach(internalName => {
                            try { subscribedSignals.add(internalName); } catch (e) {}
                            try { services.signal.sub(internalName, (payload) => {
                                try { emitRawSignal(internalName, payload); } catch (e) {}
                                const roomId = extractRoomIdFromPayload(payload);
                                if (internalName === 'chatBoxMsg') {
                                    // === PRIMARY LIVE TRIGGER ===
                                    // Exact event saved: RawSignal.chatBoxMsg > RoomMsg > method:SystemMessage
                                    //  content: "Welcome to TikTok LIVE! Have fun interacting..."
                                    //  isWelcome: true
                                    //  payload.common.roomId: REAL TIKTOK ROOM ID (7678430195721702166)
                                    // Fires BEFORE dom 6-icon widget mounts, so counters reset cleanly.
                                    try {
                                        const msgType = payload?.type || payload?.payload?.type;
                                        const method = payload?.payload?.common?.method || payload?.common?.method;
                                        const inner = payload?.payload || payload || {};
                                        const content = String(inner.content || '');
                                        const isWelcomeMsg = !!inner.isWelcome
                                            || (method === 'SystemMessage' && msgType === 'RoomMsg' && content.indexOf('Welcome to TikTok LIVE') !== -1)
                                            || (method === 'SystemMessage' && content.indexOf('Creators must be 18 or older to go LIVE') !== -1);
                                        if (isWelcomeMsg) {
                                            // Try the outer wrapper first, then deep BFS via extractRoomIdFromPayload on
                                            // the real signal payload (since 1.34.0 wraps the welcome message under
                                            // multiple layers like payload.common.roomId OR payload.payload.payload...).
                                            let rid = extractRoomIdFromPayload(payload);
                                            if (!rid && payload && typeof payload === 'object') {
                                                // If the outer services.signal callback didn't pass inner roomId,
                                                // try payload.payload or the welcome message inner content.
                                                rid = extractRoomIdFromPayload({ payload, common: payload?.common, roomId: payload?.roomId || null });
                                            }
                                            try { maybeBroadcastLiveStart(rid, 'chatboxmsg_welcome_system_message'); } catch(e) {}
                                        }
                                    } catch(e) {}
                                    const msgType = payload?.type || payload?.payload?.type;
                                    const method = payload?.payload?.common?.method || payload?.common?.method;
                                    const isEnter = msgType === 'EnterRoomMsg' || method === 'WebcastMemberMessage';
                                    const isLeave = msgType === 'LeaveRoomMsg' || method === 'WebcastLeaveMessage';
                                    if (isEnter) {
                                        broadcast('Enter', payload);
                                        return;
                                    }
                                    if (isLeave) {
                                        broadcast('Leave', payload);
                                        return;
                                    }
                                    if (msgType === 'GiftMsg' || method === 'WebcastGiftMessage') {
                                        broadcast('Gift', payload);
                                        return;
                                    }
                                    if (msgType === 'LikeMsg' || method === 'WebcastLikeMessage') {
                                        broadcast('Like', payload);
                                        return;
                                    }
                                    if (msgType === 'SocialMsg' || method === 'WebcastSocialMessage') {
                                        const action = classifySocialAction(payload);
                                        if (action === 'Follow') broadcast('Follow', payload);
                                        else broadcast('Share', payload);
                                        return;
                                    }
                                    broadcast('Chat', payload);
                                    return;
                                }

                                if (internalName === 'IMMsgRoomAudienceCount') {
                                    if (roomId) maybeBroadcastLiveStart(roomId, internalName);
                                    return;
                                }

                                if (events[internalName] === 'RoomStats') {
                                    return;
                                }

                                if (events[internalName] === 'LikeTotal') {
                                    return;
                                }

                                broadcast(events[internalName], payload);
                            }); } catch (e) {}
                        });

                        trySubscribeAllSignals();
                        const discoveryTimer = setInterval(() => {
                            trySubscribeAllSignals();
                        }, 10000);

                        window._bridge = services;
                    }
                } catch (e) {}
            }
        }, 1000);
    });
}

function startLiveCenterBridge() {
    // Disabled: previous brute-force rewrite (10k+ key enumeration every 1.5s) caused extreme lag
    // and broke the app. Restoring services.signal-only bridge (preloads) as the single data source.
}

function startDomDumpHtml() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window && typeof window.__bridgeDomDumpStarted !== 'undefined') return;
    try { window.__bridgeDomDumpStarted = true; } catch(e) {}
    try {
        const href = typeof location !== 'undefined' && location && location.href ? String(location.href) : '';
        try { broadcastSystem('DomPoll: starting RAW NUMBER DUMP (no filters) href=' + href); } catch(e) {}

        function parseNumber(text) {
            if (typeof text !== 'string') return null;
            let t = text.replace(/[\s,\u00A0\u3000]/g, '');
            if (t.length >= 2 && t.charAt(0) === '$') t = t.slice(1);
            const sfx = t.match(/^([0-9]+(?:\.[0-9]+)?)\s*([kKmM万億亿])([^0-9]|$)/);
            if (sfx) {
                const n = parseFloat(sfx[1]);
                if (!Number.isFinite(n)) return null;
                switch (sfx[2]) {
                    case 'k': case 'K': t = String(Math.round(n * 1000)); break;
                    case 'm': case 'M': t = String(Math.round(n * 1000000)); break;
                    case '万':         t = String(Math.round(n * 10000)); break;
                    case '億': case '亿': t = String(Math.round(n * 100000000)); break;
                }
            }
            if (/^-?[0-9]+\.[0-9]{1,2}$/.test(t)) {
                const f = parseFloat(t);
                if (Number.isFinite(f)) return Math.round(f * 100);
            }
            const only = t.replace(/[^0-9-]/g, '');
            if (!only || only.length > 16) return null;
            if (only === '-') return null;
            const n = parseInt(only, 10);
            if (!Number.isFinite(n)) return null;
            return n;
        }

        function shortCssPath(el) {
            try {
                if (!el) return '';
                const parts = [];
                let node = el;
                let steps = 0;
                while (node && node.nodeType === 1 && parts.length < 6 && steps++ < 20) {
                    let sel = node.nodeName.toLowerCase();
                    if (node.id) { sel += '#' + node.id; parts.unshift(sel); break; }
                    let cls = '';
                    if (node.className && typeof node.className === 'string') {
                        const c = node.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
                        if (c.length) cls = '.' + c.join('.');
                    }
                    if (!cls && node.parentNode) {
                        let sameType = 0;
                        const sibs = node.parentNode.children;
                        for (let i = 0; i < sibs.length; i++) {
                            if (sibs[i].nodeName === node.nodeName) sameType++;
                            if (sibs[i] === node) { sel += ':nth-of-type(' + sameType + ')'; break; }
                        }
                    }
                    sel += cls;
                    parts.unshift(sel);
                    node = node.parentNode;
                }
                return parts.join(' > ').slice(0, 220);
            } catch(e) { return ''; }
        }

        function scanAllNumbers() {
            const items = [];
            try {
                const body = document.body || document.documentElement;
                if (!body) return items;
                const all = body.querySelectorAll('*');
                const maxEls = Math.min(all.length, 1800);
                for (let i = 0; i < maxEls; i++) {
                    try {
                        const el = all[i];
                        if (!el || !el.tagName) continue;
                        const tn = String(el.tagName).toUpperCase();
                        if (/^(SCRIPT|STYLE|SVG|TEMPLATE|LINK|META|NOSCRIPT|BR|HR|IFRAME)$/.test(tn)) continue;
                        const childEls = el.children ? el.children.length : 0;
                        if (childEls > 1) continue;
                        const textRaw = el.textContent || '';
                        const text = typeof textRaw === 'string' ? textRaw.trim().replace(/\s+/g, ' ').slice(0, 120) : '';
                        if (!text) continue;
                        const n = parseNumber(text);
                        if (n === null) continue;
                        let x = -1, y = -1, w = 0, h = 0;
                        try {
                            if (typeof el.getBoundingClientRect === 'function') {
                                const r = el.getBoundingClientRect();
                                x = Math.round(r.left); y = Math.round(r.top);
                                w = Math.round(r.width); h = Math.round(r.height);
                            }
                        } catch(e) {}
                        const path = shortCssPath(el);
                        items.push({n, x, y, w, h, text, path: path || tn.toLowerCase()});
                        if (items.length > 220) break;
                    } catch(e) {}
                }
            } catch(e) {}
            return items;
        }

        // Direct class extractor — MATCHES STRETCHED SCREENSHOT (6 icons in SINGLE ROW left→right):
        //   idx0 : 💎 DIAMOND
        //   idx1 : 💰 $ EARNED     (cents ×100, $0.00 = 0)
        //   idx2 : 👥👥 VIEWERS
        //   idx3 : ➕👤 NEW FOLLOWERS (0 this whole live, confirmed)
        //   idx4 : ❤️ LIKES       (252 exact match @ live end — LOCKED)
        //   idx5 : 🎁 GIFTS       (same 6-item flex container; appears on row 2 only if chat float is narrow — still same DOM node index)
        // The weird earlier idx1 value=1 from tick 27 was a mid-live widget reset (diamonds went 2 → 0 same scan); not a real stat.
        let lastChatStats = {};
        let chatObserver = null;
        let chatObservedTargets = 0;
        function ensureChatObserver() {
            try {
                if (typeof MutationObserver === 'undefined') return;
                if (chatObserver) return;
                const onAnyChange = () => {
                    try { extractChatFloatStatsOnce(); } catch(e) {}
                };
                chatObserver = new MutationObserver((mutations) => {
                    if (!mutations || !mutations.length) return;
                    if (typeof chatObserver._pending !== 'number') chatObserver._pending = 0;
                    if (chatObserver._pending) return;
                    chatObserver._pending = setTimeout(() => { chatObserver._pending = 0; onAnyChange(); }, 16);
                });
                const findAndObserve = () => {
                    try {
                        // Container 1: chat float pop-out / liveChatFloat window list
                        document.querySelectorAll('div.live-data-list-w3ESVo').forEach(container => {
                            if (container.__chatObserved) return;
                            try {
                                chatObserver.observe(container, { childList: true, subtree: true, characterData: true, attributes: false });
                                container.__chatObserved = true;
                                chatObservedTargets++;
                            } catch(e) {}
                        });
                        document.querySelectorAll('div.live-data-list-w3ESVo div.live-data-item-SjCbz9 div.value-k1sjtk').forEach(valEl => {
                            if (valEl.__chatObserved) return;
                            try {
                                chatObserver.observe(valEl, { childList: true, subtree: true, characterData: true, attributes: false });
                                valEl.__chatObserved = true;
                                chatObservedTargets++;
                            } catch(e) {}
                        });
                        // Container 2: main window liveDataSlot live performance banner (section#liveDataSlot > div.live-banner-wLUZE5 > buttons)
                        document.querySelectorAll('div.live-banner-wLUZE5').forEach(container => {
                            if (container.__chatObserved) return;
                            try {
                                chatObserver.observe(container, { childList: true, subtree: true, characterData: true, attributes: false });
                                container.__chatObserved = true;
                                chatObservedTargets++;
                            } catch(e) {}
                        });
                        document.querySelectorAll('div.live-banner-wLUZE5 div.live-data-item-Zk3aLe span:nth-of-type(1)').forEach(valEl => {
                            if (valEl.__chatObserved) return;
                            try {
                                chatObserver.observe(valEl, { childList: true, subtree: true, characterData: true, attributes: false });
                                valEl.__chatObserved = true;
                                chatObservedTargets++;
                            } catch(e) {}
                        });
                        // NOTE: NO dom #comment-list / banner LiveStart trigger here (caused false LIVE on offline float pane).
                        // LiveStart ONLY fires from chatBoxMsg > SystemMessage.isWelcome:true server message.
                    } catch(e) {}
                };
                findAndObserve();
                let retries = 0;
                const retryObs = setInterval(() => {
                    try {
                        retries++;
                        findAndObserve();
                        if (retries > 10 || chatObservedTargets >= 12) clearInterval(retryObs);
                    } catch(e) {}
                }, 2000);
            } catch(e) {}
        }
        function extractChatFloatStatsOnce() {
            try {
                const setA = document.querySelectorAll('div.live-data-list-w3ESVo div.live-data-item-SjCbz9 div.value-k1sjtk');
                const setB = document.querySelectorAll('div.live-banner-wLUZE5 button.live-data-inner-vifa5_ div.live-data-item-Zk3aLe span:nth-of-type(1)');
                let chosen = (setA && setA.length >= 4) ? setA : (setB && setB.length >= 4 ? setB : null);
                if (!chosen) chosen = (setA && setA.length) ? setA : setB;
                if (!chosen || chosen.length === 0) return;
                const now = Date.now();
                lastDomStatsSeenAt = now;
                const values = [];
                for (let i = 0; i < chosen.length; i++) {
                    try {
                        const el = chosen[i];
                        const text = (el.textContent || '').toString().replace(/\s+/g, ' ').trim();
                        const n = parseNumber(text);
                        values.push({idx: i, text, n});
                    } catch(e) {}
                }
                if (values.length === 0) return;
                // LIVE START FIRES ONLY FROM chatBoxMsg SystemMessage.isWelcome === true.
                // (Previous dom_widget_counter_nonzero_backup caused false LIVE on offline float pane carrying previous live's cached 300+ likes.)
                const byIdx = {};
                values.forEach(v => { byIdx['i'+v.idx] = v.n; });
                const stable = JSON.stringify(byIdx);
                if (lastChatStats._h !== stable) {
                    lastChatStats = byIdx; lastChatStats._h = stable;
                    try {
                        const flat = values.map(v => '#'+v.idx+'='+(v.n===null?'null':v.n)+(v.text!==String(v.n)?' text="'+v.text+'"':'')).join(' ; ');
                        broadcastSystem('ChatFloat6 values=' + values.length + ' | ' + flat);
                    } catch(e) {}
                    // idx0 : diamond, idx1 : earned cents, idx2: viewers, idx3: new followers, idx4: likes, idx5: gifts
                    if (values[0] && values[0].n !== null && typeof values[0].n === 'number') {
                        maybeBroadcastDiamondCount(values[0].n, 'chatfloat_idx0_diamond');
                    }
                    if (values[1] && values[1].n !== null && typeof values[1].n === 'number') {
                        maybeBroadcastEarnedCents(values[1].n, 'chatfloat_idx1_earned');
                    }
                    if (values[2] && values[2].n !== null && typeof values[2].n === 'number') {
                        maybeBroadcastViewerCount(values[2].n, 'chatfloat_idx2_viewers');
                    }
                    if (values[3] && values[3].n !== null && typeof values[3].n === 'number') {
                        maybeBroadcastNewFollowersCount(values[3].n, 'chatfloat_idx3_newfollowers');
                    }
                    if (values[4] && values[4].n !== null && typeof values[4].n === 'number') {
                        maybeBroadcastLikeTotal(values[4].n, 'chatfloat_idx4_likes');
                    }
                    if (values[5] && values[5].n !== null && typeof values[5].n === 'number') {
                        maybeBroadcastGiftCount(values[5].n, 'chatfloat_idx5_gifts');
                    }
                    try {
                        const parts = [];
                        if (values[0] && typeof values[0].n === 'number') parts.push('diamond='      + values[0].n + (values[0].text !== String(values[0].n) ? ' text="' + values[0].text + '"' : ''));
                        if (values[1] && typeof values[1].n === 'number') parts.push('earned_cents=' + values[1].n + (values[1].text !== String(values[1].n) ? ' text="' + values[1].text + '"' : ''));
                        if (values[2] && typeof values[2].n === 'number') parts.push('viewers='      + values[2].n + (values[2].text !== String(values[2].n) ? ' text="' + values[2].text + '"' : ''));
                        if (values[3] && typeof values[3].n === 'number') parts.push('new_followers='+ values[3].n + (values[3].text !== String(values[3].n) ? ' text="' + values[3].text + '"' : ''));
                        if (values[4] && typeof values[4].n === 'number') parts.push('likes='        + values[4].n + (values[4].text !== String(values[4].n) ? ' text="' + values[4].text + '"' : ''));
                        if (values[5] && typeof values[5].n === 'number') parts.push('gifts='        + values[5].n + (values[5].text !== String(values[5].n) ? ' text="' + values[5].text + '"' : ''));
                        if (parts.length) broadcastSystem('ChatFloatStats: ' + parts.join(' ; '));
                    } catch(e) {}
                }
            } catch(e) {}
        }
        function extractChatFloatStats() {
            ensureChatObserver();
            extractChatFloatStatsOnce();
        }

        let tickNum = 0;
        let lastDumpHash = '';
        let htmlDumped = false;
        function tick() {
            tickNum++;
            try {
                // LiveStart fires ONLY from chatBoxMsg > WebcastRoomMsg > method=SystemMessage > isWelcome:true / welcome content.
                // (All DOM/widget-based triggers removed — they all caused false-positive LIVE on offline float pane with old cached values.)
                extractChatFloatStats();
                // LiveEnd fallback: if we were live but last dom widget update > 60s (1 min), end session.
                // (LiveEnd also will fire via any explicit WebcastRoomEndOfLiveMessage if TikTok sends one.)
                const now = Date.now();
                if (liveActive) {
                    const domStatsGone = lastDomStatsSeenAt ? (now - lastDomStatsSeenAt > 60000) : false;
                    if (domStatsGone) {
                        try {
                            maybeBroadcastLiveEnd('dom_live_widget_missing_over_60s_tick_' + tickNum);
                            domSessionSeed = null;
                        } catch(e) {}
                    }
                }
                const items = scanAllNumbers();
                items.sort((a, b) => (a.y - b.y) !== 0 ? (a.y - b.y) : (a.x - b.x));
                const hashBase = items.map(x => x.n + '|' + x.x + ',' + x.y).join('||');
                const newHash = String(hashBase.length) + ':' + (hashBase.length ? simpleHash(hashBase) : 'empty');
                const forceEvery = (tickNum % 60 === 1);
                if (newHash !== lastDumpHash || forceEvery) {
                    lastDumpHash = newHash;
                    try {
                        const line = items.map((x, idx) =>
                            '#' + idx + '=' + x.n
                            + (x.text !== String(x.n) ? ' text="' + x.text + '"' : '')
                            + ' @(' + x.x + ',' + x.y + ' ' + x.w + 'x' + x.h + ')'
                            + ' ' + x.path
                        ).join(' || ');
                        broadcastSystem('DomDump: items=' + items.length + ' tick=' + tickNum + ' | ' + line);
                    } catch(e) {}
                }
                if (tickNum === 2 && !htmlDumped) {
                    htmlDumped = true;
                    try {
                        const body = document.body;
                        const html = body && body.outerHTML ? String(body.outerHTML) : '';
                        const MAX_HTML = 150 * 1024;
                        const head = html.length > MAX_HTML ? html.slice(0, MAX_HTML) + '\n...[TRUNCATED at ' + MAX_HTML + ' of ' + html.length + ' chars]' : html;
                        broadcastSystem('DomHTML tick=' + tickNum + ' size=' + html.length + ' href=' + href + ' HTML:\n' + head);
                    } catch(e) {
                        try { broadcastSystem('DomHTML err: ' + String(e && e.message || e).slice(0, 300)); } catch(e2) {}
                    }
                }
                if (tickNum <= 3) {
                    try { broadcastSystem('DomDump alive tick=' + tickNum + ' total=' + items.length + ' at href=' + href); } catch(e) {}
                }
            } catch(e) {
                if (tickNum <= 3) {
                    try { broadcastSystem('DomDump err tick=' + tickNum + ': ' + String(e && e.message || e).slice(0, 300)); } catch(e2) {}
                }
            }
        }
        function simpleHash(s) {
            let h = 2166136261 >>> 0;
            for (let i = 0; i < s.length && i < 5000; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
            return (h >>> 0).toString(36);
        }
        setTimeout(tick, 1500);
        setInterval(tick, 4000);
    } catch(e) {
        try { broadcastSystem('DomDump init err: ' + String(e && e.message || e).slice(0, 500)); } catch(e2) {}
    }
}

function startWebviewBridge() {
    startDomDumpHtml();
}

try {
    showModSplash();
} catch(e) {}

try {
    startDomDumpHtml();
} catch(e) {}

try {
    if (typeof location !== 'undefined' && location && String(location.href || '').includes('main')) {
        startBridge();
    } else {
        startUpstreamObserver();
        try {
            const href = typeof location !== 'undefined' && location && location.href ? String(location.href) : '';
            const hl = href.toLowerCase();
            try { broadcastSystem('Non-main window start: href=' + href); } catch(e) {}
            if (hl.includes('liveendfeedback')) {
                setTimeout(() => maybeBroadcastLiveEnd('live_end_feedback_window'), 1200);
            }
            // NO CHOICES — start BOTH initializers on every non-main window.
            // They are defensive and no-op if the bridge object isn't present, and retry until it is.
            setTimeout(() => { try { startWebviewBridge(); } catch(e) {} }, 150);
            setTimeout(() => { try { startLiveCenterBridge(); } catch(e) {} }, 400);
            // Also kick off the main services.signal bridge in liveChatFloat windows (existing behavior)
            if (hl.includes('livechatfloat')) {
                setTimeout(startBridge, 8000);
            }
        } catch (e) { try { broadcastSystem('Non-main bootstrap error - ' + String(e && e.message || e)); } catch(e2) {} }
    }
} catch (e) {}
