import { NotFoundException, ParseUUIDPipe } from '@nestjs/common';

/**
 * `@Param('id', uuidParam())`: valida que el segmento sea UUID. Un valor no-UUID da
 * **404** (como el converter `<uuid:pk>` de Django, que ni siquiera casa la ruta), no 400.
 */
export function uuidParam(): ParseUUIDPipe {
  return new ParseUUIDPipe({
    exceptionFactory: () => new NotFoundException({ detail: 'No encontrado.' }),
  });
}
