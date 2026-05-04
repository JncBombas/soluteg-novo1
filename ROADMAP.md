# Roadmap Soluteg — Checklist de Execução

**Período total estimado:** 8 a 12 semanas
**Dedicação:** ~3h/dia
**Princípio:** uma fase por vez. Não pula. Não mistura.

**Última atualização:** 04/05/2026

---

## 🚨 FASE 1 — ALARMES FUNCIONANDO

**Estimativa:** 1 a 2 semanas
**Critério de saída:** alarme dispara de forma confiável em ambiente real, sem falsos positivos nem falsos negativos.

### Diagnóstico
- [x] Auditar logs do sistema atual: onde o alarme falha?
- [x] Identificar se o problema é detecção (sensor → backend) ou notificação (backend → cliente/admin)
- [x] Documentar todos os tipos de alarme existentes hoje
- [x] Listar bugs específicos encontrados

### Regras de negócio (definir antes de codar)
- [x] Definir tipos de alerta: aviso (WhatsApp para admin), crítico (OS automática), emergência (OS + técnico direcionado)
- [x] Definir thresholds: porcentagem de nível, tempo de inatividade do sensor, etc
- [x] Definir destinatários: quem recebe cada tipo (cliente, admin, técnico)
- [x] Definir cooldown: tempo mínimo entre dois alarmes do mesmo sensor
- [x] Documentar tudo num arquivo `ALARMS.md` no repositório

### Implementação
- [x] Refatorar lógica de detecção no backend
- [x] Implementar fila de notificações com retry
- [x] Adicionar fallback: se WhatsApp falhar 3x, enviar email
- [x] Implementar lógica de OS automática (regras claras de quando criar)
- [ ] Implementar direcionamento automático ao técnico
- [x] Adicionar logs detalhados de cada disparo

### Validação
- [ ] Teste em laboratório: simular nível baixo, sensor offline, sensor com dado errado
- [ ] Validar que mensagens chegam no WhatsApp do admin e cliente
- [ ] Validar que OS é criada corretamente
- [ ] Validar que técnico é notificado
- [ ] Rodar 48h em ambiente real sem falhas

**Status da fase:** [ ] Não iniciada [x] Em andamento [ ] Concluída em ___/___/___

---

## 🔧 FASE 2 — HARDWARE DEFINIDO

**Estimativa:** 2 a 4 semanas
**Critério de saída:** kit replicável que JNC compra, monta e instala sem você presente.

### Definição de hardware
- [ ] Definir modelo final do ESP32 (revisão e fornecedor)
- [ ] Definir sensor de nível: qual modelo, qual range, qual precisão
- [ ] Definir fonte de alimentação: bateria? PoE? 220V com fonte chaveada?
- [ ] Definir conectividade: WiFi do condomínio? 4G? LoRa?
- [ ] Definir gabinete: IP65? Como prender na caixa?
- [ ] Listar BOM (Bill of Materials) completa com fornecedores

### Custos e logística
- [ ] Calcular custo unitário do kit (peças + montagem + margem)
- [ ] Definir preço de venda da instalação
- [ ] Definir preço da mensalidade
- [ ] Identificar fornecedores brasileiros confiáveis para reposição
- [ ] Comprar lote inicial de peças (3 a 5 kits)

### Processo de instalação
- [ ] Documentar passo a passo de montagem do kit
- [ ] Documentar passo a passo de instalação no condomínio
- [ ] Listar ferramentas necessárias
- [ ] Estimar tempo de instalação por unidade
- [ ] Criar checklist de instalação para o técnico
- [ ] Criar formulário de comissionamento (vincular sensor a condomínio no sistema)

### Validação
- [ ] Montar 3 kits seguindo a documentação
- [ ] Instalar 1 kit num condomínio piloto (cliente real, pagando)
- [ ] Operar por 30 dias coletando feedback
- [ ] Ajustar documentação baseado nos problemas reais

**Status da fase:** [ ] Não iniciada [ ] Em andamento [ ] Concluída em ___/___/___

---

## 📱 FASE 3 — PORTAL TÉCNICO OFFLINE (PWA)

**Estimativa:** 3 a 5 semanas
**Critério de saída:** técnico no subsolo conclui OS completa offline e sincroniza ao sair.

### Preparação
- [ ] Estudar arquitetura PWA: Service Worker + IndexedDB
- [ ] Definir o que precisa funcionar offline: visualizar OS, preencher checklist, fotos, assinaturas
- [ ] Definir o que NÃO funciona offline: criar nova OS, alterações de admin
- [ ] Mapear todas as mutations tRPC do portal técnico

### Implementação base
- [ ] Configurar Vite PWA plugin no projeto Soluteg
- [ ] Criar manifest.json com ícones, nome, cores
- [ ] Configurar Service Worker para cache de assets
- [ ] Implementar IndexedDB para dados das OS
- [ ] Implementar download proativo: ao entrar no portal, baixar OS atribuídas

### Lógica offline
- [ ] Detectar status online/offline com listener nativo
- [ ] Indicador visual claro (banner topo: "Offline — sincronizando ao voltar")
- [ ] Fila de mutations pendentes no IndexedDB
- [ ] Lógica de sincronização ao voltar online
- [ ] Tratamento de conflitos (admin alterou OS enquanto técnico estava offline)

### Upload de mídia offline
- [ ] Salvar fotos no IndexedDB (base64 ou Blob)
- [ ] Upload assíncrono ao Cloudinary quando voltar online
- [ ] Indicador de progresso de upload
- [ ] Retry automático em caso de falha

### Push notifications
- [ ] Configurar VAPID keys
- [ ] Backend envia push quando admin atribui nova OS
- [ ] Notificação aparece mesmo com app fechado
- [ ] Click na notificação abre a OS no portal

### Validação
- [ ] Teste em campo: técnico vai num subsolo real
- [ ] Faz OS completa offline (checklist + fotos + assinatura)
- [ ] Sai do prédio, valida sincronização automática
- [ ] Validar que admin vê tudo correto após sync

### Bonus (se sobrar tempo na Fase 3)
- [ ] Reorganizar portal técnico em abas: OS / Orçamentos / Laudos
- [ ] Adicionar sessões dentro de cada aba: aberta / em andamento / concluída

**Status da fase:** [ ] Não iniciada [ ] Em andamento [ ] Concluída em ___/___/___

---

## 🚀 FASE 4 — VALIDAÇÃO COMERCIAL

**Estimativa:** 4 a 8 semanas (sobrepõe parcialmente com Fase 3)
**Critério de saída:** 3 a 5 condomínios pagando mensalidade, com 30+ dias de uso real sem você apagando incêndio.

### Piloto comercial
- [ ] Selecionar 3 a 5 condomínios da carteira JNC para piloto pago
- [ ] Apresentar proposta com preço definido (instalação + mensalidade)
- [ ] Fechar contrato simples (1 lauda) com cada um
- [ ] Instalar com a documentação da Fase 2
- [ ] Configurar usuários, perfis, alertas

### Operação
- [ ] Acompanhar primeiros 7 dias de cada instalação de perto
- [ ] Documentar todos os problemas que aparecerem
- [ ] Coletar feedback semanal dos síndicos
- [ ] Coletar feedback dos técnicos JNC

### Métricas a acompanhar
- [ ] Tempo médio de resposta a alertas
- [ ] Quantidade de OS abertas automaticamente
- [ ] Quantidade de chamadas evitadas (estimativa)
- [ ] NPS do síndico no fim de 30 dias

**Status da fase:** [ ] Não iniciada [ ] Em andamento [ ] Concluída em ___/___/___

---

## 📢 FASE 5 — LANDING SOLUTEG

**Estimativa:** 1 a 2 semanas
**Critério de entrada:** Fase 4 concluída, com pelo menos 3 cases reais.
**Critério de saída:** site no ar com depoimentos reais e preços definidos.

- [ ] Coletar depoimentos reais dos síndicos do piloto (com foto, nome, condomínio)
- [ ] Compilar números reais (X% de redução de chamados, Y litros economizados)
- [ ] Definir tabela de preços final
- [ ] Executar os prompts da landing soluteg.com.br
- [ ] Deploy no VPS (mesmo fluxo do jnc.soluteg.com.br)
- [ ] Configurar Google Analytics + Search Console
- [ ] Submeter sitemap

**Status da fase:** [ ] Não iniciada [ ] Em andamento [ ] Concluída em ___/___/___

---

## ❌ EXPLICITAMENTE FORA DESTE ROADMAP

Adiados deliberadamente para não desviar foco:

- ❌ App mobile nativo (PWA cobre 90% do uso)
- ❌ Integração Claude/IA no sistema (hype, não resolve problema real)
- ❌ Integração PDV/OS (não bloqueia venda)
- ❌ Calendário do técnico (manual resolve enquanto for poucos técnicos)
- ❌ Animação de abertura no portal cliente (acabamento estético)
- ❌ UI/UX ultra-moderna do portal cliente (Fase 4 vai dizer se importa)
- ❌ Ajustes finais da landing JNC (já está no ar, suficiente por enquanto)

**Regra:** se sentir vontade de mexer em algo dessa lista, escreve numa nota e volta para a fase atual. Esses itens só voltam à mesa depois da Fase 5.

---

## 📊 INDICADOR GERAL DE PROGRESSO

[x] Fase 1 — Alarmes              15/16 itens de implementação/diagnóstico/regras ✅ (falta: direcionar técnico + validação em campo)
[ ] Fase 2 — Hardware             0/19 itens
[ ] Fase 3 — PWA Offline          0/27 itens
[ ] Fase 4 — Validação comercial  0/13 itens
[ ] Fase 5 — Landing Soluteg      0/7 itens

---

## 📝 LOG DE PROGRESSO

### Sessão 04/05/2026
- Diagnóstico completo: WhatsApp falhava silenciosamente (alerta perdido para sempre quando !isReady)
- Definidas regras de negócio por tipo de caixa (superior/inferior) para alarm1, alarm2, SCI e alarm3_boia
- Mensagens contextuais por tipo: alarm1 superior orienta verificar cisterna/painel; alarm1 inferior orienta verificar entrada de água
- alarm2 cria OS emergencial automaticamente + notifica admin e cliente
- Implementada fila de retry: alertas com delivered=0 são reenviados ao WhatsApp reconectar
- Fallback email via nodemailer quando WhatsApp falha
- alarm3_boia toggle por sensor (habilitável/desabilitável na UI)
- Fix: listSensorsWithStatus não retornava alarm3BoiaPct, tankType, distVazia, distCheia (formulário de edição sempre em branco)
- Fix crítico: multer (upload) nunca foi instanciado em index.ts — causava crash no boot do servidor
- Migration 0039 criada (rodar no VPS)
