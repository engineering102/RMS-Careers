import { teardown } from './lifecycle';

export default function globalTeardown(): void {
  teardown();
}
