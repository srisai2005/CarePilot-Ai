/**
 * Azure Functions v4 programming model entry point.
 * Every file under ./functions calls `app.http(...)` to register itself —
 * requiring them here is enough to wire up all routes.
 */
require('./functions/health');
require('./functions/languages');
require('./functions/upload');
require('./functions/records');
require('./functions/reminders');
require('./functions/schedule');
require('./functions/chat');
require('./functions/dictionary');
require('./functions/search');
require('./functions/speech');
