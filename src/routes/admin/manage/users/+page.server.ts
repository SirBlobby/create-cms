import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	listUsers,
	createUser,
	deleteUser,
	transferOwner,
	getOwnerId,
	getUser
} from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}
	const ownerId = await getOwnerId();
	return {
		users: await listUsers(),
		currentUserId: locals.user.id,
		isOwner: locals.user.id === ownerId
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(303, '/login');
		}
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		if (!email || password.length < 8) {
			return fail(400, { error: 'Enter an email and a password of at least 8 characters' });
		}
		try {
			await createUser(email, password);
		} catch (createError) {
			return fail(400, { error: (createError as Error).message });
		}
		await logActivity(locals.user.email, 'Added user', email);
		return { success: true };
	},
	delete: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(303, '/login');
		}
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		if (!id || id === locals.user.id) {
			return { success: true };
		}
		const target = await getUser(id);
		try {
			await deleteUser(id);
		} catch (deleteError) {
			return fail(400, { error: (deleteError as Error).message });
		}
		await logActivity(locals.user.email, 'Removed user', target?.email ?? id);
		return { success: true };
	},
	transfer: async ({ request, locals }) => {
		if (!locals.user) {
			redirect(303, '/login');
		}
		const ownerId = await getOwnerId();
		if (locals.user.id !== ownerId) {
			return fail(403, { error: 'Only the owner can transfer ownership' });
		}
		const formData = await request.formData();
		const id = String(formData.get('id') ?? '');
		if (!id) {
			return fail(400, { error: 'Select a user to make owner' });
		}
		const target = await getUser(id);
		try {
			await transferOwner(id);
		} catch (transferError) {
			return fail(400, { error: (transferError as Error).message });
		}
		await logActivity(locals.user.email, 'Transferred ownership', target?.email ?? id);
		return { success: true };
	}
};
