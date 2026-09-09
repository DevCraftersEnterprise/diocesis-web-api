import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  Min,
  ValidateNested,
  type ValidationError,
} from 'class-validator';
import {
  createValidationPipe,
  formatValidationErrors,
} from './validation.config';

class AddressDto {
  @IsNotEmpty()
  street!: string;
}

class SampleDto {
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;

  @IsInt()
  @Min(0)
  age!: number;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}

const metadata = { type: 'body', metatype: SampleDto } as const;

const asErrors = (partials: Partial<ValidationError>[]): ValidationError[] =>
  partials as ValidationError[];

describe('formatValidationErrors', () => {
  it('aplana a { campo: [mensajes] } al estilo serializer.errors de DRF', () => {
    const errors = asErrors([
      {
        property: 'username',
        constraints: { isNotEmpty: 'username should not be empty' },
      },
      { property: 'email', constraints: { isEmail: 'email must be an email' } },
    ]);

    expect(formatValidationErrors(errors)).toEqual({
      username: ['username should not be empty'],
      email: ['email must be an email'],
    });
  });

  it('usa ruta con puntos para errores anidados', () => {
    const errors = asErrors([
      {
        property: 'address',
        children: asErrors([
          {
            property: 'street',
            constraints: { isNotEmpty: 'street should not be empty' },
          },
        ]),
      },
    ]);

    expect(formatValidationErrors(errors)).toEqual({
      'address.street': ['street should not be empty'],
    });
  });

  it('cae a un mensaje generico cuando no hay constraints ni hijos', () => {
    expect(formatValidationErrors(asErrors([{ property: 'x' }]))).toEqual({
      x: ['Valor invalido.'],
    });
  });
});

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();

  it('lanza BadRequestException con la forma DRF ante datos invalidos', async () => {
    expect.assertions(4);
    try {
      await pipe.transform(
        { email: 'no-es-email', age: -1, address: {} },
        metadata,
      );
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as Record<
        string,
        string[]
      >;
      expect(Array.isArray(body.username)).toBe(true);
      expect(Array.isArray(body.email)).toBe(true);
      expect(Array.isArray(body['address.street'])).toBe(true);
    }
  });

  it('descarta propiedades desconocidas (whitelist) y castea el DTO', async () => {
    const out: unknown = await pipe.transform(
      {
        username: 'ana',
        email: 'ana@x.com',
        age: 3,
        address: { street: 'A' },
        hacker: 'x',
      },
      metadata,
    );

    expect(out).toBeInstanceOf(SampleDto);
    expect(out).not.toHaveProperty('hacker');
  });
});
