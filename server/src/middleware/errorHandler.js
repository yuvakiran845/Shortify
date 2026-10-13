import { HttpError } from '../utils/HttpError.js';

// Any request that did not match a route ends up here.
export function notFound(req, res) {
  res.status(404).json({ message: 'Not found.' });
}

// True when MongoDB cannot be reached (server down, network problem, or a
// query that waited too long for the connection to come back).
export function isDatabaseUnavailable(error) {
  return (
    /^Mongo(ose)?(ServerSelection|Network|NetworkTimeout|NotConnected)Error$/.test(error?.name) ||
    (error?.name === 'MongooseError' && /buffering timed out/i.test(error.message))
  );
}

// Central error handler: every error becomes a consistent JSON response
// of the form { message, field? }. Internal details are logged, never sent.
// Express recognizes error handlers by their four parameters.
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, req, res, next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      message: error.message,
      ...(error.field && { field: error.field }),
    });
  }

  // Errors raised by express.json()
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must be valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large.' });
  }

  // Input is validated before it reaches the database, so these are a safety
  // net: a value the schema rejects is the client's mistake (400), not a crash (500).
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'Some of the data sent is not valid.' });
  }

  if (isDatabaseUnavailable(error)) {
    console.error('Database unavailable:', error.message);
    return res.status(503).json({ message: 'Shortify is temporarily unavailable. Please try again in a moment.' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
}
