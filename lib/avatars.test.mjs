import assert from 'node:assert/strict';
import test from 'node:test';
import { avatarCacheSeconds, avatarUploadOptions, avatarRemotePatterns, getAvatarUrl, isLocalAvatarSource, replaceAvatar, replaceAvatarWithRecovery } from './avatars.ts';

test('legacy versions, missing avatars and immutable URLs', () => {
  assert.equal(getAvatarUrl('unused', null), '');
  assert.equal(getAvatarUrl('https://host/avatar.webp', 'uid/avatar.webp', 'a:b'), 'https://host/avatar.webp?v=a%3Ab');
  assert.equal(getAvatarUrl('https://host/avatar.webp', 'uid/avatar.webp'), 'https://host/avatar.webp');
  assert.equal(getAvatarUrl('https://host/new.webp', 'uid/12345678-1234-1234-1234-123456789abc.webp', 'timestamp'), 'https://host/new.webp');
  assert.equal(getAvatarUrl('https://host/old.jpg', 'uid/old.jpg', 'timestamp'), 'https://host/old.jpg?v=timestamp');
  assert.equal(avatarCacheSeconds, 31536000);
  assert.deepEqual(avatarUploadOptions, { cacheControl: '31536000', contentType: 'image/webp', upsert: false });
});

test('exact optimizer origin and bucket, legacy queries permitted; local exception is narrow', () => {
  assert.deepEqual(avatarRemotePatterns('https://project.supabase.co'), [{ protocol: 'https', hostname: 'project.supabase.co', port: '', pathname: '/storage/v1/object/public/avatars/**' }]);
  assert.deepEqual(avatarRemotePatterns(), []);
  const local = 'http://127.0.0.1:54321';
  assert.equal(isLocalAvatarSource(`${local}/storage/v1/object/public/avatars/u/a.webp`, local), true);
  for (const source of ['blob:abc', `${local}/storage/v1/object/public/proofs/a`, 'https://other/storage/v1/object/public/avatars/a']) {
    assert.equal(isLocalAvatarSource(source, local), false);
  }
  assert.equal(isLocalAvatarSource('https://project.supabase.co/storage/v1/object/public/avatars/a', 'https://project.supabase.co'), false);
});

function fixture(overrides = {}) {
  const events = [];
  const options = {
    userId: 'uid', previousPath: 'uid/avatar.webp', blob: new Blob(['source']),
    upload: async (path, blob) => { events.push(['upload', path]); assert.equal(blob, options.blob); },
    update: async (path) => { events.push(['update', path]); return true; },
    remove: async (path) => { events.push(['remove', path]); },
    ...overrides,
  };
  return { options, events };
}

test('upload, pointer, then only previous-source cleanup; replacements unique', async () => {
  const { options, events } = fixture();
  const first = await replaceAvatar(options);
  const second = await replaceAvatar({ ...options, previousPath: first });
  assert.match(first, /^uid\/[0-9a-f-]+\.webp$/);
  assert.notEqual(first, second);
  assert.deepEqual(events, [['upload', first], ['update', first], ['remove', 'uid/avatar.webp'], ['upload', second], ['update', second], ['remove', first]]);
});

test('confirmed rejection removes only orphan; cleanup failure does not mask rejection', async () => {
  const removed = [];
  const { options } = fixture({ update: async () => false, remove: async p => { removed.push(p); throw Error('cleanup'); } });
  await assert.rejects(replaceAvatar(options), /avatarUpdateFailed/);
  assert.equal(removed.length, 1);
  assert.notEqual(removed[0], options.previousPath);
});

test('failed upload never updates; ambiguous update never deletes; successful cleanup best effort', async () => {
  const failed = fixture({ upload: async () => { throw Error('upload'); } });
  await assert.rejects(replaceAvatar(failed.options), /upload/);
  assert.deepEqual(failed.events, []);
  const ambiguous = fixture({ update: async () => { throw Error('network'); } });
  await assert.rejects(replaceAvatar(ambiguous.options), /network/);
  assert.equal(ambiguous.events.length, 1);
  const cleanup = fixture({ remove: async () => { throw Error('cleanup'); } });
  assert.ok(await replaceAvatar(cleanup.options));
});

test('concurrent compare-and-swap loser cannot remove winner', async () => {
  let active = 'uid/avatar.webp';
  const removed = [];
  const { options } = fixture({
    update: async path => {
      if (active !== 'uid/avatar.webp') return false;
      active = path;
      return true;
    },
    remove: async path => { removed.push(path); },
  });
  const results = await Promise.allSettled([replaceAvatar(options), replaceAvatar(options)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(removed.includes(active), false);
  assert.equal(removed.length, 2);
});

function recoveryFixture() {
  let active = 'uid/avatar.webp';
  let loseResponse = false;
  let failReads = false;
  const removed = [];
  const compared = [];
  const uploaded = [];
  const reconciled = [];
  const options = {
    userId: 'uid', blob: new Blob(['unchanged crop draft']),
    readCurrent: async () => {
      if (failReads) throw Error('read failed');
      return { path: active, updatedAt: null };
    },
    onReconciled: current => reconciled.push(current.path),
    upload: async (path, blob) => {
      assert.equal(blob, options.blob);
      uploaded.push(path);
    },
    update: async (path, previousPath) => {
      compared.push(previousPath);
      if (active !== previousPath) return false;
      active = path;
      if (loseResponse) {
        loseResponse = false;
        throw Error('lost response');
      }
      return true;
    },
    remove: async path => {
      assert.notEqual(path, active, 'never delete active source');
      removed.push(path);
    },
  };
  return {
    options, removed, compared, uploaded, reconciled,
    active: () => active,
    loseResponse: () => { loseResponse = true; },
    failReads: value => { failReads = value; },
  };
}

test('reconciles concurrent loser and its explicit retry uses winning pointer', async () => {
  const f = recoveryFixture();
  const results = await Promise.allSettled([
    replaceAvatarWithRecovery(f.options), replaceAvatarWithRecovery(f.options),
  ]);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
  const winner = f.active();
  assert.equal(f.reconciled.at(-1), winner);
  assert.equal(f.removed.includes(winner), false);
  const retried = await replaceAvatarWithRecovery(f.options);
  assert.equal(f.compared.at(-1), winner);
  assert.equal(f.active(), retried);
  assert.ok(f.removed.includes(winner));
});

test('committed update with lost response reconciles without deleting active upload; retry succeeds', async () => {
  const f = recoveryFixture();
  f.loseResponse();
  await assert.rejects(replaceAvatarWithRecovery(f.options), /lost response/);
  const committed = f.active();
  assert.equal(f.reconciled.at(-1), committed);
  assert.deepEqual(f.removed, []);
  const retried = await replaceAvatarWithRecovery(f.options);
  assert.equal(f.compared.at(-1), committed);
  assert.equal(f.active(), retried);
  assert.deepEqual(f.removed, [committed]);
});

test('failed reconciliation cannot allow a stale retry or delete an ambiguous upload', async () => {
  const f = recoveryFixture();
  const update = f.options.update;
  f.options.update = async (...args) => {
    try { return await update(...args); }
    finally { f.failReads(true); }
  };
  f.loseResponse();
  await assert.rejects(replaceAvatarWithRecovery(f.options), /lost response/);
  await assert.rejects(replaceAvatarWithRecovery(f.options), /read failed/);
  assert.equal(f.uploaded.length, 1);
  assert.deepEqual(f.removed, []);
  const committed = f.active();
  f.failReads(false);
  f.options.update = update;
  await replaceAvatarWithRecovery(f.options);
  assert.equal(f.compared.at(-1), committed);
});
