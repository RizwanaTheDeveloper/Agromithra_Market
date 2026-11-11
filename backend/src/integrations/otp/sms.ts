import { ServiceUnavailableException } from '@nestjs/common';

interface SmsConfig { get<T = string>(key: string): T | undefined; }

/** Sends one SMS through Twilio's REST API. Credentials come only from the server environment. */
export async function sendSms(config: SmsConfig, phone: string, text: string): Promise<void> {
  const sid = config.get('TWILIO_ACCOUNT_SID'), token = config.get('TWILIO_AUTH_TOKEN');
  const from = config.get('TWILIO_FROM'), service = config.get('TWILIO_MESSAGING_SERVICE_SID');
  if (!sid || !token || (!from && !service)) throw new ServiceUnavailableException('SMS provider is not configured');
  const form = new URLSearchParams({ To: phone, Body: text });
  if (service) form.set('MessagingServiceSid', service); else form.set('From', from as string);
  let response: Response;
  try {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST', body: form, signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
    });
  } catch {
    throw new ServiceUnavailableException('The SMS provider could not be reached');
  }
  if (!response.ok) throw new ServiceUnavailableException('The code could not be sent. Try again shortly.');
}
