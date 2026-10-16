// TEMPORARY review-branch helper: lets us call the real submission-created handler over HTTP
// (Netlify blocks direct calls to event functions). Delete before merging to main.
const { handler } = require('./submission-created.js');
exports.handler = handler;
