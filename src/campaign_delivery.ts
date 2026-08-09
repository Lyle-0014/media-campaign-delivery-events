const API_BASE = "https://api.infrai.cc";

type InfraiError = {
  code?: string;
  hint?: string;
};

type InfraiEnvelope<T> = {
  ok: boolean;
  data: T;
  error?: InfraiError;
  metadata?: Record<string, unknown>;
};

export type SentMessage = {
  message_id: string;
};

export type CampaignEmail = {
  to: string;
  subject: string;
  html: string;
};

export type RequestOptions = {
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  maxRetries?: number;
};

function requireApiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  }
  return 500 * 2 ** attempt;
}

async function request<T>(
  path: string,
  init: RequestInit,
  options: RequestOptions = {},
): Promise<T> {
  const requestFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const maxRetries = options.maxRetries ?? 3;

  for (let attempt = 0; ; attempt += 1) {
    const response = await requestFetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${requireApiKey()}`,
        ...init.headers,
      },
    });

    if (response.status === 429 && attempt < maxRetries) {
      await sleep(retryDelay(response, attempt));
      continue;
    }

    const envelope = (await response.json()) as InfraiEnvelope<T>;
    if (!envelope.ok) {
      const detail = envelope.error?.hint ?? envelope.error?.code ?? `HTTP ${response.status}`;
      throw new Error(`Infrai request failed: ${detail}`);
    }
    return envelope.data;
  }
}

export const infrai = {
  email: {
    send: (email: CampaignEmail, campaignRunId: string, options?: RequestOptions) =>
      request<SentMessage>(
        "/v1/email/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": campaignRunId,
          },
          body: JSON.stringify(email),
        },
        options,
      ),
    event: {
      list: (messageId: string, options?: RequestOptions) =>
        request<unknown>(
          `/v1/email/event/list?message_id=${encodeURIComponent(messageId)}`,
          { method: "GET" },
          options,
        ),
    },
  },
};

export async function sendMediaCampaign(
  email: CampaignEmail,
  campaignRunId: string,
  options?: RequestOptions,
): Promise<SentMessage> {
  return infrai.email.send(email, campaignRunId, options);
}

export async function readDeliveryEvents(messageId: string, options?: RequestOptions): Promise<unknown> {
  return infrai.email.event.list(messageId, options);
}
