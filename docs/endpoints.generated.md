# Endpoints (generated)

Fonte: `server/index.js`

- GET /api/health -> server/index.js:187 -> handler inline -> payload: nenhum
- POST /api/auth/register -> server/index.js:192 -> handler inline -> body: { name, email, password, role: 'client' | 'model' }
- POST /api/auth/login -> server/index.js:225 -> handler inline -> body: { email, password }
- GET /api/models -> server/index.js:256 -> handler inline -> query: featured=true, online=true, city, email, includeUnpaid=true
- GET /api/models/:id -> server/index.js:287 -> handler inline -> params: { id }
- GET /api/admin/users -> server/index.js:296 -> handler inline -> payload: nenhum
- GET /api/admin/models -> server/index.js:301 -> handler inline -> payload: nenhum
- POST /api/models -> server/index.js:306 -> handler inline -> body: { name*, email*, age?, phone?, bio?, services?, prices?, attributes?, location?, map?, photos?, featured?, isOnline?, currency?, onlineUntil?, stats?, comments?, commentIps?, ratingIps?, notifications?, billing?, payments? }
- PATCH /api/models/:id -> server/index.js:376 -> handler inline -> params: { id } -> body: { name?, age?, phone?, bio?, services?, prices?, attributes?, location?, map?, photos?, featured?, isOnline?, currency?, onlineUntil?, stats?, comments?, commentIps?, ratingIps?, notifications?, billing?, payments? }
- POST /api/models/:id/payments -> server/index.js:414 -> handler inline -> params: { id } -> body: { amount*, currency*, method: 'pix' | 'card', planId?, paidByUserId?, paidByEmail? }
- POST /api/models/:id/events -> server/index.js:470 -> handler inline -> params: { id } -> body: { type: 'view' | 'whatsapp' }
- POST /api/models/:id/rate -> server/index.js:494 -> handler inline -> params: { id } -> body: { value (1-5) }
- GET /api/models/:id/metrics -> server/index.js:530 -> handler inline -> params: { id }
- GET /api/models/:id/comments -> server/index.js:557 -> handler inline -> params: { id }
- POST /api/models/:id/comments -> server/index.js:567 -> handler inline -> params: { id } -> body: { name, message }
- GET /api/models/:id/notifications -> server/index.js:613 -> handler inline -> params: { id }
- POST /api/models/:id/notifications/read-all -> server/index.js:624 -> handler inline -> params: { id }
- POST /api/admin/reset -> server/index.js:640 -> handler inline -> payload: nenhum (bloqueado em producao)
- GET /api/stats -> server/index.js:652 -> handler inline -> payload: nenhum
