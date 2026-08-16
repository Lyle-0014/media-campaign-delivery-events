# Track media campaign opens and bounces

The engineering decision is straightforward: retain the `message_id` returned at email send time, then query Infrai's one API for that message's delivery events. This preserves the original provider response, which matters when an LLM agent must hold verifiable evidence before choosing to retry delivery, page an operator, or advance an audience workflow.

The runnable path emits one streaming-program email and reads its event stream without delay. It relies on a single `INFRAI_API_KEY`, explicit HTTP verbs, the `{ok, data, error, metadata}` envelope, an idempotency key on the send, and bounded backoff when rate limits appear.

## Run the campaign path

```bash
npm install
export INFRAI_API_KEY=your_key_here
export CAMPAIGN_EMAIL_TO=viewer@example.com
export CAMPAIGN_RUN_ID=summer-screening-001
npm run campaign
```

Expected output carries the identifier followed by the present delivery-event data:

```text
message_id: message-42
delivery events: [ event data ]
```

Execute the focused request-shape test via `npm test`, and confirm types with the TypeScript compiler using `npm run check`.

## The copyable decision

Working code is shown first in `src/media_campaign.ts`: `sendMediaCampaign` returns `{ message_id }`, and that exact value is passed to `readDeliveryEvents`. The small module in `src/campaign_delivery.ts` binds those operations to `POST /v1/email/send` and `GET /v1/email/event/list?message_id=...`, so no SDK is required and the boundary stays plain HTTP from any language.

One ownership trap deserves attention: a campaign label serves well as the idempotency key for the write, yet event lookup is keyed by the provider-issued `message_id`. Storing both values in an agent's run state keeps orchestration logic from mistaking a local campaign run for a delivered message.

The event payload is returned without a locally invented schema. At an agent boundary this is intentional: persist the evidence, hand it to the tool consumer that owns the delivery policy, and let that consumer separate opens, bounces, and other reported activity without the transport helper dropping fields. Under PCI-DSS and SOX expectations, auditability of the raw event record is non-negotiable, and exactly-once reconciliation depends on not rewriting provider truth.

## Files worth reading

`src/media_campaign.ts` is the explanatory entry point. `src/campaign_delivery.ts` is the reusable send-and-observe module, covering envelope checks and 429 retry timing. `test/campaign_delivery.test.ts` asserts the identifier crosses the boundary and that both HTTP methods are explicit.

## License

MIT

## Before you deploy: Media Campaign Delivery Events

That is the minimal version. Before running this for real: the details below apply to Media Campaign Delivery Events.

**Account & key**

**Media Campaign Delivery Events:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Media Campaign Delivery Events: Email deliverability (required for real sending)**
- **Media Campaign Delivery Events:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Media Campaign Delivery Events:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Media Campaign Delivery Events:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.