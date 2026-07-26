import { beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { __resetDBForTests } from '../src/storage/indexeddb/db';

// fake-indexeddb/auto polyfills IDBRequest/IDBKeyRange/etc globally once;
// we still swap in a brand new IDBFactory before every test (and drop
// db.ts's cached connection) so no test sees data left over from another.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  __resetDBForTests();
});
