import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { PasswordService } from '../auth/password.service';
import type { Usuario } from './entities/usuario.entity';
import { UsersService } from './users.service';

const passwords = new PasswordService();

function build(existingUsernames: string[] = []) {
  const repo = {
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 'x' }] }),
    existsBy: jest
      .fn()
      .mockImplementation(({ username }: { username: string }) =>
        Promise.resolve(existingUsernames.includes(username)),
      ),
    findOne: jest.fn(),
  } as unknown as Repository<Usuario>;
  return { service: new UsersService(repo, passwords), repo };
}

const actor = (over: Partial<Usuario> = {}) =>
  ({
    id: 'a1',
    role: 'admin',
    username: 'admin',
    email: 'a@x.test',
    ...over,
  }) as Usuario;

describe('UsersService.changePassword', () => {
  it('400 { current_password } si la actual no coincide', async () => {
    const { service } = build();
    const me = actor({ password: await passwords.hash('la-buena') });
    await expect(
      service.changePassword(me, 'la-mala', 'una-nueva-decente'),
    ).rejects.toMatchObject({
      response: { current_password: expect.any(Array) },
    });
  });

  it('400 { new_password } si la nueva es debil', async () => {
    const { service } = build();
    const me = actor({ password: await passwords.hash('la-buena') });
    await expect(
      service.changePassword(me, 'la-buena', '123'),
    ).rejects.toMatchObject({ response: { new_password: expect.any(Array) } });
  });

  it('OK: hashea la nueva y persiste solo password', async () => {
    const { service, repo } = build();
    const me = actor({ password: await passwords.hash('la-buena') });
    await expect(
      service.changePassword(me, 'la-buena', 'una-nueva-decente'),
    ).resolves.toEqual({ mensaje: 'Contrasena actualizada correctamente.' });
    const [, patch] = (repo.update as jest.Mock).mock.calls[0] as [
      unknown,
      { password: string },
    ];
    expect(patch.password.startsWith('$argon2id$')).toBe(true);
  });
});

describe('UsersService.resetPassword', () => {
  it('admin no puede resetear a un super -> 403', async () => {
    const { service, repo } = build();
    (repo.findOne as jest.Mock).mockResolvedValue({ id: 't1', role: 'super' });
    await expect(service.resetPassword('t1', actor())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('devuelve { mensaje, password } con una contrasena aleatoria (no el username)', async () => {
    const { service, repo } = build();
    (repo.findOne as jest.Mock).mockResolvedValue({
      id: 't1',
      role: 'user',
      username: 'pepe',
    });
    const res = await service.resetPassword('t1', actor());
    expect(res.mensaje).toContain('pepe');
    expect(res.password).toHaveLength(16);
    expect(res.password).not.toBe('pepe');
  });
});

describe('UsersService.createFromCsv', () => {
  it('procesa filas validas e informa de las invalidas', async () => {
    const { service, repo } = build(['ya_existe']);
    const csv = Buffer.from(
      [
        'username,email,role,password',
        'nuevo1,n1@x.test,user,clave-larga-1',
        'nuevo2,n2@x.test,user,', // password vacio -> usa username
        'malrol,mr@x.test,jefe,x',
        'ya_existe,ye@x.test,user,x',
        'sinemail,,user,x',
        'super_x,sx@x.test,super,x', // admin no puede crear super
      ].join('\n'),
    );

    const res = await service.createFromCsv(csv, actor());

    expect(res.creados).toEqual(['nuevo1', 'nuevo2']);
    expect(res.errores).toHaveLength(4);
    expect(res.mensaje).toBe('Se procesaron 2 usuarios.');
    expect(repo.insert).toHaveBeenCalledTimes(2);
  });

  it('CSV ilegible -> 400 { error }', async () => {
    const { service } = build();
    await expect(
      service.createFromCsv(Buffer.from('a,b\n"c'), actor()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
