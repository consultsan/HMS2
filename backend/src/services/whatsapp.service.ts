import axios from 'axios';

const WHATSAPP_CLOUD_API_VERSION = 'latest'; // Or the latest version
const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WA_CLOUD_API_ACCESS_TOKEN;

async function sendWhatsAppMessage(to: string, messageBody: string) {
  const url = `https://graph.facebook.com/${WHATSAPP_CLOUD_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: to, // Recipient's number (E.164 format)
        type: 'text',
        text: {
          body: messageBody,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('WhatsApp Cloud API response:', response.data);
  } catch (error: any) {
    console.error(
      'Error sending WhatsApp Cloud API message:',
      error.response ? error.response.data : error.message
    );
  }
}

export default sendWhatsAppMessage;