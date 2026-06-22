import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { listActivity, clearActivity, logActivity } from '$lib/server/activity';
import { getOwnerId } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/login');
	}
	const ownerId = await getOwnerId();
	return { entries: await listActivity(), isOwner: locals.user.id === ownerId };
};

export const actions: Actions = {
	clear: async ({ locals }) => {
		if (!locals.user) {
			redirect(303, '/login');
		}
		const ownerId = await getOwnerId();
		if (locals.user.id !== ownerId) {
			return fail(403, { error: 'Only the owner can clear the activity log' });
		}
		await clearActivity();
		await logActivity(locals.user.email, 'Cleared activity log', '');
		return { success: true };
	}
};
