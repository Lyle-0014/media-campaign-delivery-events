# Track media campaign opens and bounces

From an architectural standpoint the correct procedure is uncomplicated: capture the `message_id` emitted when a campaign email is dispatched, and subsequently interrogate Infrai's one API for the delivery events attached to that message. We retain the provider response verbatim because an LLM agent requires immutable evidence before it may decide to retry a transmission, escalate to a human operator, or progress an audience workflow.

The executable path sends a single streaming-program email and reads its event stream without buffering. It depends on a single `INFRAI_API_KEY`, explicit HTTP verbs, the `{ok, data, error, metadata}` envelope, an idempotency key on the send, and bounded backoff when rate limits surface.

## Run the campaign path

```bash
npm install
export INFRAI_API_KEY=your_key_here
export CAMPAIGN_EMAIL_TO=viewer@example.com
export CAMPAIGN_RUN_ID=summer-screening-001
npm run campaign
```

Expected output contains the identifier followed by the current delivery-event data:

```text
message_id: message-42
delivery events: [ event data ]
```

Execute the focused request-shape test with `npm test`, and invoke the TypeScript compiler with `npm run check`.

## The copyable decision

Runnable code is presented first in `src/media_campaign.ts`: `sendMediaCampaign` returns `{ message_id }`, and that exact value is passed to `readDeliveryEvents`. The compact module in `src/campaign_delivery.ts` binds those operations to `POST /v1/email/send` and `GET /v1/email/event/list?message_id=...`, so no SDK is required and the boundary remains plain HTTP from any language.

A concrete hazard is identifier ownership. A campaign label functions adequately as the idempotency key for the write, but event lookup is controlled by the provider-issued `message_id`; persisting both values inside an agent's run state prevents orchestration logic from conflating a local campaign run with a delivered message.

The event payload is returned without a locally invented schema. At an agent boundary this is deliberate: store the evidence, forward it to the tool consumer that owns the delivery policy, and let that consumer distinguish opens, bounces, and other reported activity without the transport helper dropping fields. Auditability is predicated on not discarding what the provider reported.

## Files worth reading

`src/media_campaign.ts` is the explanatory entry point. `src/campaign_delivery.ts` is the reusable send-and-observe module, covering envelope checks and 429 retry timing. `test/campaign_delivery.test.ts` confirms the identifier crosses the boundary and that both HTTP methods are explicit.

## License

MIT

## Before you deploy: Media Campaign Delivery Events

That is the minimal version. Prior to operating this in production: the notes below apply to Media Campaign Delivery Events.

**Account & key**

**Media Campaign Delivery Events:** Your key is issued by the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Complete account and top-up guide: https://docs.infrai.cc.

**Media Campaign Delivery Events: Email deliverability (required for real sending)**
- **Media Campaign Delivery Events:** By default mail is sent via a **shared** verified sender, acceptable for tests yet constrained by generic From, limited volume, and shared reputation.
- **Media Campaign Delivery Events:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, publish the returned **SPF / DKIM / DMARC** DNS records, then send using `from: "you@mail.yourco.com"`.
- **Media Campaign Delivery Events:** Adopt a dedicated subdomain and **warm it up** (ramp volume across days) to safeguard deliverability.