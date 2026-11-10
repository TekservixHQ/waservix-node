'use strict';

const crypto = require('crypto');

const DEFAULT_BASE_URL = 'https://tekservix.com/waservix/api';

class WAservixError extends Error {
  constructor(message, { status, errors, body, retryAfter } = {}) {
    super(message);
    this.name = 'WAservixError';
    this.status = status;
    this.errors = errors;
    this.body = body;
    this.retryAfter = retryAfter;
  }
}

const enc = encodeURIComponent;

/**
 * Client for the WAservix WhatsApp API Gateway.
 * Docs: https://tekservix.com/waservix/docs/
 */
class WAservix {
  /**
   * @param {object} options
   * @param {string} options.apiKey  Device API key (wpk_...) or a personal access token for session management.
   * @param {string} [options.baseUrl]
   * @param {number} [options.timeout] Request timeout in ms (default 30000).
   * @param {Function} [options.fetch] Custom fetch implementation (defaults to global fetch, Node 18+).
   */
  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, timeout = 30000, fetch: fetchImpl } = {}) {
    if (!apiKey) throw new Error('WAservix: apiKey is required (Devices -> API key in the WAservix dashboard)');
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeout = timeout;
    this._fetch = fetchImpl || globalThis.fetch;
    if (typeof this._fetch !== 'function') {
      throw new Error('WAservix: no fetch available. Use Node 18+ or pass options.fetch');
    }
  }

  /** Low-level call to any documented endpoint, e.g. request('GET', '/groups'). Returns the `data` field. */
  async request(method, path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    let res;
    try {
      res = await this._fetch(this.baseUrl + path, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    let json = null;
    const text = await res.text();
    try { json = text ? JSON.parse(text) : null; } catch (_) { /* non-JSON answer */ }
    if (!res.ok || (json && json.success === false)) {
      const retry = res.headers && res.headers.get ? res.headers.get('retry-after') : null;
      throw new WAservixError((json && json.message) || `HTTP ${res.status}`, {
        status: res.status,
        errors: json && json.errors,
        body: json || text,
        retryAfter: retry ? Number(retry) : undefined,
      });
    }
    return json && 'data' in json ? json.data : json;
  }

  /**
   * Send any message type. Pass `to` and `text`, plus optional imageUrl, videoUrl, audioUrl,
   * documentUrl + fileName, stickerUrl, contact, location, poll, replyTo, mentions or viewOnce.
   * Returns { msgId, jid, status: 'in_progress' }.
   */
  sendMessage(params) {
    if (!params || !params.to) throw new TypeError('sendMessage: "to" is required (international number or group JID)');
    return this.request('POST', '/send-message', params);
  }

  /** Shortcut: plain text. */
  sendText(to, text) { return this.sendMessage({ to, text }); }

  /** Shortcut: image with optional caption. */
  sendImage(to, imageUrl, text) { return this.sendMessage({ to, imageUrl, text }); }

  /** Shortcut: document (PDF, etc.) with optional caption. */
  sendDocument(to, documentUrl, fileName, text) { return this.sendMessage({ to, documentUrl, fileName, text }); }

  /** Message status: queued, sent, delivered, read, played or failed. */
  getMessageInfo(id) { return this.request('GET', `/messages/${enc(id)}/info`); }

  editMessage(id, text) { return this.request('PUT', `/messages/${enc(id)}`, { text }); }
  deleteMessage(id) { return this.request('DELETE', `/messages/${enc(id)}`); }
  resendMessage(id) { return this.request('POST', `/messages/${enc(id)}/resend`); }

  /** Is this number on WhatsApp? Returns { exists, jid }. */
  onWhatsApp(phone) { return this.request('GET', `/on-whatsapp/${enc(phone)}`); }

  /** Connection status: connected, connecting, need_scan, disconnected, logged_out or expired. */
  getStatus() { return this.request('GET', '/status'); }

  /** The linked WhatsApp account. */
  getUser() { return this.request('GET', '/user'); }

  listContacts() { return this.request('GET', '/contacts'); }
  getContact(phone) { return this.request('GET', `/contacts/${enc(phone)}`); }
  saveContact(phone, name) { return this.request('PUT', '/contacts', { phone, name }); }

  listGroups() { return this.request('GET', '/groups'); }
  getGroupMetadata(groupJid) { return this.request('GET', `/groups/${enc(groupJid)}/metadata`); }

  /** Session management (needs a personal access token, not a device key). */
  listSessions() { return this.request('GET', '/whatsapp-sessions'); }
  getSession(id) { return this.request('GET', `/whatsapp-sessions/${enc(id)}`); }
  createSession(params) { return this.request('POST', '/whatsapp-sessions', params); }
  connectSession(id, params = { method: 'qr' }) { return this.request('POST', `/whatsapp-sessions/${enc(id)}/connect`, params); }
  getSessionQrCode(id) { return this.request('GET', `/whatsapp-sessions/${enc(id)}/qrcode`); }
}

/**
 * Check the X-Webhook-Signature header, which equals your device's webhook secret.
 * Uses a constant-time comparison.
 * @param {string} signature Value of the X-Webhook-Signature header.
 * @param {string} secret    The device's webhook secret.
 * @returns {boolean}
 */
function verifyWebhook(signature, secret) {
  if (!signature || !secret) return false;
  const a = Buffer.from(String(signature));
  const b = Buffer.from(String(secret));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = WAservix;
module.exports.WAservix = WAservix;
module.exports.WAservixError = WAservixError;
module.exports.verifyWebhook = verifyWebhook;
module.exports.default = WAservix;
