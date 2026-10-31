export type MockRequest = {
  method: string;
  path: string;
  query: string;
  token: string | undefined;
  body: unknown;
};
