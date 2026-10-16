// TEMPORARY review-branch helper: lets us call the real submission-created handler over HTTP
// (Netlify blocks direct calls to event functions). Delete before merging to main.
const { handler } = require('./submission-created.js');
exports.handler = async (event) => {
  const logs = [];
  const orig = console.error;
  console.error = (...a) => { logs.push(a.join(' ')); orig(...a); };
  const res = await handler(event);
  console.error = orig;
  return { statusCode: 200, body: JSON.stringify({ result: res.body, errors: logs, tokenSet: !!process.env.AIRTABLE_TOKEN, tokenLen: (process.env.AIRTABLE_TOKEN || '').length, cleanLen: (process.env.AIRTABLE_TOKEN || '').replace(/[^A-Za-z0-9._-]/g, '').length, removedCodes: [...(process.env.AIRTABLE_TOKEN || '')].filter(c => /[^A-Za-z0-9._-]/.test(c)).map(c => c.charCodeAt(0)), prefix: (process.env.AIRTABLE_TOKEN || '').slice(0, 4).replace(/[A-Za-z0-9]/g, 'x') === 'xxxx' ? 'alnum4' : 'odd', startsPat: /^\s*pat/.test(process.env.AIRTABLE_TOKEN || ''), dots: ((process.env.AIRTABLE_TOKEN || '').match(/\./g) || []).length, v: 3 }) };
};
