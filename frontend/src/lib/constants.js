export const columns = [
  ["inbox",       "Inbox",        "Capture rough work."],
  ["idea",        "Idea",         "Define objective and setup."],
  ["drafting",    "Drafting",     "AI creates or edits output."],
  ["needs_review","Needs Review", "Review risk and fit."],
  ["needs_edit",  "Needs Edit",   "Returned for revision."],
  ["approved",    "Approved",     "Ready to schedule."],
  ["scheduled",   "Scheduled",    "Placed on calendar."],
  ["archived",    "Archived",     "Preserved, inactive."],
];

export const cardTypes = ["post", "image", "video", "campaign", "bulk", "review", "polish", "repurpose"];
export const outputTypes = ["post", "thread", "caption", "image", "video_script", "carousel", "campaign", "review", "polish"];
export const aiRoles = ["strategist", "writer", "designer", "reviewer", "scheduler", "editor", "repurposer", "polisher"];
export const modelLanes = ["safe", "raw", "reviewer", "polish", "image", "video"];

export const FALLBACK_TEMPLATES = [
  { id: "thought_leader_post", label: "Thought Leader Post", card_type: "post", output_type: "post", ai_role: "writer", model_lane: "safe", platform: "x", constraints: "Clear, useful, confident. Avoid hype and unsupported claims.", execution_plan: "Create 3 concise post variants, then select the clearest one." },
  { id: "launch_week_bulk", label: "Launch Week Bulk Plan", card_type: "bulk", output_type: "campaign", ai_role: "strategist", model_lane: "safe", platform: "x", constraints: "Distribute ideas across multiple days. Each child job requires review.", execution_plan: "Create a one-week campaign plan and split it into child post jobs." },
  { id: "raw_creative_sandbox", label: "Raw Creative Sandbox", card_type: "post", output_type: "post", ai_role: "writer", model_lane: "raw", platform: "x", constraints: "Generate edgy creative angles only. Draft-only. Must be promoted before approval.", execution_plan: "Generate raw variants for inspiration, then promote one to a safe reviewed card." },
  { id: "image_prompt_job", label: "Image Prompt Job", card_type: "image", output_type: "image", ai_role: "designer", model_lane: "image", platform: "instagram", constraints: "Create image prompt, alt text, and caption. Do not publish directly.", execution_plan: "Generate one image concept, one prompt, one alt-text draft, and one caption." },
  { id: "short_video_script", label: "Short Video Script", card_type: "video", output_type: "video_script", ai_role: "editor", model_lane: "safe", platform: "tiktok", constraints: "Hook in first 2 seconds. Keep script under 45 seconds.", execution_plan: "Create hook, scene beats, spoken script, caption, and visual notes." },
];

export const FALLBACK_PLATFORM_RULES = {
  x:        { label: "X / Twitter",  max: 280,  note: "Compact post preview with character count and thread warning." },
  linkedin:  { label: "LinkedIn",     max: 3000, note: "Professional long-form paragraph preview." },
  instagram: { label: "Instagram",    max: 2200, note: "Caption, hashtags, media placeholder, and alt-text reminder." },
  mastodon:  { label: "Mastodon",     max: 500,  note: "Content warning and instance-aware post preview." },
  youtube:   { label: "YouTube",      max: 5000, note: "Title/description/shorts script preview." },
  tiktok:    { label: "TikTok",       max: 2200, note: "Hook, visual beats, caption, and short video structure." },
};
