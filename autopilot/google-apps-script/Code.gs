/**
 * AutomateX360: saves every call booked on the website into this Google Sheet,
 * and sends you each one on WhatsApp.
 *
 * How the pieces fit: the website's booking form posts to the site's own
 * Vercel function (api/book.ts), which forwards the booking here with a shared
 * password. Neither this script's URL, the password, nor the WhatsApp key ever
 * reach visitors' browsers.
 *
 * Setup steps are in the README (section "Booking → Google Sheet → WhatsApp").
 * After changing this code later: Deploy > Manage deployments > Edit >
 * Version: New version (the web app URL stays the same).
 */

var WHATSAPP_API = 'https://api.whatsapp.com/agent/v1';

// Time zone for the "Submitted" column. Use the same value as OWNER_TIMEZONE in Vercel.
var TIME_ZONE = 'Asia/Karachi';

// One tab per website form. `keys` are the field names the website sends, in column order.
var TABS = {
  booking: {
    name: 'Bookings',
    alert: '📅 New call booked',
    headers: ['Submitted', 'Name', 'Business', 'Email', 'Phone', 'Website', 'Budget', 'Call time (yours)', 'Call time (theirs)', 'Their time zone', 'Notes'],
    keys: ['name', 'business', 'email', 'phone', 'website', 'budget', 'callTimeYours', 'callTimeTheirs', 'timeZone', 'notes']
  }
};

// Run once from the editor: asks for permission, remembers the sheet and creates the tab.
function setup() {
  // Ask for every permission now, so a missing one can't break WhatsApp later.
  if (ScriptApp.requireAllScopes) ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);

  var props = PropertiesService.getScriptProperties();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    // Opened from the sheet (Extensions > Apps Script): remember which sheet it is,
    // because "the active spreadsheet" isn't reliably available to a web app.
    props.setProperty('SHEET_ID', ss.getId());
  } else if (props.getProperty('SHEET_ID')) {
    // A script made outside the sheet: SHEET_ID (the sheet's link or id) says which one.
    ss = openSpreadsheet();
  } else {
    throw new Error(
      'This script is not attached to a Google Sheet. Add a Script Property SHEET_ID with your ' +
      "sheet's link (Project Settings > Script Properties), or open the script from the sheet " +
      'with Extensions > Apps Script. Then run setup again.'
    );
  }
  ss.setSpreadsheetTimeZone(TIME_ZONE);
  Object.keys(TABS).forEach(function (key) { getSheet(TABS[key]); });

  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);

  console.log(status());
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'Invalid request' });
  }
  if (!data || typeof data !== 'object') return reply({ ok: false, error: 'Invalid request' });

  // Only the website's server knows this password.
  var secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if (!secret || data.secret !== secret) return reply({ ok: false, error: 'Unauthorized' });

  var tab = TABS[data.form];
  if (!tab) return reply({ ok: false, error: 'Unknown form: ' + data.form });

  // Hold the lock only while writing the row, so one slow alert can't hold up other bookings.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply({ ok: false, error: 'Busy, try again.' });
  try {
    var row = tab.keys.map(function (key) { return asText(data[key]); });
    getSheet(tab).appendRow([new Date()].concat(row));
    SpreadsheetApp.flush();
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }

  // The booking is saved. The alert has a short time limit and never throws.
  notifyWhatsApp(alertText(tab, data));
  return reply({ ok: true });
}

// Opening the web app URL shows whether everything is set up. Check it in a
// private (incognito) window: a Google sign-in page there means "Who has
// access" is not set to "Anyone".
function doGet() {
  return ContentService.createTextOutput(status());
}

function status() {
  var props = PropertiesService.getScriptProperties();
  var sheetOk = false;
  try {
    sheetOk = !!getSheet(TABS.booking);
  } catch (err) {
    console.error(err);
  }
  return [
    'AutomateX360 bookings',
    '- Sheet: ' + (sheetOk ? 'connected' : 'NOT reachable, run setup again'),
    '- Password (SHARED_SECRET): ' + (props.getProperty('SHARED_SECRET') ? 'set' : 'MISSING'),
    '- WhatsApp: ' + (props.getProperty('WHATSAPP_USER_ID') ? 'connected' : 'not connected, run connectWhatsApp')
  ].join('\n');
}

// SHEET_ID may be the bare id or the sheet's full link (…/spreadsheets/d/<id>/edit…).
function openSpreadsheet() {
  var value = (PropertiesService.getScriptProperties().getProperty('SHEET_ID') || '').trim();
  var match = value.match(/\/d\/([a-zA-Z0-9_-]+)/);
  var id = match ? match[1] : value;
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(tab) {
  var ss = openSpreadsheet();
  var sheet = ss.getSheetByName(tab.name);
  if (!sheet) {
    sheet = ss.insertSheet(tab.name);
    sheet.appendRow(tab.headers);
    sheet.getRange(1, 1, 1, tab.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// The leading apostrophe keeps what visitors typed as plain text: phone numbers stay as typed,
// and nothing they enter can run as a spreadsheet formula.
function asText(value) {
  var text = value == null ? '' : String(value).trim();
  return text ? "'" + text : '';
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- WhatsApp alerts (Meta's WhatsApp Agent Platform API) ---------------- */

// Run once from the editor. An agent can only message its creator, and learns the creator's
// WhatsApp id from a message they send it, so this waits up to 5 minutes for one.
function connectWhatsApp() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('WHATSAPP_API_KEY');
  if (!key) throw new Error('Add WHATSAPP_API_KEY under Project Settings > Script Properties first.');

  var offset = null;
  var stopAt = Date.now() + 5 * 60 * 1000;
  while (Date.now() < stopAt) {
    var res = UrlFetchApp.fetch(
      WHATSAPP_API + '/updates?timeout=25&limit=100' + (offset == null ? '' : '&offset=' + offset),
      { headers: { Authorization: 'Bearer ' + key }, muteHttpExceptions: true }
    );
    if (res.getResponseCode() === 204) { Utilities.sleep(4000); continue; } // nothing yet; Meta allows 15 polls a minute
    if (res.getResponseCode() !== 200) throw new Error('WhatsApp replied ' + res.getResponseCode() + ': ' + res.getContentText());

    var body = JSON.parse(res.getContentText());
    offset = body.next_offset;
    var sender = lastSender(body);
    if (!sender) continue;

    // Meta only delivers to the agent's creator, so a successful send also confirms it's you.
    var sent = sendWhatsApp(key, sender, '✅ Connected! New website bookings will show up here.', 30);
    if (sent.getResponseCode() < 300) {
      props.setProperty('WHATSAPP_USER_ID', sender);
      console.log('Connected. Alerts will go to ' + sender + '.');
      return;
    }
    console.warn('Could not message ' + sender + ': ' + sent.getContentText());
  }
  throw new Error('No WhatsApp message reached the agent. Send it a message, then run connectWhatsApp again.');
}

// Never throws, and gives up after 8 seconds: a WhatsApp problem must not stop or slow the booking.
function notifyWhatsApp(text) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('WHATSAPP_API_KEY');
  var to = props.getProperty('WHATSAPP_USER_ID');
  if (!key || !to) return;
  try {
    var res = sendWhatsApp(key, to, text, 8);
    if (res.getResponseCode() >= 300) console.error('WhatsApp alert failed: ' + res.getContentText());
  } catch (err) {
    console.error('WhatsApp alert failed: ' + err);
  }
}

function sendWhatsApp(key, to, text, timeoutSeconds) {
  return UrlFetchApp.fetch(WHATSAPP_API + '/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + key },
    payload: JSON.stringify({ messaging_product: 'whatsapp', to: to, type: 'text', text: { body: text } }),
    muteHttpExceptions: true,
    timeoutSeconds: timeoutSeconds
  });
}

// The booking's filled-in fields, labelled with the sheet's column names. WhatsApp caps a message at 4096 characters.
function alertText(tab, data) {
  var lines = ['*' + tab.alert + '*'];
  tab.keys.forEach(function (key, i) {
    var value = data[key] == null ? '' : String(data[key]).trim();
    if (value) lines.push('*' + tab.headers[i + 1] + ':* ' + value);
  });
  return lines.join('\n').slice(0, 4000);
}

function lastSender(body) {
  var sender = null;
  (body.entry || []).forEach(function (entry) {
    (entry.changes || []).forEach(function (change) {
      ((change.value || {}).messages || []).forEach(function (message) {
        if (/^user:\d+$/.test(message.from)) sender = message.from;
      });
    });
  });
  return sender;
}
