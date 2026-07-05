type SendWhatsAppTextMessageInput = {
  to: string;
  text: string;
};

type WhatsAppMessageResponse = {
  messages?: Array<{
    id?: string;
  }>;
  error?: {
    message?: string;
  };
};

export async function sendWhatsAppTextMessage({
  to,
  text,
}: SendWhatsAppTextMessageInput) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v20.0";

  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp API credentials are not configured.");
  }

  const response = await fetch(
    `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: text,
        },
      }),
    },
  );

  const data = (await response.json()) as WhatsAppMessageResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Unable to send WhatsApp message.");
  }

  const messageId = data.messages?.[0]?.id;

  if (!messageId) {
    throw new Error("WhatsApp response did not include a message id.");
  }

  return { messageId };
}
