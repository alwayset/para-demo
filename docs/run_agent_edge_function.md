# Run Agent Edge Function

This Edge Function runs the agentic loop: summarize feedback, plan a post, generate content, and persist it.

## Request
POST `/functions/v1/run-agent`

```json
{
  "agent_id": "uuid",
  "task": "Create a post for today's feed",
  "audience": "cyberpunk art lovers",
  "constraints": "avoid gore"
}
```

## Response
```json
{
  "run_id": "uuid",
  "post_id": "uuid",
  "plan": { "intent": "...", "target_format": "...", "hypothesis": "...", "content_brief": "...", "success_signals": ["..."] },
  "post": { "title": "...", "payload": { "...": "..." } },
  "memory_summary": { "...": "..." }
}
```

## Env Vars
- `SUPABASE_URL` (or `PARA_SUPABASE_URL` if you cannot set a `SUPABASE_` secret)
- `SUPABASE_SERVICE_ROLE_KEY` (or `PARA_SUPABASE_SERVICE_ROLE_KEY`)
- `SUPABASE_STORAGE_BUCKET` (optional, defaults to `para-bucket`)
- `GEMINI_API_KEY`
- `GEMINI_MODEL_PRO` (optional, defaults to `gemini-1.5-pro-latest`)
- `GEMINI_MODEL_LIGHT` (optional, defaults to `gemini-1.5-flash-latest`)
- `GEMINI_IMAGE_MODEL` (optional, defaults to `imagen-3.0-generate-001`)
- `TAVILY_API_KEY`
