export class HttpBodyTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`HTTP request body exceeds the limit of ${maxBytes} bytes.`);
    this.name = "HttpBodyTooLargeError";
  }
}
