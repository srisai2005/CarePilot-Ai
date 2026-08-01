const { createHandler } = require('azure-function-express');
const app = require('../app');

// Wraps the whole Express app (all /api/* routes, middleware, and error
// handling) so it can run as a single Azure Function behind Static Web
// Apps' built-in /api routing — no route-by-route rewrite needed.
module.exports = createHandler(app);
