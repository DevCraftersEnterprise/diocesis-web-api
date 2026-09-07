import type { ParityCase } from '../types';
import { publicGetCases } from './public-get';

export const cases: readonly ParityCase[] = [...publicGetCases];
