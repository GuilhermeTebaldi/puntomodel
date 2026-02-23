# Opções de envio automático de token (avaliação)

Data: 17/02/2026

## Objetivo
Automatizar o envio do token de recuperação por WhatsApp e/ou e-mail sem remover o fluxo atual que já funciona.

## Dá para automatizar sem apagar nada?
Sim. A estratégia correta é aditiva:
1. Manter o fluxo atual de recuperação e a aba `Recuperação` no admin.
2. Ao criar a solicitação, tentar envio automático.
3. Se falhar, manter o pedido no admin para envio manual (fallback).
4. Preservar os botões e ações atuais (`Abrir WhatsApp`, `Copiar mensagem`, `Token enviado`, `Marcar resolvido`).

## Alternativas para WhatsApp

### Opção A: WhatsApp Cloud API (Meta) - recomendada
Como funciona:
1. Integrar backend com API oficial da Meta.
2. Enviar template aprovado com o token.
3. Receber status por webhook (enviado, entregue, falhou).

Vantagens:
1. Solução oficial e estável.
2. Escala bem.
3. Permite rastrear status de entrega.

Desvantagens:
1. Exige configuração de Business/Meta e templates aprovados.
2. Custo por conversa/mensagem.

Nível de esforço:
Médio.

### Opção B: Provedor intermediário (Twilio, Zenvia, Gupshup, etc.)
Como funciona:
1. Integra com API do provedor.
2. Provedor faz ponte com WhatsApp oficial.

Vantagens:
1. Onboarding geralmente mais simples.
2. Melhor suporte operacional no início.

Desvantagens:
1. Custo normalmente maior (camada extra).
2. Dependência de fornecedor externo adicional.

Nível de esforço:
Baixo a médio.

### Opção C: Automação não oficial via WhatsApp Web - não recomendada
Vantagens:
1. Implementação inicial aparentemente rápida.

Riscos:
1. Alto risco de bloqueio de número.
2. Instável para produção.
3. Sem garantia de disponibilidade e compliance.

Nível de esforço:
Baixo no começo, alto de manutenção/risco depois.

## Alternativas para e-mail

### Opção A: Serviço transacional (Resend, Postmark, SendGrid, Mailgun, SES)
Como funciona:
1. Backend envia e-mail com token via API/SMTP.
2. Registrar status de envio (aceito/falha).

Vantagens:
1. Implementação rápida.
2. Custo baixo em volume inicial.
3. Excelente para fallback de WhatsApp.

Desvantagens:
1. Pode cair em spam sem domínio bem configurado.
2. Usuário pode demorar para abrir e-mail.

Nível de esforço:
Baixo.

### Opção B: SMTP próprio simples
Vantagens:
1. Controle total.

Desvantagens:
1. Maior chance de problemas de entrega/reputação.
2. Mais manutenção operacional.

Nível de esforço:
Médio.

## Recomendação prática (sem quebrar nada)
Ordem sugerida:
1. Ativar envio automático por e-mail primeiro.
2. Manter fallback manual no admin.
3. Depois ativar WhatsApp oficial (Cloud API ou provedor).
4. Trabalhar com envio multicanal:
   - primeiro WhatsApp;
   - se falhar, enviar e-mail;
   - se ambos falharem, manter para envio manual.

## Segurança (importante)
Hoje o token de 3 dígitos funciona para operação manual, mas para automação o ideal é reforçar:
1. Token com mais dígitos (ex.: 6).
2. Expiração curta (ex.: 10 a 15 minutos).
3. Limite de tentativas de validação.
4. Bloqueio temporário após tentativas inválidas.
5. Auditoria de envio e de validação.

## O que muda no sistema (somente quando for implementar)
Mudanças aditivas, sem remover funcionalidades existentes:
1. Camada de `delivery service` (WhatsApp/e-mail).
2. Registro de tentativas/status de envio.
3. Webhook de status de entrega.
4. Flags de ativação por canal (`auto_whatsapp`, `auto_email`) para rollout seguro.
5. Fallback automático para fluxo manual já existente.

## Conclusão
É totalmente viável automatizar sem apagar o que já existe.
A melhor rota de baixo risco é:
1. E-mail automático primeiro.
2. WhatsApp oficial em seguida.
3. Manter sempre fallback manual no admin para garantir operação contínua.
