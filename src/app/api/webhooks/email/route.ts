import { NextRequest, NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";
import {
  assertTransition,
  MessageStatus,
} from "@/lib/outreach/state-machine";
import { logger } from "@/lib/logger";
import { verifyWebhookSignature } from "@/lib/webhook-verification";
import { rateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

// Maps a provider event type to the message status it should produce.
const EVENT_TO_STATUS: Record<string, MessageStatus> = {
  delivered: "DELIVERED",
  "email.delivered": "DELIVERED",
  bounced: "BOUNCED",
  "email.bounced": "BOUNCED",
  replied: "REPLIED",
  "email.replied": "REPLIED",
  unsubscribed: "UNSUBSCRIBED",
  "email.unsubscribed": "UNSUBSCRIBED",
  complained: "BOUNCED",
  "email.complained": "BOUNCED",
};

export async function POST(req: NextRequest) {
  const limit = rateLimit(req, "webhook:email", { maxRequests: 120, windowSeconds: 60 });
  if (!limit.success) {
    return rateLimitExceededResponse(limit);
  }

  const rawBody = await req.text();

  // Authenticate webhook request via Svix/HMAC signature or secret header fallback
  const verification = verifyWebhookSignature({
    rawBody,
    headers: req.headers,
    secret: process.env.WEBHOOK_SECRET || "",
  });

  if (!verification.valid) {
    logger.warn("Webhook rejected: signature verification failed", {
      reason: verification.reason,
    });
    return NextResponse.json(
      { error: "Unauthorized", reason: verification.reason },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Normalize between direct testing payload and Resend standard payload format
  const event_type: string | undefined = body.event_type || body.type;
  const provider_message_id: string | undefined =
    body.provider_message_id || body.data?.email_id;

  if (!provider_message_id || !event_type) {
    return NextResponse.json(
      {
        error: "Missing provider_message_id (or data.email_id) or event_type (or type)",
      },
      { status: 400 }
    );
  }

  const { data: message } = await supabase
    .from("outreach_messages")
    .select("id, status")
    .eq("provider_message_id", provider_message_id)
    .single();

  if (!message) {
    // A webhook for a message we don't recognize — log it, don't crash.
    // Could be a duplicate delivery, a test event, or a real data mismatch.
    logger.warn("Webhook received for unknown message", {
      provider_message_id,
      event_type,
    });

    return NextResponse.json({
      status: "ignored",
      reason: "Unknown message",
    });
  }

  // Idempotency check: has this exact event already been recorded for
  // this message? Prevents duplicate webhook deliveries from
  // double-processing.
  const { data: existingEvent } = await supabase
    .from("outreach_events")
    .select("id")
    .eq("message_id", message.id)
    .eq("event_type", event_type)
    .maybeSingle();

  if (existingEvent) {
    logger.info("Duplicate webhook event ignored", {
      messageId: message.id,
      event_type,
    });

    return NextResponse.json({
      status: "ignored",
      reason: "Duplicate event",
    });
  }

  const targetStatus = EVENT_TO_STATUS[event_type];

  if (targetStatus) {
    try {
      assertTransition(
        message.status as MessageStatus,
        targetStatus
      );

      await supabase
        .from("outreach_messages")
        .update({
          status: targetStatus,
        })
        .eq("id", message.id);
    } catch (err) {
      // The event arrived but doesn't make sense given current state
      // (e.g. a "delivered" event for an already-BOUNCED message).
      // Log it honestly rather than forcing an invalid transition.
      logger.warn(
        "Webhook event ignored — invalid state transition",
        {
          messageId: message.id,
          currentStatus: message.status,
          event_type,
          error:
            err instanceof Error
              ? err.message
              : "Unknown error",
        }
      );

      return NextResponse.json({
        status: "ignored",
        reason: "Invalid state transition",
      });
    }
  }

  await supabase.from("outreach_events").insert({
    message_id: message.id,
    event_type,
    event_data: body,
  });

  logger.info("Webhook event processed", {
    messageId: message.id,
    event_type,
  });

  return NextResponse.json({
    status: "processed",
  });
}