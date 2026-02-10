# Pagamentos

**Status Atual**
- `PAYMENT_UI_ENABLED = false` mostra "Em desenvolvimento!" na aba Planos & Pagamentos.
- `ONLINE_STATUS_REQUIRES_PAYMENT = false` libera Online/Offline sem pagamento.

**Como Voltar ao Comportamento Original**
1. Em `components/ModelDashboard.tsx`, troque `PAYMENT_UI_ENABLED` para `true`.
2. Em `components/ModelDashboard.tsx`, troque `ONLINE_STATUS_REQUIRES_PAYMENT` para `true`.

**Ajustes Futuros no Banco**
- O status premium e calculado por `billing.expiresAt` (string ISO). Precisa ser atualizado quando o pagamento for confirmado.
- O historico fica em `payments` com `status: 'paid' | 'pending' | 'failed'`, `amount`, `currency`, `planId`, `paidAt/createdAt`.
- Endpoint pronto: `POST /api/models/:id/payments` atualiza `billing` e adiciona um item em `payments` (renova +30 dias).
- Em producao, integre o gateway para chamar o endpoint acima no webhook de pagamento aprovado ou replique essa mesma logica no banco.

**Porque nao aparece na grade/home e no mapa (causa original)**
- A API `/api/models` filtra perfis sem pagamento ativo por padrao (so retorna se `includeUnpaid=true`).
- Alguns endpoints usam `online=true`, entao perfis criados com `isOnline: false` ficam ocultos ate ativar Online.
- No cadastro, o backend cria o perfil com `isOnline: false` por padrao (`server/index.js`).

**Como liberar agora (sem pagamento)**
- Definir `isOnline: true` na criacao do perfil (no POST de cadastro) ou
- Usar a listagem sem filtro (`GET /api/models`) para a home/mapa, ou
- Forcar um PATCH apos cadastro para `isOnline: true` (opcionalmente com `onlineUntil`).

**Solucao aplicada**
- O front agora chama a API com `includeUnpaid=true` em todas as listagens principais.
- Controle em `services/models.ts` com `INCLUDE_UNPAID_MODELS = true`.
- Para voltar a bloquear quem nao pagou, troque `INCLUDE_UNPAID_MODELS` para `false`.
