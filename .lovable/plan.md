O erro ainda acontece porque o runtime onde o app está executando não tem `SUPABASE_SERVICE_ROLE_KEY` disponível. Eu confirmei isso nos logs publicados: há registros recentes de `SUPABASE_SERVICE_ROLE_KEY not configured in production`, e a lista de secrets do projeto mostra `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY`, mas não mostra `SUPABASE_SERVICE_ROLE_KEY`.

Plano de correção:

1. Adicionar o secret no ambiente do projeto
   - Criar `SUPABASE_SERVICE_ROLE_KEY` como secret de backend do projeto.
   - Usar a chave `service_role` do Supabase em `rzhffxiicufqcabmhscq`, não a chave anon/publishable.
   - Não colocar essa chave no frontend nem com prefixo `VITE_`.

2. Validar se o app publicado está lendo o secret certo
   - Após adicionar o secret, testar novamente a geração do Pix no domínio usado em produção.
   - Checar os logs publicados por `SUPABASE_SERVICE_ROLE_KEY` e `Supabase service role not configured`.

3. Se ainda falhar, ajustar fallback de compatibilidade
   - Revisar os pontos server-side que leem `SUPABASE_SERVICE_ROLE_KEY`.
   - Se necessário, aceitar também um nome alternativo seguro, por exemplo `SUPABASE_SERVICE_KEY`, para contornar restrições de nomes reservados em algum provedor, mantendo tudo server-side.

4. Melhorar o diagnóstico do erro
   - Trocar a mensagem genérica por uma mensagem operacional mais clara nos logs, indicando exatamente quais variáveis faltam no runtime publicado.
   - Manter a resposta para o usuário sem expor detalhes sensíveis.