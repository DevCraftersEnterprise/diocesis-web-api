import type { ParityCase } from '../types';
import { authErrorCases, detailGetCases } from './detail-and-errors';
import { publicGetCases } from './public-get';

export const cases: readonly ParityCase[] = [
  ...publicGetCases,
  ...detailGetCases,
  ...authErrorCases,
];
