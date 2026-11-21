/**
 * CAMPORA transactional email relay.
 * Deploy as a Web app: Execute as Me; access Anyone.
 * Set Script Property CAMPORA_MAILER_TOKEN to the same random secret used in Render.
 */
function doPost(e) {
  try {
    var expectedToken = PropertiesService.getScriptProperties().getProperty('CAMPORA_MAILER_TOKEN');
    if (!expectedToken || !e || !e.postData || !e.postData.contents) {
      return json_({ success: false, error: 'Relay is not configured.' });
    }
    var payload = JSON.parse(e.postData.contents);
    if (!payload || typeof payload.token !== 'string' || !constantTimeEquals_(payload.token, expectedToken)) {
      return json_({ success: false, error: 'Unauthorized.' });
    }
    var to = String(payload.to || '').trim();
    var subject = String(payload.subject || '').trim();
    var html = String(payload.html || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject || subject.length > 180 || !html || html.length > 100000) {
      return json_({ success: false, error: 'Invalid email payload.' });
    }
    GmailApp.sendEmail(to, subject, 'This message contains HTML content. Please view it in an HTML-capable email client.', {
      htmlBody: html,
      name: 'CAMPORA'
    });
    return json_({ success: true });
  } catch (err) {
    console.error('CAMPORA mail relay error: ' + String(err));
    return json_({ success: false, error: 'Email delivery failed.' });
  }
}
function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
