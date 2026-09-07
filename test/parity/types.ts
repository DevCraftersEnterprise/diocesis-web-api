export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ParityAuth = 'none' | 'user' | 'admin' | 'super';

export interface ParityFilePart {
  /** Ruta al archivo, relativa a test/parity/files/. */
  file: string;
  filename: string;
  contentType?: string;
}

export interface ParityCase {
  /** Id unico, valido como nombre de archivo. */
  id: string;
  description: string;
  method: HttpMethod;
  /** Ruta desde la raiz del API, empieza por '/', query string incluida. */
  path: string;
  /** Body JSON para POST/PUT/PATCH. Excluyente con `form`. */
  body?: unknown;
  /** Campos multipart/form-data. */
  form?: Record<string, string | ParityFilePart>;
  /** Por defecto 'none'. */
  auth?: ParityAuth;
  /** Rutas extra a ignorar en el diff para este caso (ver normalize.ts). */
  ignore?: readonly string[];
  /** Si esta puesto, un diff se reporta como aviso, no como fallo (delta documentado). */
  expectedDelta?: string;
}

export interface ParityResponse {
  status: number;
  /** JSON parseado, o texto crudo, o null si el cuerpo esta vacio. */
  body: unknown;
  isJson: boolean;
}

export interface DiffEntry {
  path: string;
  oracle: unknown;
  candidate: unknown;
}
