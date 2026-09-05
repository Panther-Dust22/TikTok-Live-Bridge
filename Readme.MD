# TikTok LIVE Studio Bridge

A local bridge that runs inside **TikTok LIVE Studio** and exposes LIVE data through a simple WebSocket/TCP interface on port `21214`.

It can be used by other applications to receive:

* 👀 Viewer count
* ❤️ Total LIVE likes
* 👋 Viewer enter / leave
* 💬 Chat messages
* 👍 Individual likes
* 🎁 Gifts
* ➕ Follows
* ⭐ Subscriptions
* 🔗 Shares

It can also send chat messages into TikTok LIVE Studio over TCP.

---

## Contents

* [How It Works](#how-it-works)
* [Installation](#installation)

  * [Automatic Installation](#automatic-installation)
  * [Manual Installation](#manual-installation)
  * [TikTok LIVE Studio Updates](#tiktok-live-studio-updates)
* [Connection](#connection)
* [WebSocket Events](#websocket-events)
* [Event Summary](#event-summary)
* [Event Data](#event-data)

  * [Viewer Count](#viewer-count)
  * [Total LIVE Likes](#total-live-likes)
  * [Viewer Entered](#viewer-entered)
  * [Viewer Left](#viewer-left)
  * [Chat](#chat)
  * [Individual Like](#individual-like)
  * [Gift](#gift)
  * [Follow](#follow)
  * [Subscribe](#subscribe)
  * [Share](#share)
* [Basic JavaScript Client](#basic-javascript-client)
* [Only Use the Data You Need](#only-use-the-data-you-need)
* [TCP Raw Events](#tcp-raw-events)
* [Send Chat](#send-chat)
* [Quick Reference](#quick-reference)

---

# How It Works

The bridge runs inside TikTok LIVE Studio's Electron preload environment.

Most LIVE interaction events are received from LIVE Studio's internal event stream, including:

* Chat
* Viewer enter / leave
* Individual likes
* Gifts
* Follows
* Subscriptions
* Shares

### Viewer Count & Total LIVE Likes

Viewer count and total LIVE likes are handled differently.

These values are read directly from the **TikTok LIVE Studio webpage / UI**, allowing the bridge to use the totals displayed by LIVE Studio itself.

The bridge then converts the data into simple JSON messages that can be used by other applications.

You do **not** need to understand TikTok LIVE Studio's internal payloads to use the normal WebSocket API.

---

# Installation

## Automatic Installation

> **Recommended installation method**

The easiest way to install the bridge is with the included:

```text
install-bridge.bat
```

The installer **must be run as Administrator**.

### Steps

1. Close TikTok LIVE Studio if it is running.
2. Right-click `install-bridge.bat`.
3. Select **Run as administrator**.
4. Allow the installer to complete.
5. Launch TikTok LIVE Studio.

The installer will locate the installed TikTok LIVE Studio version and install the required bridge files automatically.

### ✅ How to Know It Worked

When TikTok LIVE Studio starts, you should see the:

> **Emstar233 TikTok Live Bridge**

splash screen.

**Splash screen appears = installation successful.**

If the splash screen does **not** appear, the bridge has not loaded correctly and the installation should be considered failed.

Try:

1. Close TikTok LIVE Studio.
2. Run `install-bridge.bat` again as Administrator.
3. Launch TikTok LIVE Studio again.
4. Check for the splash screen.

If automatic installation still does not work, follow the manual installation instructions below.

---

## Manual Installation

TikTok LIVE Studio stores its preload files inside its installed version folder.

The exact version number will vary.

An example location is:

```text
C:\Program Files\TikTok LIVE Studio\<version>\resources\app\electron\preload\
```

### Step 1 — Copy the Bridge Files

Copy these files into the `preload` folder:

```text
bridge.js
banner1.png
star-sabers.png
```

All three files should be in the same `preload` folder.

### Step 2 — Edit the Preload Files

The bridge must be loaded by TikTok LIVE Studio's preload scripts.

Find these three files:

```text
servicePreload.js
liveCenterContainerPreload.js
webviewContainerPreload.js
```

Add this line as the **first line** of each file:

```js
require('./bridge.js');
```

For example, a preload file beginning with:

```js
"use strict";
```

should become:

```js
require('./bridge.js');

"use strict";
```

Do this for **all three** preload files:

```text
servicePreload.js
liveCenterContainerPreload.js
webviewContainerPreload.js
```

### Step 3 — Launch TikTok LIVE Studio

Start TikTok LIVE Studio normally.

If everything was installed correctly, the **Emstar233 TikTok Live Bridge** splash screen will appear during startup.

### ❌ No Splash Screen?

If the splash screen does not appear, check that:

* `bridge.js` is inside the correct `preload` folder.
* `banner1.png` is inside the same folder.
* `star-sabers.png` is inside the same folder.
* `require('./bridge.js');` is the first line of all three preload files.
* You edited the files belonging to the **currently installed version** of TikTok LIVE Studio.

After making any corrections, completely close and restart TikTok LIVE Studio.

---

## TikTok LIVE Studio Updates

TikTok LIVE Studio updates may create a new version folder and replace its preload files.

This can remove the bridge injection.

If the bridge stops loading after a LIVE Studio update:

1. Close TikTok LIVE Studio.
2. Right-click `install-bridge.bat`.
3. Select **Run as administrator**.
4. Allow the installer to complete.
5. Launch TikTok LIVE Studio.
6. Confirm that the bridge splash screen appears.

If the splash screen appears, the bridge has loaded successfully.

---

# Connection

The bridge listens locally on:

```text
127.0.0.1:21214
```

## WebSocket

For normal applications, connect to:

```text
ws://127.0.0.1:21214/
```

## TCP

TCP clients can connect to:

```text
127.0.0.1:21214
```

TCP uses newline-delimited JSON.

---

# WebSocket Events

Every normal WebSocket message follows the same basic structure:

```json
{
  "event": "eventName",
  "data": {}
}
```

For example:

```json
{
  "event": "enter",
  "data": {
    "nickname": "Emstar233",
    "userId": "123456789",
    "uniqueId": "emstar233",
    "secUid": "..."
  }
}
```

Use the `event` field to determine what happened, then read whatever fields you need from `data`.

### You Do Not Need Every Field

Your application does **not** need to use every field the bridge provides.

For example, if you only care about the nickname of somebody entering:

```js
if (msg.event === "enter") {
    const nickname = msg.data.nickname;
}
```

If you only care about the person's nickname and their chat message:

```js
if (msg.event === "chat") {
    const nickname = msg.data.nickname;
    const message = msg.data.comment;
}
```

Everything else in the event can simply be ignored.

---

# Event Summary

| Event       | Description                  |
| ----------- | ---------------------------- |
| `roomUser`  | Current LIVE viewer count    |
| `likeTotal` | Current total LIVE likes     |
| `enter`     | Viewer entered the LIVE      |
| `leave`     | Viewer left the LIVE         |
| `chat`      | Chat message received        |
| `like`      | Individual viewer sent likes |
| `gift`      | Gift received                |
| `follow`    | New follower                 |
| `subscribe` | New subscription             |
| `share`     | Viewer shared the LIVE       |

---

# Event Data

## Viewer Count

Event:

```text
roomUser
```

Example:

```json
{
  "event": "roomUser",
  "data": {
    "viewerCount": 123
  }
}
```

### Get Only the Viewer Count

```js
if (msg.event === "roomUser") {
    const viewers = msg.data.viewerCount;

    console.log("Viewers:", viewers);
}
```

---

## Total LIVE Likes

Event:

```text
likeTotal
```

This is the **total number of likes for the LIVE**.

It is separate from the `like` event, which represents an individual viewer sending likes.

Example:

```json
{
  "event": "likeTotal",
  "data": {
    "likeCount": 0,
    "totalLikeCount": 12345
  }
}
```

### Get Only the LIVE Like Total

```js
if (msg.event === "likeTotal") {
    const likes = msg.data.totalLikeCount;

    console.log("Total LIVE Likes:", likes);
}
```

---

## Viewer Entered

Event:

```text
enter
```

Example:

```json
{
  "event": "enter",
  "data": {
    "nickname": "NameHere",
    "userId": "6941...",
    "uniqueId": "username",
    "secUid": "..."
  }
}
```

Available data:

| Field      | Description           |
| ---------- | --------------------- |
| `nickname` | User's display name   |
| `userId`   | TikTok user ID        |
| `uniqueId` | TikTok username       |
| `secUid`   | TikTok secure user ID |

### Get Only the Nickname

```js
if (msg.event === "enter") {
    const nickname = msg.data.nickname;

    console.log(`${nickname} entered`);
}
```

---

## Viewer Left

Event:

```text
leave
```

Example:

```json
{
  "event": "leave",
  "data": {
    "nickname": "NameHere",
    "userId": "6941...",
    "uniqueId": "username",
    "secUid": "..."
  }
}
```

### Get Only the Nickname

```js
if (msg.event === "leave") {
    const nickname = msg.data.nickname;

    console.log(`${nickname} left`);
}
```

---

## Chat

Event:

```text
chat
```

Example:

```json
{
  "event": "chat",
  "data": {
    "comment": "hello everyone",
    "userId": "6941...",
    "secUid": "...",
    "uniqueId": "emstar233",
    "nickname": "Emstar233",
    "profilePictureUrl": "https://...",
    "followRole": 0,
    "followInfo": {
      "followingCount": 0,
      "followerCount": 0,
      "followStatus": 0,
      "pushStatus": 0
    },
    "isModerator": false,
    "isSubscriber": false,
    "topGifterRank": 0,
    "totalLikeCount": null,
    "msgId": "...",
    "createTime": "..."
  }
}
```

Some of the most useful fields are:

| Field               | Description                      |
| ------------------- | -------------------------------- |
| `nickname`          | User's display name              |
| `uniqueId`          | TikTok username                  |
| `userId`            | TikTok user ID                   |
| `comment`           | Chat message                     |
| `profilePictureUrl` | Profile picture URL              |
| `isModerator`       | Whether the user is a moderator  |
| `isSubscriber`      | Whether the user is a subscriber |
| `topGifterRank`     | Top gifter rank when available   |

### Get Only Nickname + Message

For most chat integrations, this may be all you need:

```js
if (msg.event === "chat") {
    const nickname = msg.data.nickname;
    const message = msg.data.comment;

    console.log(`${nickname}: ${message}`);
}
```

---

## Individual Like

Event:

```text
like
```

This event represents a **specific viewer sending likes**.

It is separate from `likeTotal`, which represents the overall LIVE like total.

Example:

```json
{
  "event": "like",
  "data": {
    "nickname": "NameHere",
    "userId": "6941...",
    "uniqueId": "username",
    "secUid": "...",
    "likeCount": 6,
    "totalLikeCount": 71,
    "msgId": "..."
  }
}
```

### Get Nickname + Likes

```js
if (msg.event === "like") {
    const nickname = msg.data.nickname;
    const likes = msg.data.likeCount;

    console.log(`${nickname} sent ${likes} likes`);
}
```

---

## Gift

Event:

```text
gift
```

Example:

```json
{
  "event": "gift",
  "data": {
    "nickname": "NameHere",
    "userId": "6941...",
    "uniqueId": "username",
    "secUid": "...",
    "giftName": "Rose",
    "diamondCount": 1,
    "giftValue": 1,
    "giftType": 0,
    "repeatCount": 1,
    "repeatEnd": true,
    "topGifterRank": 0,
    "isModerator": false,
    "isSubscriber": false,
    "msgId": "...",
    "createTime": "..."
  }
}
```

### Get Only Sender + Gift

```js
if (msg.event === "gift") {
    const nickname = msg.data.nickname;
    const gift = msg.data.giftName;
    const amount = msg.data.repeatCount;

    console.log(`${nickname} sent ${gift} x${amount}`);
}
```

---

## Follow

Event:

```text
follow
```

Example:

```json
{
  "event": "follow",
  "data": {
    "nickname": "NameHere",
    "userId": "6941...",
    "uniqueId": "username",
    "secUid": "..."
  }
}
```

### Get Only the Nickname

```js
if (msg.event === "follow") {
    console.log(`${msg.data.nickname} followed`);
}
```

---

## Subscribe

Event:

```text
subscribe
```

Example:

```json
{
  "event": "subscribe",
  "data": {
    "nickname": "NameHere",
    "userId": "6941...",
    "uniqueId": "username",
    "secUid": "..."
  }
}
```

### Get Only the Nickname

```js
if (msg.event === "subscribe") {
    console.log(`${msg.data.nickname} subscribed`);
}
```

---

## Share

Event:

```text
share
```

Example:

```json
{
  "event": "share",
  "data": {
    "nickname": "NameHere",
    "userId": "6941...",
    "uniqueId": "username",
    "secUid": "..."
  }
}
```

### Get Only the Nickname

```js
if (msg.event === "share") {
    console.log(`${msg.data.nickname} shared the LIVE`);
}
```

---

# Basic JavaScript Client

Here is a complete basic WebSocket client:

```js
const ws = new WebSocket("ws://127.0.0.1:21214/");

ws.onopen = () => {
    console.log("Connected to TikTok LIVE Studio Bridge");
};

ws.onmessage = (message) => {
    const msg = JSON.parse(message.data);

    switch (msg.event) {

        case "roomUser":
            console.log(
                "Viewers:",
                msg.data.viewerCount
            );
            break;

        case "likeTotal":
            console.log(
                "Total LIVE Likes:",
                msg.data.totalLikeCount
            );
            break;

        case "enter":
            console.log(
                `${msg.data.nickname} entered`
            );
            break;

        case "leave":
            console.log(
                `${msg.data.nickname} left`
            );
            break;

        case "chat":
            console.log(
                `${msg.data.nickname}: ${msg.data.comment}`
            );
            break;

        case "like":
            console.log(
                `${msg.data.nickname} liked x${msg.data.likeCount}`
            );
            break;

        case "gift":
            console.log(
                `${msg.data.nickname} sent ${msg.data.giftName} x${msg.data.repeatCount}`
            );
            break;

        case "follow":
            console.log(
                `${msg.data.nickname} followed`
            );
            break;

        case "subscribe":
            console.log(
                `${msg.data.nickname} subscribed`
            );
            break;

        case "share":
            console.log(
                `${msg.data.nickname} shared the LIVE`
            );
            break;
    }
};

ws.onerror = (error) => {
    console.error("WebSocket error:", error);
};

ws.onclose = () => {
    console.log("Disconnected");
};
```

---

# Only Use the Data You Need

The bridge sends the supported LIVE events to connected clients.

Your application does **not** need to process all of them.

Simply check `msg.event` and use the fields you need.

## Enter + Chat Only

For example, if your application only needs:

* The nickname of viewers entering
* Chat nickname
* Chat message

you can use:

```js
const ws = new WebSocket("ws://127.0.0.1:21214/");

ws.onmessage = (message) => {
    const msg = JSON.parse(message.data);

    if (msg.event === "enter") {
        const nickname = msg.data.nickname;

        console.log("ENTER:", nickname);
    }

    if (msg.event === "chat") {
        const nickname = msg.data.nickname;
        const chatMessage = msg.data.comment;

        console.log("CHAT:", nickname, chatMessage);
    }
};
```

You can completely ignore viewer counts, likes, gifts, follows and every other event.

## Viewer Count Only

```js
const ws = new WebSocket("ws://127.0.0.1:21214/");

ws.onmessage = (message) => {
    const msg = JSON.parse(message.data);

    if (msg.event !== "roomUser") {
        return;
    }

    const viewers = msg.data.viewerCount;

    console.log("Viewers:", viewers);
};
```

## Total LIVE Likes Only

```js
const ws = new WebSocket("ws://127.0.0.1:21214/");

ws.onmessage = (message) => {
    const msg = JSON.parse(message.data);

    if (msg.event !== "likeTotal") {
        return;
    }

    const likes = msg.data.totalLikeCount;

    console.log("Total LIVE Likes:", likes);
};
```

## Gifts Only

```js
const ws = new WebSocket("ws://127.0.0.1:21214/");

ws.onmessage = (message) => {
    const msg = JSON.parse(message.data);

    if (msg.event !== "gift") {
        return;
    }

    const nickname = msg.data.nickname;
    const gift = msg.data.giftName;
    const amount = msg.data.repeatCount;

    console.log(
        `${nickname} sent ${gift} x${amount}`
    );
};
```

---

# TCP Raw Events

TCP clients can request raw bridge events.

Connect to:

```text
127.0.0.1:21214
```

Then send:

```json
{"type":"__hello","role":"client","wantsRaw":true}
```

Raw messages use a structure similar to:

```json
{
  "type": "Chat",
  "data": {}
}
```

Raw mode is mainly intended for debugging or applications that need access to the original LIVE Studio payload.

For most applications, the normal WebSocket API is easier to use.

---

# Send Chat

The TCP connection can also be used to send a chat message into TikTok LIVE Studio.

Connect to:

```text
127.0.0.1:21214
```

Then send a newline-terminated JSON command:

```json
{"type":"send_chat","text":"hello from my app"}
```

## Node.js Example

```js
const net = require("net");

const socket = net.createConnection({
    host: "127.0.0.1",
    port: 21214
}, () => {

    socket.write(
        JSON.stringify({
            type: "send_chat",
            text: "hello from my app"
        }) + "\n"
    );

    socket.end();
});
```

## Python Example

```python
import socket
import json

s = socket.create_connection(
    ("127.0.0.1", 21214)
)

s.sendall((
    json.dumps({
        "type": "send_chat",
        "text": "hello from my app"
    }) + "\n"
).encode("utf-8"))

s.close()
```

---

# Quick Reference

### Installation

```text
Right-click install-bridge.bat
        ↓
Run as administrator
        ↓
Launch TikTok LIVE Studio
        ↓
Bridge splash screen appears
        ↓
Installed successfully
```

### WebSocket

```text
ws://127.0.0.1:21214/
```

### TCP

```text
127.0.0.1:21214
```

### Events

```text
roomUser   Current viewer count
likeTotal  Total LIVE likes
enter      Viewer entered
leave      Viewer left
chat       Chat message
like       Individual viewer likes
gift       Gift received
follow     New follower
subscribe  New subscription
share      LIVE shared
```

### TCP Command

```text
send_chat
```

---

## Installation Reminder

> **If you launch TikTok LIVE Studio and see the Emstar233 TikTok Live Bridge splash screen, the bridge has loaded successfully.**

> **If the splash screen does not appear, the installation has failed or the bridge is no longer injected into the current LIVE Studio version. Run `install-bridge.bat` again as Administrator.**
