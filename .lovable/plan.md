## Objetivo

Limpar do painel de segurança as ~155 findings repetidas do tipo `authenticated_security_definer_function_executable` — todas referentes a funções RPC da aplicação (`admin_*`, `place_football_bet`, `_compute_*`, etc.) que já fazem checagem interna de autorização (`assert_admin_mfa`, `has_role`, etc.).

A decisão de aceitar esse risco já foi tomada e registrada na security memory na rodada anterior; falta apenas aplicar o `ignore` em cada finding individual.

## Passos

1. Parsear o arquivo colado e extrair o `cache_key` (internal_id) de cada uma das ~155 linhas.
2. Chamar `security--manage_security_finding` em lote (uma única call com array `operations`) com:
   - `operation: "ignore"`
   - `scanner_name: "authenticated_security_definer_function_executable"`
   - `internal_id`: cada cache_key extraído
   - `explanation`: "RPC da aplicação com checagem interna de autorização (assert_admin_mfa / has_role). Risco aceito — ver security memory."
3. Confirmar via `security--get_scan_results` que o contador caiu.

## Não faz parte

- Nenhuma alteração de schema, função ou código frontend.
- Nenhum revoke de EXECUTE — a postura "aceitar e ignorar" continua valendo.
- Security memory já está atualizada; não será reescrita.
