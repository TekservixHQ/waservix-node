export interface WAservixOptions {
  /** Device API key (wpk_...) or a personal access token for session management. */
  apiKey: string;
  baseUrl?: string;
  /** Request timeout in ms (default 30000). */
  timeout?: number;
  fetch?: typeof fetch;
}

export interface SendMessageParams {
  /** International phone number or group JID (...@g.us). */
  to: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  documentUrl?: string;
  fileName?: string;
  stickerUrl?: string;
  contact?: Record<string, unknown>;
  location?: Record<string, unknown>;
  poll?: Record<string, unknown>;
  replyTo?: string;
  mentions?: string[];
  viewOnce?: boolean;
  [key: string]: unknown;
}

export interface SendResult { msgId: number; jid: string; status: string }

export declare class WAservixError extends Error {
  status?: number;
  errors?: Record<string, string[]>;
  body?: unknown;
  retryAfter?: number;
}

export declare class WAservix {
  constructor(options: WAservixOptions);
  request<T = any>(method: string, path: string, body?: unknown): Promise<T>;
  sendMessage(params: SendMessageParams): Promise<SendResult>;
  sendText(to: string, text: string): Promise<SendResult>;
  sendImage(to: string, imageUrl: string, text?: string): Promise<SendResult>;
  sendDocument(to: string, documentUrl: string, fileName?: string, text?: string): Promise<SendResult>;
  getMessageInfo(id: number | string): Promise<any>;
  editMessage(id: number | string, text: string): Promise<any>;
  deleteMessage(id: number | string): Promise<any>;
  resendMessage(id: number | string): Promise<any>;
  onWhatsApp(phone: string): Promise<{ exists: boolean; jid?: string }>;
  getStatus(): Promise<{ status: string }>;
  getUser(): Promise<{ id: string; number: string; name: string }>;
  listContacts(): Promise<any[]>;
  getContact(phone: string): Promise<any>;
  saveContact(phone: string, name: string): Promise<any>;
  listGroups(): Promise<any[]>;
  getGroupMetadata(groupJid: string): Promise<any>;
  listSessions(): Promise<any[]>;
  getSession(id: number | string): Promise<any>;
  createSession(params: Record<string, unknown>): Promise<any>;
  connectSession(id: number | string, params?: { method: 'qr' } | { method: 'code'; phone: string }): Promise<any>;
  getSessionQrCode(id: number | string): Promise<any>;
}

/** Constant-time check of the X-Webhook-Signature header against your device's webhook secret. */
export declare function verifyWebhook(signature: string, secret: string): boolean;

export default WAservix;
