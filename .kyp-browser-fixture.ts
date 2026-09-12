import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prismaUnscoped as db } from './app/lib/db';
import { withPlatformBypass } from './app/lib/tenant-context';
async function main() {
await withPlatformBypass(async () => {
const user = await db.user.create({ data: { email: 'kyp-browser@example.test', passwordHash: await bcrypt.hash('Local-Demo-Only-2026!', 10), role: 'manager', emailVerified: true, profile: {create: {fullName: 'Demo Pharmacy Owner'}} } });
const pharmacy = await db.pharmacy.create({data: {slug: 'kyp-browser-demo', name: 'Demo Community Pharmacy', ownerUserId: user.id, status: 'draft', email: user.email, memberships: {create: {userId: user.id, role: 'owner', status: 'active'}}, settings: {create: {displayName: 'Demo Community Pharmacy'}}}});
await db.session.create({data: {userId:user.id, tokenHash:createHash('sha256').update('local-kyp-browser-session').digest('hex'), expiresAt:new Date(Date.now()+3600000)}});
console.log('Created isolated demo pharmacy: '+pharmacy.id);
});
process.exit(0);
} main();
