export class HTTPError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    message?: string,
  ) {
    super(message || `HTTP Error ${status}: ${statusText}`);

    this.name = 'HTTPError';
  }
}
