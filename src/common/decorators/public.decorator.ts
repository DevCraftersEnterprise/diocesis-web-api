import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/** Exime a la ruta (o al controlador) del `JwtAuthGuard` global. Para los `GET` `AllowAny`
 *  del inventario y para `/token/*`. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
