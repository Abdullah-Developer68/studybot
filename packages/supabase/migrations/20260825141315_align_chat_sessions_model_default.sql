-- Align the chat_sessions.model default with the chat edge function's
-- DEFAULT_MODEL (cohere/north-mini-code:free). Threads that omit a model
-- now match what the chat function would fall back to.
alter table "public"."chat_sessions" alter column "model" set default 'cohere/north-mini-code:free'::text;
