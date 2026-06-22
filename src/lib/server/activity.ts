import { getDb } from './db';

export type ActivityEntry = {
	id: string;
	user: string;
	action: string;
	detail: string;
	at: Date;
};

export async function logActivity(user: string, action: string, detail = ''): Promise<void> {
	try {
		const db = await getDb();
		await db.collection('activity').insertOne({ user, action, detail, at: new Date() });
	} catch {
		// Never let activity logging break the request it is recording.
	}
}

export async function listActivity(limit = 200): Promise<ActivityEntry[]> {
	const db = await getDb();
	const rows = await db.collection('activity').find({}).sort({ at: -1 }).limit(limit).toArray();
	return rows.map((row) => ({
		id: row._id.toString(),
		user: typeof row.user === 'string' ? row.user : '',
		action: typeof row.action === 'string' ? row.action : '',
		detail: typeof row.detail === 'string' ? row.detail : '',
		at: row.at instanceof Date ? row.at : new Date(row.at)
	}));
}

export async function clearActivity(): Promise<void> {
	const db = await getDb();
	await db.collection('activity').deleteMany({});
}
