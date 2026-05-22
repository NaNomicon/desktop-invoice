import { query } from '@/lib/db';
import type { WhatsAppTemplate } from '@/lib/types';

export interface SendWhatsAppParams {
  phone: string;
  template_name: string;
  template_id: string;
  variables: Record<number, string>;
}

export interface SendWhatsAppResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

const GRAPH_API_BASE = 'https://graph.facebook.com/v18.0';

interface WhatsAppConfig {
  access_token: string;
  phone_number_id: string;
}

async function getConfig(): Promise<WhatsAppConfig> {
  const envToken = import.meta.env.VITE_META_ACCESS_TOKEN as string | undefined;
  const envPhoneId = import.meta.env.VITE_META_PHONE_NUMBER_ID as string | undefined;

  if (envToken && envPhoneId) {
    return { access_token: envToken, phone_number_id: envPhoneId };
  }

  const rows = await query<{ wa_access_token: string; wa_phone_number_id: string }>(
    'SELECT wa_access_token, wa_phone_number_id FROM tbl_setting WHERE id = 1',
  );

  const row = rows[0];
  if (!row?.wa_access_token || !row?.wa_phone_number_id) {
    throw new Error(
      'WhatsApp config missing. Set VITE_META_ACCESS_TOKEN & VITE_META_PHONE_NUMBER_ID or add wa_access_token & wa_phone_number_id to tbl_setting.',
    );
  }

  return { access_token: row.wa_access_token, phone_number_id: row.wa_phone_number_id };
}

async function validateTemplate(template_id: string): Promise<WhatsAppTemplate> {
  const rows = await query<WhatsAppTemplate>(
    'SELECT * FROM tbl_wa_template WHERE template_id = ?',
    [template_id],
  );

  const tmpl = rows[0];
  if (!tmpl) throw new Error(`WhatsApp template "${template_id}" not found in tbl_wa_template.`);
  if (tmpl.status !== 'APPROVED') {
    throw new Error(`Template "${tmpl.template_name}" status is "${tmpl.status}", must be APPROVED.`);
  }

  return tmpl;
}

function buildPayload(params: SendWhatsAppParams) {
  const sortedKeys = Object.keys(params.variables).map(Number).sort((a, b) => a - b);
  const bodyParameters = sortedKeys.map((key) => ({ type: 'text', text: params.variables[key] }));

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: params.phone,
    type: 'template',
    template: {
      name: params.template_name,
      language: { code: 'en_US' },
      components: bodyParameters.length > 0 ? [{ type: 'body', parameters: bodyParameters }] : [],
    },
  };
}

export async function sendWhatsApp(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  try {
    await validateTemplate(params.template_id);
    const config = await getConfig();
    const payload = buildPayload(params);
    const url = `${GRAPH_API_BASE}/${config.phone_number_id}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data?.error?.message ?? `Meta API error ${response.status}` };
    }

    return { success: true, message_id: data?.messages?.[0]?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}