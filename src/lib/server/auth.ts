import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { getDb } from './db';

export type SessionUser = { id: string; email: string };

const SESSION_DAYS = 7;
export const SESSION_COOKIE = 'cms_session';
export const OWNER_EMAIL = 'gmanjuna@gmu.edu';

export async function getOwnerId(): Promise<string | null> {
	const db = await getDb();
	const users = db.collection('users');
	const flagged = await users.findOne({ owner: true });
	if (flagged) return flagged._id.toString();
	const byEmail = await users.findOne({ email: OWNER_EMAIL });
	if (byEmail) {
		await users.updateOne({ _id: byEmail._id }, { $set: { owner: true } });
		return byEmail._id.toString();
	}
	return null;
}

function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const derived = scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
	const [salt, derived] = stored.split(':');
	if (!salt || !derived) return false;
	const expected = Buffer.from(derived, 'hex');
	const actual = scryptSync(password, salt, 64);
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function countUsers(): Promise<number> {
	const db = await getDb();
	return db.collection('users').countDocuments();
}

export async function listUsers() {
	const db = await getDb();
	const ownerId = await getOwnerId();
	const users = await db.collection('users').find({}).sort({ createdAt: 1 }).toArray();
	return users.map((user) => ({
		id: user._id.toString(),
		email: user.email,
		createdAt: user.createdAt,
		owner: user._id.toString() === ownerId
	}));
}

export async function createUser(email: string, password: string): Promise<string> {
	const db = await getDb();
	const users = db.collection('users');
	const existing = await users.findOne({ email });
	if (existing) {
		throw new Error('A user with that email already exists');
	}
	const result = await users.insertOne({
		email,
		passwordHash: hashPassword(password),
		createdAt: new Date()
	});
	return result.insertedId.toString();
}

export async function deleteUser(id: string): Promise<void> {
	const ownerId = await getOwnerId();
	if (id === ownerId) {
		throw new Error('The owner account cannot be removed');
	}
	const db = await getDb();
	await db.collection('users').deleteOne({ _id: new ObjectId(id) });
}

export async function transferOwner(toUserId: string): Promise<void> {
	const db = await getDb();
	const users = db.collection('users');
	const target = await users.findOne({ _id: new ObjectId(toUserId) });
	if (!target) {
		throw new Error('User not found');
	}
	await users.updateMany({ owner: true }, { $set: { owner: false } });
	await users.updateOne({ _id: new ObjectId(toUserId) }, { $set: { owner: true } });
}

export async function getUser(id: string) {
	const db = await getDb();
	const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
	if (!user) return null;
	return { id: user._id.toString(), email: user.email, createdAt: user.createdAt };
}

export async function updateEmail(id: string, email: string): Promise<void> {
	const db = await getDb();
	const users = db.collection('users');
	const existing = await users.findOne({ email });
	if (existing && existing._id.toString() !== id) {
		throw new Error('A user with that email already exists');
	}
	await users.updateOne({ _id: new ObjectId(id) }, { $set: { email } });
}

export async function changePassword(
	id: string,
	currentPassword: string,
	newPassword: string
): Promise<void> {
	const db = await getDb();
	const users = db.collection('users');
	const user = await users.findOne({ _id: new ObjectId(id) });
	if (!user) {
		throw new Error('User not found');
	}
	if (!verifyPassword(currentPassword, user.passwordHash)) {
		throw new Error('Current password is incorrect');
	}
	await users.updateOne({ _id: new ObjectId(id) }, { $set: { passwordHash: hashPassword(newPassword) } });
}

export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
	const db = await getDb();
	const user = await db.collection('users').findOne({ email });
	if (!user || !verifyPassword(password, user.passwordHash)) {
		return null;
	}
	return { id: user._id.toString(), email: user.email };
}

export async function createSession(userId: string) {
	const db = await getDb();
	const token = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
	await db.collection('sessions').insertOne({ token, userId, expiresAt });
	return { token, expiresAt };
}

export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
	if (!token) return null;
	const db = await getDb();
	const session = await db.collection('sessions').findOne({ token });
	if (!session) return null;
	if (session.expiresAt < new Date()) {
		await db.collection('sessions').deleteOne({ token });
		return null;
	}
	const user = await db.collection('users').findOne({ _id: new ObjectId(session.userId) });
	if (!user) return null;
	return { id: user._id.toString(), email: user.email };
}

export async function deleteSession(token: string | undefined): Promise<void> {
	if (!token) return;
	const db = await getDb();
	await db.collection('sessions').deleteOne({ token });
}
