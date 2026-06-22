import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth';
import { logActivity } from '$lib/server/activity';

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		const token = cookies.get(SESSION_COOKIE);
		await deleteSession(token);
		cookies.delete(SESSION_COOKIE, { path: '/' });
		if (locals.user) {
			await logActivity(locals.user.email, 'Signed out', '');
		}
		redirect(303, '/login');
	}
};
