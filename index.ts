import { withSupabase } from 'npm:@supabase/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    try {
      const body = await req.json()
      const text = String(body?.text || '').trim()
      const targetLanguage = String(body?.targetLanguage || 'Russian').trim()

      if (!text) {
        return Response.json(
          { error: 'Text is required' },
          { status: 400, headers: corsHeaders }
        )
      }

      if (text.length > 500) {
        return Response.json(
          { error: 'Text is too long' },
          { status: 400, headers: corsHeaders }
        )
      }

      const apiKey = Deno.env.get('api_key')

      if (!apiKey) {
        return Response.json(
          { error: 'OPENAI_API_KEY is not configured in Supabase' },
          { status: 500, headers: corsHeaders }
        )
      }

      const prompt = `Translate the English word or phrase below into ${targetLanguage}.

Rules:
- Return ONLY the translation, nothing else.
- Keep it concise and natural.
- If it is an idiom, phrasal verb, or expression, translate its actual meaning rather than word-for-word.
- If there are two common meanings, separate them with a semicolon.

English: ${text}`

      const response = await fetch(
        'https://api.openai.com/v1/responses',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            input: prompt,
            max_output_tokens: 100,
            store: false,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        console.error('OpenAI error:', result)

        return Response.json(
          { error: 'OpenAI request failed' },
          { status: 502, headers: corsHeaders }
        )
      }

      const translation = String(
        result?.output_text || ''
      ).trim()

      if (!translation) {
        return Response.json(
          { error: 'OpenAI returned an empty translation' },
          { status: 502, headers: corsHeaders }
        )
      }

      return Response.json(
        { translation },
        { headers: corsHeaders }
      )

    } catch (error) {
      console.error('ai-translate error:', error)

      return Response.json(
        { error: 'Translation failed' },
        { status: 500, headers: corsHeaders }
      )
    }
  }),
}
