import { readDeliveryEvents, sendMediaCampaign } from "./campaign_delivery.js";

const to = process.env.CAMPAIGN_EMAIL_TO;
if (!to) throw new Error("CAMPAIGN_EMAIL_TO is required");

const campaignRunId = process.env.CAMPAIGN_RUN_ID ?? "summer-screening-001";
const sent = await sendMediaCampaign(
  {
    to,
    subject: "Your Friday screening queue",
    html: "<h1>Friday picks</h1><p>Three new documentaries are ready to stream.</p>",
  },
  campaignRunId,
);

console.log("message_id:", sent.message_id);
console.log("delivery events:", await readDeliveryEvents(sent.message_id));
