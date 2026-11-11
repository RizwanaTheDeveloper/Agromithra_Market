// One-off: moves media bytes that are still inside the database onto disk. Safe to run repeatedly.
const { PrismaClient } = require('@prisma/client');
const { mkdir, writeFile } = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { dirname, join, resolve } = require('node:path');
require('dotenv').config?.();
const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/3gpp': '.3gp', 'video/webm': '.webm' };
(async () => {
  const db = new PrismaClient(), root = resolve(process.env.UPLOAD_DIR || 'uploads');
  const rows = await db.listingMedia.findMany({ where: { path: null, data: { not: null } } });
  for (const row of rows) {
    const relative = join(row.listingId, randomUUID() + (ext[row.mime] || ''));
    await mkdir(dirname(resolve(root, relative)), { recursive: true });
    await writeFile(resolve(root, relative), row.data);
    await db.listingMedia.update({ where: { id: row.id }, data: { path: relative, data: null } });
    console.log('moved', row.name, '->', resolve(root, relative));
  }
  console.log(rows.length + ' file(s) moved to ' + root);
  await db.$disconnect();
})();
