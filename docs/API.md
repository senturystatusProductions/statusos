# StatusOS API

## Supabase Edge Function

**Name:** `statusos-ai`

## Request

```http
POST /functions/v1/statusos-ai
Content-Type: application/json
Authorization: Bearer <user access token>
```

```json
{
  "message": "Write a follow-up message for an artist."
}
```

## Success Response

```json
{
  "reply": "AI response here"
}
```

## Error Response

```json
{
  "error": "Safe error description"
}
```

## Frontend Requirements

- Send the current Supabase access token.
- Disable Send while the request is active.
- Show a loading message.
- Handle non-200 responses.
- Never expose `OPENAI_API_KEY`.
- Avoid logging private message content in production.
