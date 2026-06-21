import {
  TextChannel,
  VoiceChannel,
  WebhookClient,
  MessageCreateOptions,
  MessagePayload,
  Webhook,
} from 'discord.js';

export const WEBHOOK_NAME = 'SyncInk Voice Webhook';

/**
 * Finds an existing SyncInk Voice Webhook in the given channel, or creates one if it doesn't exist.
 */
export async function getOrCreateWebhook(channel: TextChannel | VoiceChannel): Promise<Webhook | null> {
  try {
    const webhooks = await channel.fetchWebhooks();
    const existing = webhooks.find((wh) => wh.name === WEBHOOK_NAME && wh.owner?.id === channel.client.user?.id);

    if (existing) {
      return existing;
    }

    // Create a new webhook
    const newWebhook = await channel.createWebhook({
      name: WEBHOOK_NAME,
      avatar: channel.client.user?.displayAvatarURL(),
      reason: 'SyncInk Voice Server Branding System',
    });

    return newWebhook;
  } catch (error) {
    console.error(`[Webhook Utils] Failed to get or create webhook in channel ${channel.id}:`, error);
    return null;
  }
}

export interface WebhookBrandingOptions {
  serverAvatar?: string | null;
  serverNickname?: string | null;
  defaultAvatar?: string;
  defaultName?: string;
}

/**
 * Sends a message to a text channel.
 * Uses a webhook if possible to allow custom branding (avatar/name).
 * Falls back to standard channel.send if webhooks fail or are unavailable.
 */
export async function sendWebhookMessage(
  channel: TextChannel | VoiceChannel,
  content: string | MessagePayload | MessageCreateOptions,
  branding: WebhookBrandingOptions
) {
  // Webhooks are currently bypassed as requested to fix silent API rejection errors
  // with custom avatars or missing webhook permissions on self-hosted instances.
  return channel.send(content).catch((error) => {
    console.error(`[Webhook Utils] channel.send failed in channel ${channel.id}:`, error);
    return null;
  });
}
