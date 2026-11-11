# waservix

**WAservix WhatsApp API Gateway** - official Node.js client: send WhatsApp messages, images and documents from your own number, with status tracking and webhooks. By Tekservix.

Node.js client for the [WAservix WhatsApp API Gateway](https://tekservix.com/waservix/).

WAservix links your own WhatsApp number by QR code (the same way WhatsApp Web does) and gives you a REST API to send text, images, video, audio, documents, locations, polls and more, with webhooks for incoming messages and status updates.

- Zero dependencies, uses the built-in `fetch` (Node 18+)
- TypeScript types included
- Webhook check built in

## Install

```bash
npm install waservix
```

## Quick start

Copy your device's API key from the WAservix dashboard (Devices -> API key) and keep it on your server.

```js
const WAservix = require('waservix');

const wa = new WAservix({ apiKey: process.env.WASERVIX_KEY });

const { msgId, status } = await wa.sendText('+15551234567', 'Hello Aline, your order is ready');
console.log(msgId, status); // 58213 'in_progress'
```

ES modules work too:

```js
import WAservix from 'waservix';
```

## Sending

Messages are queued and sent one at a time per number, so each call returns right away with `status: "in_progress"` and a `msgId`.

```js
// Image with caption
await wa.sendImage('+15551234567', 'https://example.com/product.jpg', 'Back in stock');

// Document
await wa.sendDocument('+15551234567', 'https://example.com/inv-1042.pdf', 'Invoice-1042.pdf', 'Your invoice');

// Anything the API supports, including groups (JID ending in @g.us)
await wa.sendMessage({ to: '120363040000000000@g.us', text: 'Team meeting at 3pm' });
```

## Status, contacts and groups

```js
const info = await wa.getMessageInfo(58213);   // queued, sent, delivered, read, played or failed
const check = await wa.onWhatsApp('+15551234567'); // { exists: true, jid: '...' }
const conn = await wa.getStatus();              // { status: 'connected' }

await wa.editMessage(58213, 'Corrected text'); // own text messages, about 15 minutes
const groups = await wa.listGroups();
```

Anything else in the [API reference](https://tekservix.com/waservix/docs/) is one call away:

```js
await wa.request('POST', '/messages/read', { msgId: '3EB0X123456789' });
```

## Webhooks

Set a webhook URL and events for the number in the dashboard. Each request carries `X-Webhook-Signature`, which equals the device's webhook secret:

```js
const express = require('express');
const { verifyWebhook } = require('waservix');

const app = express();
app.use(express.json());

app.post('/wa/webhook', (req, res) => {
  if (!verifyWebhook(req.get('X-Webhook-Signature'), process.env.WASERVIX_WEBHOOK_SECRET)) {
    return res.sendStatus(401);
  }
  res.sendStatus(200); // acknowledge first, then do the work
  if (req.body.event === 'messages.received') {
    const m = req.body.data.messages;
    console.log(m.key.cleanedSenderPn, m.messageBody);
  }
});
```

## Errors

Failed calls throw `WAservixError` with `status`, `message`, field `errors` and, on 429, `retryAfter` in seconds. A 503 means the device is reconnecting: retry shortly.

Never call the API from a browser or mobile app: anyone could read the key. Call it from your server.

## Migrating from WaSender

WAservix accepts the same `/send-message` body and webhook fields as WaSender, so most integrations switch by changing the base URL and key. See the [compatibility notes](https://tekservix.com/waservix/docs/).

## Use it responsibly

WAservix is not Meta's official WhatsApp Business Platform. There's no business verification and no per-conversation fee, but WhatsApp's spam rules apply to your number directly. Message people who expect to hear from you, warm up new numbers slowly and keep the built-in account protection on.

## More from Tekservix

- [SMS Gora SMS Gateway](https://tekservix.com/smsgora/): send SMS through your own Android phones (`npm install smsgora`)
- [AI Sales Agent](https://tekservix.com/ai-sales-agent): answers customers on WhatsApp and SMS using your website's content
- [Website to App](https://tekservix.com/mobile-apps): turn your website into Android and iOS apps
- [WAservix WordPress plugin](https://tekservix.com/waservix/docs/wordpress-plugin): WooCommerce order messages without code

## License

MIT
