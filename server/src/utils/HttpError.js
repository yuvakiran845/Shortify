// An error that carries an HTTP status code. Throw it from any route or
// service; the error-handling middleware turns it into a JSON response.
// `field` tells the frontend which form input the message belongs to.
export class HttpError extends Error {
  constructor(status, message, { field } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.field = field;
  }
}
