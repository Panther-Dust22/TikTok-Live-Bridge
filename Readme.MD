# TikTok LIVE Studio Bridge

A local bridge that runs inside **TikTok LIVE Studio** and exposes LIVE data through a WebSocket/TCP server on port `21214`.

The bridge receives LIVE events from TikTok LIVE Studio, converts them into simple JSON messages, and **broadcasts them to connected applications**.

It can provide:

* 👀 Viewer count
* ❤️ Total LIVE likes
* 👋 Viewer enter / leave
* 💬 Chat messages
* 👍 Individual likes (note these dont always work)
* 🎁 Gifts
* ➕ Follows
* ⭐ Subscriptions
* 🔗 Shares

Applications can connect to the bridge using WebSocket or TCP.

TCP clients can also send supported commands back to the bridge, such as sending a chat message into TikTok LIVE Studio.

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

There are two main sides to the bridge:

```text
TikTok LIVE Studio
        ↓
Bridge receives LIVE data
        ↓
Bridge broadcasts JSON events
        ↓
Your application
```

## Receiving Data From TikTok LIVE Studio

The bridge receives most LIVE interaction events from TikTok LIVE Studio's internal event stream, including:

* Chat
* Viewer enter / leave
* Individual likes
* Gifts
* Follows
* Subscriptions
* Shares

Viewer count and total LIVE likes are handled differently.

These values are read directly from the **TikTok LIVE Studio webpage / UI**, allowing the bridge to use the totals displayed by LIVE Studio itself.

## Sending Data to Applications

The bridge hosts a local WebSocket/TCP server on:

```text
127.0.0.1:21214
```

Other applications connect to this server as **clients**.

Once connected, the bridge broadcasts supported LIVE events to them as JSON.

Your application does not need to connect directly to TikTok.

It only connects to the local bridge.

## Sending Commands Back to the Bridge

TCP is also two-way.

A connected TCP client can send supported commands to the bridge.

For example:

```text
Your application
        ↓
send_chat command
        ↓
Bridge
        ↓
TikTok LIVE Studio
```

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

### Step 2 — Edit the Preload Files

Find:

```text
servicePreload.js
liveCenterContainerPreload.js
webviewContainerPreload.js
```

Add this as the **first line** of each file:

```js
require('./bridge.js');
```

For example:

```js
require('./bridge.js');

"use strict";
```

Do this for all three preload files.

### Step 3 — Launch TikTok LIVE Studio

Start TikTok LIVE Studio normally.

If everything was installed correctly, the **Emstar233 TikTok Live Bridge** splash screen will appear during startup.

### ❌ No Splash Screen?

Check that:

* `bridge.js` is in the correct `preload` folder.
* `banner1.png` is in the same folder.
* `star-sabers.png` is in the same folder.
* `require('./bridge.js');` is the first line of all three preload files.
* You edited the files belonging to the currently installed TikTok LIVE Studio version.

After correcting the installation, completely close and restart TikTok LIVE Studio.

---

## TikTok LIVE Studio Updates

TikTok LIVE Studio updates may create a new version folder and replace its preload files.

If the bridge stops loading after an update:

1. Close TikTok LIVE Studio.
2. Right-click `install-bridge.bat`.
3. Select **Run as administrator**.
4. Launch TikTok LIVE Studio.
5. Confirm that the splash screen appears.

---

# Connection

The bridge **hosts** its local server on:

```text
127.0.0.1:21214
```

Your application connects to this address as a client.

## WebSocket

For normal event access:

```text
ws://127.0.0.1:21214/
```

The bridge broadcasts supported LIVE events to every connected WebSocket client.

## TCP

TCP clients connect to:

```text
127.0.0.1:21214
```

TCP uses newline-delimited JSON.

TCP can be used for:

* Raw bridge events
* Supported commands such as `send_chat`

---

# WebSocket Events

The bridge broadcasts WebSocket messages using this structure:

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

Your application receives these broadcasts through its WebSocket connection.

Use the `event` field to determine what happened.

For example:

```js
ws.onmessage = (message) => {
    const msg = JSON.parse(message.data);

    if (msg.event === "enter") {
        console.log(msg.data.nickname);
    }
};
```

Here, `ws.onmessage` is your application's client-side handler.

The bridge itself is the WebSocket host/server broadcasting the event.

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

```json
{
  "event": "roomUser",
  "data": {
    "viewerCount": 123
  }
}
```

Use only the count:

```js
if (msg.event === "roomUser") {
    const viewers = msg.data.viewerCount;
}
```

---

## Total LIVE Likes

```json
{
  "event": "likeTotal",
  "data": {
    "likeCount": 0,
    "totalLikeCount": 12345
  }
}
```

Use only the total:

```js
if (msg.event === "likeTotal") {
    const likes = msg.data.totalLikeCount;
}
```

---

## Viewer Entered

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

Only need the nickname?

```js
if (msg.event === "enter") {
    const nickname = msg.data.nickname;

    console.log(`${nickname} entered`);
}
```

---

## Viewer Left

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

```js
if (msg.event === "leave") {
    console.log(`${msg.data.nickname} left`);
}
```

---

## Chat

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

Only need nickname and message?

```js
if (msg.event === "chat") {
    const nickname = msg.data.nickname;
    const message = msg.data.comment;

    console.log(`${nickname}: ${message}`);
}
```

---

## Individual Like

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

```js
if (msg.event === "like") {
    console.log(
        `${msg.data.nickname} sent ${msg.data.likeCount} likes`
    );
}
```

---

## Gift

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

```js
if (msg.event === "follow") {
    console.log(`${msg.data.nickname} followed`);
}
```

---

## Subscribe

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

```js
if (msg.event === "subscribe") {
    console.log(`${msg.data.nickname} subscribed`);
}
```

---

## Share

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

```js
if (msg.event === "share") {
    console.log(`${msg.data.nickname} shared the LIVE`);
}
```

---

# Basic JavaScript Client

Your application acts as the WebSocket **client**.

The bridge is the WebSocket **server**.

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

ws.onclose = () => {
    console.log("Disconnected from bridge");
};
```

---

# Only Use the Data You Need

The bridge broadcasts supported LIVE events to connected applications.

Your application can simply ignore events and fields it does not need.

## Enter + Chat Only

```js
const ws = new WebSocket("ws://127.0.0.1:21214/");

ws.onmessage = (message) => {
    const msg = JSON.parse(message.data);

    if (msg.event === "enter") {
        console.log(
            "ENTER:",
            msg.data.nickname
        );
    }

    if (msg.event === "chat") {
        console.log(
            "CHAT:",
            msg.data.nickname,
            msg.data.comment
        );
    }
};
```

## Viewer Count Only

```js
const ws = new WebSocket("ws://127.0.0.1:21214/");

ws.onmessage = (message) => {
    const msg = JSON.parse(message.data);

    if (msg.event !== "roomUser") {
        return;
    }

    console.log(msg.data.viewerCount);
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

    console.log(
        msg.data.nickname,
        msg.data.giftName,
        msg.data.repeatCount
    );
};
```

---

# TCP Raw Events

TCP uses the same local bridge server:

```text
127.0.0.1:21214
```

Unlike the normal WebSocket event connection, TCP can also receive commands from the connected application.

A TCP client can request raw bridge events by sending:

```json
{"type":"__hello","role":"client","wantsRaw":true}
```

The bridge can then send raw events back to that TCP client.

Raw messages use a structure similar to:

```json
{
  "type": "Chat",
  "data": {}
}
```

Raw mode is mainly intended for debugging or applications that need the original LIVE Studio payload.

For most applications, the normal WebSocket API is easier to use.

---

# Send Chat

TCP can also be used in the opposite direction.

Your application sends a command to the bridge, and the bridge passes the chat request into TikTok LIVE Studio.

```text
Your application
        ↓
TCP
        ↓
TikTok LIVE Studio Bridge
        ↓
TikTok LIVE Studio
```

Connect to:

```text
127.0.0.1:21214
```

Then send a newline-terminated JSON command:

```json
{"type":"send_chat","text":"hello from my app"}
```

## Node.js

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

## Python

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

## Data Flow

```text
TikTok LIVE Studio
        ↓
Bridge receives LIVE events
        ↓
Bridge broadcasts them
        ↓
Connected WebSocket/TCP clients
```

## Commands

```text
Application
        ↓
TCP command
        ↓
Bridge
        ↓
TikTok LIVE Studio
```

## WebSocket Server

```text
ws://127.0.0.1:21214/
```

## TCP Server

```text
127.0.0.1:21214
```

## Events

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

## TCP Command

```text
send_chat
```

---

## Installation Reminder

> **If you launch TikTok LIVE Studio and see the Emstar233 TikTok Live Bridge splash screen, the bridge has loaded successfully.**

> **If the splash screen does not appear, the installation has failed or the bridge is no longer injected into the current LIVE Studio version. Run `install-bridge.bat` again as Administrator.**
