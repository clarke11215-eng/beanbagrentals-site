/*
 * Weddings page — Bridal Expo offer settings.   Edit this file to change or switch off the offer.
 * No other file needs touching.
 *
 *  active   : true  -> offer section, expo question and lead tagging are live
 *             false -> offer section and expo question disappear; every new lead is tagged "No"
 *  endsOn   : last day the offer shows, as 'YYYY-MM-DD' (inclusive). null = until you set active:false.
 *  source   : the ?source= value on the booth QR link   (https://beanbagrentals.com/weddings?source=bridal-expo-2026)
 *  codes    : approved expo codes (UPPER CASE). Leave [] if you are not issuing codes. A code can also be
 *             sent on a link:  /weddings?code=YOURCODE   (shown in the form and honored as eligible).
 *  text     : optional wording overrides for the promo card (badge, copy, offerHtml, fine).
 *
 * How eligibility is recorded on every inquiry (field "expo_offer_applies"):
 *   Yes    -> arrived through the QR link (or an approved code)
 *   Verify -> ticked "Yes, I met you at the expo" without the link or a code: confirm they registered
 *   No     -> everyone else (the offer is NOT applied to general visitors)
 */
window.BBRC_WEDDINGS = {
  offer: {
    active: true,
    endsOn: null,
    source: 'bridal-expo-2026',
    sourceLabel: 'Bridal Expo 2026',
    campaign: 'NC Bridal & Wedding Expo — Oct 18, 2026',
    codes: []
  }
};
