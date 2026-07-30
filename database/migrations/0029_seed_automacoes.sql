-- ==========================================================================
-- DNA CRM — Sprint 13: Seed de automações padrão
-- migration 0029 — depende de 0027
-- ==========================================================================

-- ══════════════════════════════════════════════════════════════════════
-- Automações padrão para CRM imobiliário DNA
-- Todes INATIVAS por padrão — ative via dashboard.
-- ══════════════════════════════════════════════════════════════════════

insert into automacoes (nome, descricao, status, prioridade, evento, condicoes, acoes) values
(
  'Alerta de cliente parado há 7 dias',
  'Quando um cliente chega à etapa ANÁLISE e o corretor não registra atividade, cria alerta após 7 dias.',
  'INATIVA',
  3,
  'cliente_editado',
  '[]'::jsonb,
  '[{"acao":"criar_alerta","params":{"titulo":"Cliente sem movimento","mensagem":"Cliente sem contato há 7 dias.","urgencia":"MEDIA"}}]'::jsonb
);
insert into automacoes (nome, descricao, status, prioridade, evento, condicoes, acoes) values
  ('Nova análise de cadastro — notificar gestor',
   'Quando um cliente é movido para a etapa de ANÁLISE, cria alerta para o gestor e atualiza próxima ação.',
   'INATIVA',
   1,
   'mudanca_etapa',
   '[]'::jsonb,
   '[
     {"acao":"criar_alerta","params":{"titulo":"Cliente em análise","mensagem":"Cliente foi movido para etapa de ANÁLISE.","urgencia":"ALTA"}},
     {"acao":"atualizar_proxima_acao","params":{"acao":"Revisar documentação","prazo_em":"2027-01-01T00:00:00Z"}}
   ]'::jsonb
);
insert into automacoes (nome, descricao, status, prioridade, evento, condicoes, acoes) values
(
  'Documento rejeitado — tarefa de correção',
  'Quando um documento é rejeitado, cria tarefa para o corretor solicitar correção ao cliente.',
  'INATIVA',
  2,
  'documento_rejeitado',
  '[]'::jsonb,
  '[
     {"acao":"criar_tarefa","params":{"titulo":"Solicitar correção de documento","descricao":"Documento foi rejeitado. Solicite documento corrigido ao cliente.","prioridade":"ALTA"}},
     {"acao":"atualizar_timeline","params":{"observacao":"Documento rejeitado — tarefa de correção criada pelo motor de automações"}}
   ]'::jsonb
);
insert into automacoes (nome, descricao, status, prioridade, evento, condicoes, acoes) values
(
  'Agendamento confirmado — preparar material',
  'Quando um agendamento é confirmado, cria tarefa de preparação de material para o corretor.',
  'INATIVA',
  1,
  'agendamento_confirmado',
  '[]'::jsonb,
  '[
     {"acao":"criar_tarefa","params":{"titulo":"Preparar material do empreendimento","descricao":"Agendamento confirmado. Prepare pasta de apresentação e ficha do empreendimento."}},
     {"acao":"atualizar_operacao","params":{}}
   ]'::jsonb
);
insert into automacoes (nome, descricao, status, prioridade, evento, condicoes, acoes) values
(
  'Venda registrada — atualizar dashboard',
  'Quando uma venda é registrada, força revalidação do dashboard de gestão e cria tarefa pós-venda.',
  'INATIVA',
  2,
  'venda',
  '[]'::jsonb,
  '[
     {"acao":"criar_tarefa","params":{"titulo":"Pós-venda iniciado","descricao":"Acompanhamento pós-venda iniciado automaticamente. Verificar checklist."}},
     {"acao":"atualizar_dashboard","params":{}},
     {"acao":"atualizar_kpis","params":{}}
   ]'::jsonb
);
insert into automacoes (nome, descricao, status, prioridade, evento, condicoes, acoes) values
(
  'Comparecimento registrado — follow-up',
  'Após cada comparecimento, cria tarefa de follow-up em 24h e registra na timeline.',
  'INATIVA',
  2,
  'comparecimento',
  '[]'::jsonb,
  '[
     {"acao":"criar_tarefa","params":{"titulo":"Follow-up pós-comparecimento","descricao":"Entrar em contato com o cliente para feedback da visita."}},
     {"acao":"registrar_auditoria","params":{"acao":"ATUALIZACAO","observacao":"Follow-up agendado via motor de automações"}}
   ]'::jsonb
);