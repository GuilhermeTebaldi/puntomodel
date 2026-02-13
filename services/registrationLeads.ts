import { apiFetch } from './api';

export type RegistrationLeadPayload = {
  name: string;
  phone: string;
  phoneCountryDial?: string;
};

export const trackRegistrationStart = async (payload: RegistrationLeadPayload) => {
  try {
    const response = await apiFetch('/api/registrations/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const trackRegistrationComplete = async (payload: RegistrationLeadPayload) => {
  try {
    const response = await apiFetch('/api/registrations/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch {
    return false;
  }
};
