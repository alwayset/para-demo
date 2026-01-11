import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type RunRequest = {
  agent_id: string;
  task: string;
  audience?: string;
  constraints?: string;
};

type PlannerOutput = {
  intent: string;
  target_format: string;
  hypothesis: string;
  content_brief: string;
  success_signals: string[];
  search_queries?: string[];
  image_needed?: boolean;
  image_prompt?: string;
};

type PostOutput = {
  title: string;
  payload: Record<string, unknown>;
};

const DEFAULT_TEXT_MODEL_PRO = "gemini-1.5-pro-latest";
const DEFAULT_TEXT_MODEL_LIGHT = "gemini-1.5-flash-latest";
const DEFAULT_IMAGE_MODEL = "imagen-3.0-generate-001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PARA_SUPABASE_URL");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("PARA_SUPABASE_SERVICE_ROLE_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  const tavilyKey = Deno.env.get("TAVILY_API_KEY");
  const modelPro = Deno.env.get("GEMINI_MODEL_PRO") ?? DEFAULT_TEXT_MODEL_PRO;
  const modelLight =
    Deno.env.get("GEMINI_MODEL_LIGHT") ?? DEFAULT_TEXT_MODEL_LIGHT;
  const imageModel = Deno.env.get("GEMINI_IMAGE_MODEL") ?? DEFAULT_IMAGE_MODEL;

  if (!supabaseUrl || !serviceKey) {
    return new Response("Supabase env missing", { status: 500, headers: corsHeaders });
  }
  if (!geminiKey) {
    return new Response("Gemini env missing", { status: 500, headers: corsHeaders });
  }
  if (!tavilyKey) {
    return new Response("Tavily env missing", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let body: RunRequest;
  try {
    body = (await req.json()) as RunRequest;
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  if (!body.agent_id || !body.task) {
    return new Response("agent_id and task are required", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id, channel_name, mission")
    .eq("id", body.agent_id)
    .single();

  if (agentError || !agent) {
    return new Response("Agent not found", { status: 404, headers: corsHeaders });
  }

  const { data: runRow, error: runError } = await supabase
    .from("agent_runs")
    .insert({
      agent_id: agent.id,
      task: body.task,
      status: "running",
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    return new Response("Failed to create run", { status: 500, headers: corsHeaders });
  }

  const { data: memory } = await supabase
    .from("agent_memory")
    .select("summary")
    .eq("agent_id", agent.id)
    .maybeSingle();

  const { data: recentPosts } = await supabase
    .from("posts")
    .select("id, title, created_at")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const postIds = (recentPosts ?? []).map((post) => post.id);

  const { data: feedback } = postIds.length
    ? await supabase
        .from("post_feedback")
        .select("post_id, signal, meta")
        .in("post_id", postIds)
    : { data: [] };

  const { data: comments } = postIds.length
    ? await supabase
        .from("post_comments")
        .select("post_id, body")
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  const summary = buildMemorySummary({
    previous: memory?.summary ?? {},
    posts: recentPosts ?? [],
    feedback: feedback ?? [],
    comments: comments ?? [],
  });

  const planner = await callGemini<PlannerOutput>({
    apiKey: geminiKey,
    model: modelPro,
    system:
      "You are a planning assistant for Para. Output JSON only. No analysis or markdown.",
    user: buildPlannerPrompt({
      channelName: agent.channel_name,
      mission: agent.mission,
      task: body.task,
      audience: body.audience,
      constraints: body.constraints,
      memorySummary: summary,
    }),
  });

  if (!planner.ok) {
    await supabase
      .from("agent_runs")
      .update({ status: "error", error: planner.error })
      .eq("id", runRow.id);
    return new Response(planner.error ?? "Planner failed", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const searchResults = planner.data.search_queries?.length
    ? await runSearches(tavilyKey, planner.data.search_queries)
    : [];

  const shouldGenerateImage = Boolean(
    planner.data.image_needed ||
      planner.data.target_format?.toLowerCase().includes("visual")
  );

  const image = shouldGenerateImage
    ? await generateImageAsset({
        apiKey: geminiKey,
        model: imageModel,
        prompt:
          planner.data.image_prompt ??
          `${agent.mission}. ${planner.data.content_brief}`,
      })
    : null;

  const generator = await callGemini<PostOutput>({
    apiKey: geminiKey,
    model: chooseModel(body.task, planner.data, modelPro, modelLight),
    system:
      "You are a content agent for Para. Output JSON only. No analysis or markdown.",
    user: buildGeneratorPrompt({
      channelName: agent.channel_name,
      mission: agent.mission,
      plan: planner.data,
      research: searchResults,
      image,
    }),
  });

  if (!generator.ok) {
    await supabase
      .from("agent_runs")
      .update({ status: "error", error: generator.error })
      .eq("id", runRow.id);
    return new Response(generator.error ?? "Generator failed", {
      status: 500,
      headers: corsHeaders,
    });
  }

  const post = generator.data;
  const { data: createdPost, error: postError } = await supabase
    .from("posts")
    .insert({
      agent_id: agent.id,
      title: post.title,
      payload: post.payload,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (postError || !createdPost) {
    await supabase
      .from("agent_runs")
      .update({ status: "error", error: postError?.message ?? "Post insert failed" })
      .eq("id", runRow.id);
    return new Response("Failed to create post", { status: 500, headers: corsHeaders });
  }

  await supabase
    .from("agent_runs")
    .update({
      status: "completed",
      plan: planner.data,
      post: post,
    })
    .eq("id", runRow.id);

  await supabase.from("agent_memory").upsert({
    agent_id: agent.id,
    summary,
    updated_at: new Date().toISOString(),
  });

  return Response.json(
    {
      run_id: runRow.id,
      post_id: createdPost.id,
      plan: planner.data,
      post,
      memory_summary: summary,
    },
    { headers: corsHeaders }
  );
});

function buildPlannerPrompt(input: {
  channelName: string;
  mission: string;
  task: string;
  audience?: string;
  constraints?: string;
  memorySummary: Record<string, unknown>;
}): string {
  return [
    `Channel name: ${input.channelName}`,
    `Mission: ${input.mission}`,
    `Task: ${input.task}`,
    `Audience: ${input.audience ?? "general"}`,
    `Constraints: ${input.constraints ?? "none"}`,
    `Memory summary: ${JSON.stringify(input.memorySummary)}`,
    "Output JSON only with keys: intent, target_format, hypothesis, content_brief, success_signals.",
  ].join("\n");
}

function buildGeneratorPrompt(input: {
  channelName: string;
  mission: string;
  plan: PlannerOutput;
  research: Array<{
    query: string;
    results: Array<{ title: string; url: string; summary: string }>;
  }>;
  image: { url: string; prompt: string } | null;
}): string {
  return [
    `Channel name: ${input.channelName}`,
    `Mission: ${input.mission}`,
    `Plan: ${JSON.stringify(input.plan)}`,
    `Research: ${JSON.stringify(input.research)}`,
    `Image: ${JSON.stringify(input.image)}`,
    "Output JSON only with keys: title, payload.",
  ].join("\n");
}

function buildMemorySummary(input: {
  previous: Record<string, unknown>;
  posts: Array<{ id: string; title: string; created_at: string }>;
  feedback: Array<{ post_id: string; signal: string; meta: Record<string, unknown> }>;
  comments: Array<{ post_id: string; body: string }>;
}): Record<string, unknown> {
  const signalCounts: Record<string, number> = {};
  let totalDwell = 0;
  let dwellCount = 0;

  for (const item of input.feedback) {
    signalCounts[item.signal] = (signalCounts[item.signal] ?? 0) + 1;
    if (typeof item.meta?.dwell_ms === "number") {
      totalDwell += item.meta.dwell_ms;
      dwellCount += 1;
    }
  }

  const avgDwellMs = dwellCount ? Math.round(totalDwell / dwellCount) : null;

  return {
    previous: input.previous,
    posts_analyzed: input.posts.length,
    recent_titles: input.posts.map((post) => post.title).slice(0, 10),
    signal_counts: signalCounts,
    avg_dwell_ms: avgDwellMs,
    comment_snippets: input.comments.map((comment) => comment.body).slice(0, 10),
    updated_at: new Date().toISOString(),
  };
}

function chooseModel(
  task: string,
  plan: PlannerOutput,
  pro: string,
  light: string
): string {
  const taskLength = task.trim().length;
  const complex =
    taskLength > 120 ||
    plan.search_queries?.length ||
    plan.image_needed ||
    plan.target_format?.length > 16;
  return complex ? pro : light;
}

async function callGemini<T>(input: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          role: "system",
          parts: [{ text: input.system }],
        },
        contents: [{ role: "user", parts: [{ text: input.user }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 900,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, error: errorText || "Anthropic request failed" };
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { ok: false, error: "Empty model response" };
  }

  const parsed = safeJsonParse<T>(text);
  if (!parsed.ok) {
    return { ok: false, error: "Invalid JSON response from model" };
  }

  return { ok: true, data: parsed.value };
}

async function runSearches(apiKey: string, queries: string[]) {
  const results = [];
  for (const query of queries.slice(0, 3)) {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_answer: false,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      results.push({ query, results: [] });
      continue;
    }

    const data = await response.json();
    const mapped = (data?.results ?? []).map(
      (item: { title: string; url: string; content: string }) => ({
        title: item.title,
        url: item.url,
        summary: item.content,
      })
    );
    results.push({ query, results: mapped });
  }

  return results;
}

async function generateImageAsset(input: {
  apiKey: string;
  model: string;
  prompt: string;
}): Promise<{ url: string; prompt: string } | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:predict?key=${input.apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: input.prompt }],
        parameters: {
          aspectRatio: "4:5",
          sampleCount: 1,
        },
      }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const base64 =
    data?.predictions?.[0]?.bytesBase64Encoded ??
    data?.predictions?.[0]?.image?.bytesBase64Encoded ??
    null;

  if (!base64) {
    return null;
  }

  const imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const filename = `agent-${crypto.randomUUID()}.png`;
  const { url, error } = await uploadToSupabaseStorage(filename, imageBytes);
  if (error || !url) {
    return null;
  }

  return { url, prompt: input.prompt };
}

async function uploadToSupabaseStorage(
  filename: string,
  bytes: Uint8Array
): Promise<{ url: string | null; error: string | null }> {
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PARA_SUPABASE_URL");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("PARA_SUPABASE_SERVICE_ROLE_KEY");
  const bucket = Deno.env.get("SUPABASE_STORAGE_BUCKET") ?? "para-bucket";

  if (!supabaseUrl || !serviceKey) {
    return { url: null, error: "Supabase env missing" };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filename, bytes, { contentType: "image/png", upsert: true });

  if (error || !data) {
    return { url: null, error: error?.message ?? "Upload failed" };
  }

  const { data: publicUrl } = supabase.storage.from(bucket).getPublicUrl(filename);
  return { url: publicUrl.publicUrl, error: null };
}

function safeJsonParse<T>(input: string): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(input) as T };
  } catch {
    return { ok: false };
  }
}
