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
