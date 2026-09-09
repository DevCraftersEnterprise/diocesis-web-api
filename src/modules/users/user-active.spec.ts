import { isActiveUser } from './user-active';

describe('isActiveUser', () => {
  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ])(
    'isActive=%s isActiveAuth=%s -> %s',
    (isActive, isActiveAuth, expected) => {
      expect(isActiveUser({ isActive, isActiveAuth })).toBe(expected);
    },
  );
});
