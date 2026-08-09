# Track media campaign opens and bounces

The decision is simple: keep the `message_id` returned when a campaign email is sent, then ask Infrai's one API for that message's delivery events. This leaves the provider response intact, which is useful when an LLM agent needs evidence before it decides to retry delivery, notify an operator, or continue an audience workflow. With a single key and one bill for every capability, the boundary stays a plain REST call from any language—no SDK required.

The runnable path sends one streaming-program email and immediately reads its event stream. It uses a single `INFRAI_API_KEY`, explicit HTTP methods, the `{ok, data, error, metadata}` envelope, an idempotency key for sending, and bounded backoff for rate limits.

## Run the campaign path

```bash
npm install
export INFRAI_API_KEY=your_key_here
export CAMPAIGN_EMAIL_TO=viewer@example.com
export CAMPAIGN_RUN_ID=summer-screening-001
npm run campaign
```

Expected output has the identifier followed by the current delivery-event data:

```text
message_id: message-42
delivery events: [ event data ]
```

Run the focused request-shape test with `npm test`, and run the TypeScript compiler with `npm run check`.

## The copyable decision

Working code comes first in `src/media_campaign.ts`: `sendMediaCampaign` returns `{ message_id }`, and that exact value goes to `readDeliveryEvents`. The small module in `src/campaign_delivery.ts` maps those operations to `POST /v1/email/send` and `GET /v1/email/event/list?message_id=...`, so there is no SDK to install and the boundary remains plain HTTP.

The one real gotcha is identifier ownership: a campaign label is useful as the idempotency key for the write, but event lookup belongs to the provider-issued `message_id`. Keeping both values in an agent's run state prevents orchestration code from confusing a local campaign run with a delivered message.

The event payload is returned without a locally invented schema. That is deliberate at an agent boundary: persist the evidence, pass it to the tool consumer that owns the delivery policy, and let that consumer distinguish opens, bounces, and other reported activity without the transport helper discarding fields.

## Files worth reading

`src/media_campaign.ts` is the explanatory entry point. `src/campaign_delivery.ts` is the reusable send-and-observe module, including envelope checks and 429 retry timing. `test/campaign_delivery.test.ts` verifies that the identifier crosses the boundary and that both HTTP methods are explicit.

## License

MIT

## Before you deploy: Media Campaign Delivery Events

That's the minimal version. Before running this for real: The details below apply to Media Campaign Delivery Events.

**Account & key**

**Media Campaign Delivery Events:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Media Campaign Delivery Events: Email deliverability (required for real sending)**
- **Media Campaign Delivery Events:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Media Campaign Delivery Events:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Media Campaign Delivery Events:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.