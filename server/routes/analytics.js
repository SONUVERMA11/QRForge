/**
 * QRForge — Analytics Routes
 */
import { authGuard } from '../middleware/auth-guard.js';
import { getOrgAnalytics } from '../services/analytics-service.js';

export default async function analyticsRoutes(fastify) {
  fastify.get('/api/analytics', { preHandler: [authGuard] }, async (request) => {
    const { period = '30d' } = request.query;
    const analytics = await getOrgAnalytics(request.user.orgId, period);
    return { success: true, data: analytics };
  });
}
