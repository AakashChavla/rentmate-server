import { TIME } from './duration.constants';
export const seconds = (value: number): number => value * TIME.SECOND;
export const minutes = (value: number): number => value * TIME.MINUTE;
export const hours = (value: number): number => value * TIME.HOUR;
