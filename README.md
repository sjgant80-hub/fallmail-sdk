# @ai-native-solutions/fallmail-sdk

**P2P encrypted messaging primitives.** DID-addressed, ECDH+AES-GCM, no SMTP, no server.

Extracted from [FallMail](https://sjgant80-hub.github.io/fallmail/) - the sovereign mail client.

## Install

```bash
npm i @ai-native-solutions/fallmail-sdk
```

## Quick start

```js
import { FallMail } from '@ai-native-solutions/fallmail-sdk';

const mail = new FallMail({ fallid, falllink, fallpod, fallstore });
await mail.ready();

mail.onMessage(m => console.log('new mail', m.subject, 'from', m.fromDid));

// Send
const r = await mail.send('did:key:z6Mk...', 'Hello', 'body text here');
console.log(r.delivered ? 'delivered' : 'queued offline');

// Read folders
const inbox = await mail.inbox();
const sent  = await mail.outbox();
const drafts= await mail.drafts();
const trash = await mail.trash();

// Attachments
const att = await mail.attach(file);          // file: File | Blob | {name,bytes}
await mail.send('did:key:...', 'File', '', [att]);
const bytes = await mail.fetchAttachment(att.cid);
```

## API

### `new FallMail({ fallid, falllink, fallpod, fallstore, storePrefix? })`

All dependencies optional. When missing, features degrade gracefully:

- `fallid`    — identity (`getOrCreate()`, optional `encryptTo`, `decrypt`)
- `falllink`  — P2P wire (`send(toDid, wire)`, `on('message', cb)`, `getPeers()`)
- `fallpod`   — content-addressed store (`put(bytes) -> cid`, `get(cid) -> bytes`)
- `fallstore` — durable KV (`get`, `set`, `list(prefix)`). Falls back to in-memory.

### Methods

| Method | Returns |
|---|---|
| `ready()` | `Promise<void>` — wire link listener, prime identity |
| `send(toDid, subject, body, attachments?)` | `{ delivered, wire, id }` |
| `saveDraft({ id?, toDid, subject, body, attachments? })` | `record` |
| `deleteDraft(id)` | `void` |
| `attach(file)` | `Attachment` |
| `fetchAttachment(cid)` | `Uint8Array` |
| `inbox() / outbox() / drafts() / trash()` | `Message[]` sorted newest first |
| `read(id)` | mark inbox read |
| `delete(id)` | move to trash |
| `restore(id)` | trash → inbox |
| `onMessage(cb)` | unsubscribe fn |
| `did()` | your DID (string, once ready) |
| `peers()` | open/connected peer list |

### Utilities

- `fmtSize(bytes)` — human size
- `escapeHtml(s)` — HTML-safe string
- `FOLDERS` — `['inbox','outbox','drafts','trash']`

## Wire format

```js
{
  toDid: 'did:key:z...',
  fromDid: 'did:key:z...',
  timestamp: 1720425600000,
  cipher: {
    alg: 'AES-GCM',   // or delegated via fallid.encryptTo
    toDid: '...',
    iv: [/* 12 bytes */],
    ct: [/* ciphertext */]
  }
}
```

## Companion packages

- [`@ai-native-solutions/fallmail-mcp`](https://github.com/sjgant80-hub/fallmail-mcp) — MCP server (stdio)
- [`@ai-native-solutions/fallmail-api`](https://github.com/sjgant80-hub/fallmail-api) — HTTP wrapper

## License

MIT · AI-Native Solutions
