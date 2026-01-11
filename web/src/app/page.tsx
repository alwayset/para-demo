"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Agent = {
  id: string;
  channel_name: string;
  mission: string;
  created_at: string;
};

type Post = {
  id: string;
  agent_id: string;
  title: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type FeedbackSummary = {
  likes: number;
  comments: number;
  saves: number;
  follows: number;
  avgDwellMs: number | null;
  commentCount: number;
};

const DEFAULT_TASK = "Create a fresh post for today's feed.";
const COMMENT_SEEDS = [
  "This is unsettling in the best way.",
  "Post more of this vibe.",
  "The palette is perfect.",
  "I did not expect that ending.",
  "This feels like a memory from the future.",
];

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackSummary>>(
    {}
  );
  const [channelName, setChannelName] = useState("");
  const [mission, setMission] = useState("");
  const [task, setTask] = useState(DEFAULT_TASK);
  const [isRunning, setIsRunning] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentIndex = useMemo(() => {
    return agents.reduce<Record<string, Agent>>((acc, agent) => {
      acc[agent.id] = agent;
      return acc;
    }, {});
  }, [agents]);

  useEffect(() => {
    void refreshAll();
  }, []);

  async function refreshAll() {
    setError(null);
    await Promise.all([loadAgents(), loadPosts()]);
  }

  async function loadAgents() {
    const { data, error: loadError } = await supabase
      .from("agents")
      .select("id, channel_name, mission, created_at")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      return;
    }
    setAgents(data ?? []);
  }

  async function loadPosts() {
    const { data, error: postError } = await supabase
      .from("posts")
      .select("id, agent_id, title, payload, created_at")
      .order("created_at", { ascending: false })
      .limit(40);

    if (postError) {
      setError(postError.message);
      return;
    }
    const postRows = data ?? [];
    setPosts(postRows);
    await loadFeedback(postRows.map((post) => post.id));
  }

  async function loadFeedback(postIds: string[]) {
    if (postIds.length === 0) {
      setFeedbackMap({});
      return;
    }

    const { data: feedback } = await supabase
      .from("post_feedback")
      .select("post_id, signal, meta")
      .in("post_id", postIds);

    const { data: comments } = await supabase
      .from("post_comments")
      .select("post_id")
      .in("post_id", postIds);

    const map: Record<
      string,
      FeedbackSummary & { dwellSum: number; dwellCount: number }
    > = {};

    postIds.forEach((postId) => {
      map[postId] = {
        likes: 0,
        comments: 0,
        saves: 0,
        follows: 0,
        avgDwellMs: null,
        commentCount: 0,
        dwellSum: 0,
        dwellCount: 0,
      };
    });

    (feedback ?? []).forEach((row) => {
      const summary = map[row.post_id];
      if (!summary) return;
      if (row.signal === "like") summary.likes += 1;
      if (row.signal === "comment") summary.comments += 1;
      if (row.signal === "save") summary.saves += 1;
      if (row.signal === "follow") summary.follows += 1;
      if (row.signal === "dwell") {
        const dwell = (row.meta as { dwell_ms?: number })?.dwell_ms;
        if (typeof dwell === "number") {
          summary.dwellSum += dwell;
          summary.dwellCount += 1;
        }
      }
    });

    (comments ?? []).forEach((row) => {
      const summary = map[row.post_id];
      if (!summary) return;
      summary.commentCount += 1;
    });

    const normalized: Record<string, FeedbackSummary> = {};
    Object.entries(map).forEach(([postId, summary]) => {
      normalized[postId] = {
        likes: summary.likes,
        comments: summary.comments,
        saves: summary.saves,
        follows: summary.follows,
        commentCount: summary.commentCount,
        avgDwellMs: summary.dwellCount
          ? Math.round(summary.dwellSum / summary.dwellCount)
          : null,
      };
    });

    setFeedbackMap(normalized);
  }

  async function createAgent() {
    if (!channelName.trim() || !mission.trim()) {
      setError("Channel name and mission are required.");
      return;
    }
    setIsCreating(true);
    setError(null);
    const { error: insertError } = await supabase.from("agents").insert({
      channel_name: channelName.trim(),
      mission: mission.trim(),
    });

    setIsCreating(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setChannelName("");
    setMission("");
    await loadAgents();
  }

  async function runAgent(agentId: string, silent = false) {
    if (!silent) setIsRunning(true);
    setError(null);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes("placeholder") || 
          supabaseKey.includes("placeholder")) {
        throw new Error(
          "Supabase environment variables are not configured. " +
          "Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel."
        );
      }

      const functionUrl = `${supabaseUrl}/functions/v1/run-agent`;
      
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ agent_id: agentId, task }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "Edge function 'run-agent' is not deployed. " +
            "Please deploy it using: npx supabase functions deploy run-agent"
          );
        }
        const message = await response.text();
        throw new Error(message || `Agent run failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { post_id: string };
      await simulateFeedback(data.post_id);
      await loadPosts();
    } catch (runError) {
      const errorMessage = runError instanceof Error 
        ? runError.message 
        : "Failed to run agent. Please check your Supabase configuration.";
      setError(errorMessage);
      console.error("Agent run error:", runError);
    } finally {
      if (!silent) setIsRunning(false);
    }
  }

  async function runAllAgents() {
    setIsRunning(true);
    setError(null);
    for (const agent of agents) {
      await runAgent(agent.id, true);
    }
    setIsRunning(false);
  }

  function randomInt(max: number) {
    return Math.floor(Math.random() * max);
  }

  async function simulateFeedback(postId: string) {
    const likes = 4 + randomInt(18);
    const comments = randomInt(6);
    const saves = randomInt(8);
    const follows = randomInt(4);
    const dwellEvents = 1 + randomInt(4);

    const feedbackRows = [
      ...Array.from({ length: likes }, () => ({
        post_id: postId,
        signal: "like",
        meta: {},
      })),
      ...Array.from({ length: comments }, () => ({
        post_id: postId,
        signal: "comment",
        meta: {},
      })),
      ...Array.from({ length: saves }, () => ({
        post_id: postId,
        signal: "save",
        meta: {},
      })),
      ...Array.from({ length: follows }, () => ({
        post_id: postId,
        signal: "follow",
        meta: {},
      })),
      ...Array.from({ length: dwellEvents }, () => ({
        post_id: postId,
        signal: "dwell",
        meta: { dwell_ms: 900 + randomInt(2400) },
      })),
    ];

    if (feedbackRows.length > 0) {
      await supabase.from("post_feedback").insert(feedbackRows);
    }

    if (comments > 0) {
      const commentRows = Array.from({ length: comments }, () => ({
        post_id: postId,
        body: COMMENT_SEEDS[randomInt(COMMENT_SEEDS.length)],
      }));
      await supabase.from("post_comments").insert(commentRows);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.4em] text-muted">
            Para • Agent Studio
          </p>
          <h1 className="font-display text-4xl leading-tight">
            Train channels to invent their own formats.
          </h1>
          <p className="max-w-2xl text-base text-muted">
            Create channels, run agentic generations, and see polymorphic payloads
            render live. Feedback is simulated to keep the evolutionary loop
            moving.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-xl">Create a channel</h2>
            <p className="mt-1 text-sm text-muted">
              Channel name + mission are all you need to start.
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs uppercase tracking-wide text-muted">
                Channel name
              </label>
              <input
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
                placeholder="Noir Circuit"
              />
              <label className="block text-xs uppercase tracking-wide text-muted">
                Mission
              </label>
              <textarea
                className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                value={mission}
                onChange={(event) => setMission(event.target.value)}
                rows={4}
                placeholder="Find the darkest cyberpunk aesthetics."
              />
              <button
                onClick={createAgent}
                disabled={isCreating}
                className="w-full rounded-full bg-accent px-4 py-2 text-sm uppercase tracking-wide text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create channel"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Channels</h2>
              <button
                onClick={runAllAgents}
                disabled={isRunning || agents.length === 0}
                className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
              >
                Run all
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {agents.length === 0 ? (
                <p className="text-sm text-muted">
                  No channels yet. Create one to begin.
                </p>
              ) : (
                agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-xl border border-border/60 bg-white p-3"
                  >
                    <p className="text-sm font-semibold">{agent.channel_name}</p>
                    <p className="mt-1 text-xs text-muted">{agent.mission}</p>
                    <button
                      onClick={() => runAgent(agent.id)}
                      disabled={isRunning}
                      className="mt-3 w-full rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {isRunning ? "Running..." : "Run agent"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-xl">Run task</h2>
            <p className="mt-1 text-sm text-muted">
              This task is sent to any agent you run.
            </p>
            <div className="mt-3 flex flex-col gap-3 md:flex-row">
              <input
                className="w-full flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                value={task}
                onChange={(event) => setTask(event.target.value)}
              />
              <button
                onClick={refreshAll}
                className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wide text-muted transition hover:border-accent hover:text-accent"
              >
                Refresh
              </button>
            </div>
            {error ? (
              <p className="mt-3 text-sm text-accent">{error}</p>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted">
                Run an agent to see posts appear here.
              </div>
            ) : (
              posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted">
                    <span>{agentIndex[post.agent_id]?.channel_name ?? "Unknown"}</span>
                    <span>{new Date(post.created_at).toLocaleTimeString()}</span>
                  </div>
                  <h3 className="mt-3 font-display text-2xl">{post.title}</h3>
                  <div className="mt-4">{renderPayload(post.payload)}</div>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
                    <span>likes {feedbackMap[post.id]?.likes ?? 0}</span>
                    <span>comments {feedbackMap[post.id]?.commentCount ?? 0}</span>
                    <span>saves {feedbackMap[post.id]?.saves ?? 0}</span>
                    <span>follows {feedbackMap[post.id]?.follows ?? 0}</span>
                    <span>
                      dwell{" "}
                      {feedbackMap[post.id]?.avgDwellMs
                        ? `${Math.round(
                            (feedbackMap[post.id]?.avgDwellMs ?? 0) / 100
                          ) / 10}s`
                        : "n/a"}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function renderPayload(payload: Record<string, unknown>) {
  const type = (payload.type as string | undefined) ?? "";
  const quote = payload.quote as string | undefined;
  const image = payload.image as { prompt?: string; url?: string } | undefined;
  const imageUrl = (payload.image_url as string | undefined) ?? image?.url;
  const options = payload.options as Array<{ label: string }> | undefined;
  const blocks = payload.blocks as
    | Array<{ type: string; text?: string; url?: string }>
    | undefined;

  if (type === "visual_card" || image || imageUrl) {
    return (
      <div className="rounded-2xl bg-slate-950 p-4 text-white">
        <div className="text-xs uppercase tracking-wide text-white/70">
          visual card
        </div>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Generated visual"
            className="mt-3 h-56 w-full rounded-xl object-cover"
          />
        ) : null}
        <p className="mt-3 text-sm text-white/80">
          {(payload.caption as string) ?? "Atmospheric visual study."}
        </p>
        <p className="mt-3 text-xs text-white/50">
          prompt: {image?.prompt ?? "visual prompt"}
        </p>
      </div>
    );
  }

  if (type === "typographic_thought" || quote) {
    return (
      <div className="rounded-2xl bg-[#f4f1ea] px-6 py-8 text-center text-lg font-semibold text-slate-800">
        “{quote ?? "A typographic thought."}”
      </div>
    );
  }

  if (type === "binary_poll" || options) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
        <p className="text-sm font-semibold">
          {(payload.question as string) ?? "Poll"}
        </p>
        <div className="grid gap-2">
          {(options ?? []).map((option, index) => (
            <div
              key={`${option.label}-${index}`}
              className="rounded-xl border border-border px-3 py-2 text-xs uppercase tracking-wide text-muted"
            >
              {option.label}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "mixed_stack" || blocks) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
        {(blocks ?? []).map((block, index) => {
          if (block.type === "heading") {
            return (
              <div key={index} className="text-base font-semibold">
                {block.text}
              </div>
            );
          }
          if (block.type === "image") {
            return (
              <div
                key={index}
                className="h-28 rounded-xl bg-gradient-to-br from-slate-900 to-orange-500"
              />
            );
          }
          return (
            <p key={index} className="text-sm text-muted">
              {block.text}
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <pre className="rounded-2xl border border-border bg-white p-4 text-xs text-muted">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}
