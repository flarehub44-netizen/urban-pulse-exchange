# O que falta para o Stream ficar 100% funcional

Hoje o pipeline está **~70% pronto**: o front (`CameraPlayer` + `live-camera-strip`), o schema (`cameras`, `camera_metrics`, RPCs `list_live_cameras` / `ingest_camera_metrics`), o worker Python (`services/vision-worker`) e o admin de fontes já existem. As 3 câmeras demo (`paulista`, `marginal`, `pinheiros`) estão `online` no banco apontando para o HLS de teste do Mux.

O que **falta** para sair do "playback demo" e chegar em "pipeline real, ao vivo, com oráculo por câmera":

## 1. Rodar o vision-worker em produção (bloqueio principal)
Hoje todas as câmeras estão com `detection_ok = false` — ninguém está chamando `ingest_camera_metrics`. Sem worker rodando, o Oráculo por câmera nunca pode ser ligado.

Opções (escolher uma):
- **VPS + Docker** (recomendado): `infra/stream-stack/docker-compose.yml` já pronto. Falta provisionar host, preencher `.env` com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` e subir.
- **GitHub Actions agendado**: hoje o workflow `vision-worker.yml` é `workflow_dispatch` (manual) e roda 1 ciclo. Precisa virar `schedule: cron` a cada 1–5 min e os secrets `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` precisam ser cadastrados no repo.
- **Lovable serverless**: não cabe (precisa de ffmpeg + processo longo).

## 2. Substituir as URLs demo por câmeras reais
As 3 câmeras hoje apontam para `test-streams.mux.dev` (vídeo genérico do Mux, sem trânsito). Para o contador de veículos fazer sentido:
- Conseguir HLS HTTPS público de Paulista / Marginal / Pinheiros (ex.: CET-SP, prefeitura, parceiros), **ou**
- Subir o **MediaMTX** (`infra/mediamtx/`) numa VPS, ingerir RTSP das câmeras reais e expor HLS em `https://stream.seudominio.com/...` (fase 2 já documentada em `docs/CAMERA_STREAMING.md`).

Sem isso, o `LineCrossCounter` vai produzir contagens sem relação com tráfego real.

## 3. Ligar o Oráculo por câmera
Depois que o worker estiver estável e `detection_ok = true` por ~10 min:
- Admin → Sistema → **Oráculo por câmera = ON**
- Desligar o **Simulador de regiões** (senão duas fontes brigam pelo `regions.flow`)
- Mercados `*-live` passam a usar `data_source = camera` (migration `20260605000001` já existe)

## 4. Monitoramento e saúde do stream
Faltam sinais operacionais hoje:
- Coluna/heartbeat `last_seen_at` por câmera (o worker já faz upsert via RPC, mas a UI não mostra "há quanto tempo a última métrica chegou")
- Badge amarelo/vermelho no admin quando worker está parado > N min
- Alerta (toast/notification) quando uma câmera cai de `online` para `offline`

## 5. Conformidade e UX final
- **Aviso de LGPD** visível no `CameraPlayer` em produção ("imagem pública, sem identificação de pessoas/placas")
- Confirmar que nenhuma URL `rtsp://` ou `http://` (não-HTTPS) entra no banco — `is_allowed_stream_url` já existe mas precisa ser plugada como CHECK/trigger no `cameras.stream_url` para garantir
- Testar fallback "Sem sinal ao vivo" em mobile (Safari iOS exige `playsInline` no `<video>` — vale conferir no `CameraPlayer`)

## 6. Testes E2E em produção
- `e2e/camera-stream.spec.ts` já cobre o caminho feliz no preview, mas hoje só roda em `PLAYWRIGHT_BASE_URL=workers.dev` se setado manualmente. Falta adicionar um job no `ci.yml` que rode esse spec contra `viax.lovable.app` pós-deploy.
- Rodar `supabase/tests/camera_pipeline_acceptance.sql` no CI (hoje é manual).

---

## Ordem sugerida (caminho mais curto até "100%")
1. Cadastrar `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` como secrets no GitHub e mudar o workflow para `cron */2 * * * *` — isso já liga o pipeline com as câmeras demo (rápido, sem VPS).
2. Adicionar heartbeat (`last_seen_at`) + badge no admin para enxergar se o worker está vivo.
3. Trocar as 3 URLs demo por HLS reais (parceiro / MediaMTX).
4. Ligar Oráculo por câmera e desligar simulador.
5. Plugar trigger de validação de URL + aviso LGPD no player.
6. Adicionar job de E2E pós-deploy no CI.

## Decisões que preciso de você
- **Onde rodar o worker?** GitHub Actions cron (grátis, ~2 min de latência) ou VPS Docker (latência real, custo ~5 USD/mês)?
- **Fonte das câmeras reais?** Já tem URLs HLS públicas, ou vamos pelo caminho RTSP → MediaMTX?
- **Quer que eu já implemente o heartbeat + badge no admin** como primeiro passo enquanto você decide infra?
