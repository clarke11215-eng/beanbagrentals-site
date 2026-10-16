/*
 * Netlify runs this automatically after every verified (non-spam) form submission.
 *
 * It only handles the Weddings page form ("wedding-inquiry"): it copies the submission into the
 * "Wedding Inquiries" table in the Bean Bag Operations Airtable base, where Ashley can filter by Status,
 * sort by event date and export CSV.
 *
 * Safety design:
 *   - Netlify Forms has ALREADY stored the submission before this runs, so a failure here never loses a lead.
 *   - A failure is logged and answered with HTTP 200 so Netlify does not treat the submission as failed.
 *   - Duplicate protection: the page sends a per-submission id; if Airtable already has it, nothing is created.
 *
 * Environment variables (Netlify > Site configuration > Environment variables):
 *   AIRTABLE_TOKEN            personal access token with data.records read/write on the Operations base  (required, secret)
 *   AIRTABLE_BASE_ID          defaults to appMiApU13Ep5ZnA1
 *   AIRTABLE_WEDDING_TABLE_ID defaults to tblb0KzX92mtD4aQm  (Wedding Inquiries)
 */
'use strict';

const BASE_ID = process.env.AIRTABLE_BASE_ID || 'appMiApU13Ep5ZnA1';
const TABLE_ID = process.env.AIRTABLE_WEDDING_TABLE_ID || 'tblb0KzX92mtD4aQm';

const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => String(x).trim()).filter(Boolean);
const str = (v) => (v === undefined || v === null ? '' : String(Array.isArray(v) ? v.join(', ') : v).trim());
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(str(v)) ? str(v) : undefined);

function buildFields(d, createdAt) {
  const month = /^\d{4}-\d{2}$/.test(str(d.event_month_iso)) ? str(d.event_month_iso) + '-01' : undefined;
  const guests = parseInt(str(d.guest_count), 10);
  const fields = {
    Name: str(d.name),
    Status: str(d.follow_up_status) || 'New',
    Submitted: createdAt || str(d.submitted_at) || new Date().toISOString(),
    Email: str(d.email),
    Phone: str(d.phone),
    Source: str(d.lead_source),
    'Expo offer applies': ['Yes', 'Verify', 'No'].includes(str(d.expo_offer_applies)) ? str(d.expo_offer_applies) : 'No',
    'Expo basis': str(d.expo_offer_basis),
    Campaign: str(d.lead_campaign),
    'Event type': str(d.event_type),
    'Event month': str(d.event_month),
    'Event month (sort)': month,
    'Event date': isoDate(d.event_date),
    Venue: str(d.venue),
    Location: str(d.location),
    'Guest count': Number.isFinite(guests) ? guests : undefined,
    'Bean bags': str(d.bag_count),
    Colors: arr(d.colors),
    'Add-ons': arr(d.addons),
    Notes: str(d.notes),
    'Marketing consent': str(d.marketing_consent_status) === 'Opted in' ? 'Opted in' : 'Not opted in',
    'Submission ID': str(d.submission_id),
  };
  // Airtable rejects empty strings for typed fields (selects, dates, email, phone): drop anything blank.
  Object.keys(fields).forEach((k) => {
    const v = fields[k];
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete fields[k];
  });
  return fields;
}

async function airtable(path, opts, token) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts && opts.headers) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

exports.buildFields = buildFields;

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || '{}');
    if (!payload || payload.form_name !== 'wedding-inquiry') return { statusCode: 200, body: 'ignored: other form' };

    const token = process.env.AIRTABLE_TOKEN;
    if (!token) {
      console.error('wedding-inquiry: AIRTABLE_TOKEN is not set. The submission is safe in Netlify Forms; it was not copied to Airtable.');
      return { statusCode: 200, body: 'airtable not configured' };
    }

    const d = payload.data || {};
    const fields = buildFields(d, payload.created_at);

    // idempotency: skip if this submission id is already in Airtable
    if (fields['Submission ID']) {
      const formula = encodeURIComponent(`{Submission ID}='${fields['Submission ID'].replace(/'/g, "\\'")}'`);
      const found = await airtable(`${TABLE_ID}?maxRecords=1&filterByFormula=${formula}`, { method: 'GET' }, token);
      if (found.records && found.records.length) return { statusCode: 200, body: 'duplicate ignored' };
    }

    const created = await airtable(TABLE_ID, { method: 'POST', body: JSON.stringify({ records: [{ fields }], typecast: true }) }, token);
    console.log('wedding-inquiry saved to Airtable:', created.records && created.records[0] && created.records[0].id);
    return { statusCode: 200, body: 'saved' };
  } catch (err) {
    console.error('wedding-inquiry: could not copy to Airtable (submission is still stored in Netlify Forms):', err.message);
    return { statusCode: 200, body: 'airtable error logged' };
  }
};
