import assert from "node:assert/strict";
import test from "node:test";
import { readDeliveryEvents, sendMediaCampaign } from "../src/campaign_delivery.js";

test("sends once and queries delivery events with the returned message id", async () => {
  process.env.INFRAI_API_KEY = "test-key";
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const responses = [
    Response.json({ ok: true, data: { message_id: "message-42" }, metadata: {} }),
    Response.json({ ok: true, data: [{ kind: "opened" }], metadata: {} }),
  ];
  const mockFetch: typeof fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return responses.shift() as Response;
  };

  const sent = await sendMediaCampaign(
    { to: "viewer@example.com", subject: "New releases", html: "<p>Watch now</p>" },
    "release-night-42",
    { fetch: mockFetch },
  );
  const events = await readDeliveryEvents(sent.message_id, { fetch: mockFetch });

  assert.equal(sent.message_id, "message-42");
  assert.deepEqual(events, [{ kind: "opened" }]);
  assert.equal(requests[0].init?.method, "POST");
  assert.equal(new Headers(requests[0].init?.headers).get("Idempotency-Key"), "release-night-42");
  assert.equal(requests[1].init?.method, "GET");
  assert.match(requests[1].url, /message_id=message-42$/);
});
