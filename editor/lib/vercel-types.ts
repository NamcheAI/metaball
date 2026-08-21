export type VercelQueryValue = string | string[] | undefined;

export interface VercelRequest {
  method?: string;
  body?: unknown;
  query: Record<string, VercelQueryValue>;
  headers: Record<string, VercelQueryValue>;
}

export interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  end(body?: string): VercelResponse;
  redirect(code: number, location: string): VercelResponse;
}
