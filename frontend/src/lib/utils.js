import { api } from "./api";
import { FALLBACK_PLATFORM_RULES } from "./constants";

export function readableError(err) {
  try {
    const obj = JSON.parse(String(err.message));
    return obj.detail || err.message;
  } catch {
    return err.message || String(err);
  }
}

export function transitionMessage(card, targetState) {
  if (targetState === "scheduled") {
    return `Schedule "${card.title}"?\n\nThis creates a local scheduled job state. It does not publish to any platform.`;
  }
  if (targetState === "approved") {
    return `Approve "${card.title}"?\n\nApproval means it can be scheduled. Raw cards cannot be approved directly.`;
  }
  if (targetState === "archived") {
    return `Archive "${card.title}"?\n\nThe card remains in history but leaves the active workflow.`;
  }
  if (targetState === "needs_edit") {
    return `Send "${card.title}" back to editing?`;
  }
  return `Move "${card.title}" to ${targetState.replaceAll("_", " ")}?`;
}

export async function guardedMove(card, targetState, refresh, selectCard, setError, options = {}) {
  const message = transitionMessage(card, targetState);
  if (!window.confirm(message)) return;
  try {
    const payload = { target_state: targetState };
    if (targetState === "scheduled") {
      payload.scheduled_at = options.scheduled_at || new Date(Date.now() + 86400000).toISOString();
    }
    const updated = await api.moveTaskCard(card.id, payload);
    await refresh(updated.id);
    await selectCard(updated.id);
  } catch (err) {
    setError(readableError(err));
  }
}

export function getPlatformRule(platform, metaRules) {
  if (metaRules && metaRules[platform]) {
    const r = metaRules[platform];
    return { label: r.label, max: r.max_chars, note: r.wysiwyg_note };
  }
  return FALLBACK_PLATFORM_RULES[platform] || FALLBACK_PLATFORM_RULES.x;
}

export function analyzePreview(text, platform, metaRules) {
  const rule = getPlatformRule(platform, metaRules);
  const value = text || "";
  const hashtags = value.split(/\s+/).filter(x => x.startsWith("#") && x.length > 1);
  const links = value.split(/\s+/).filter(x => x.startsWith("http://") || x.startsWith("https://"));
  const paragraphs = value.split(/\n+/).filter(x => x.trim().length > 0);
  const over = value.length > rule.max;
  const threadParts = [];
  if (platform === "x" && over) {
    const words = value.split(/\s+/);
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length > rule.max) {
        if (current) threadParts.push(current);
        current = word;
      } else {
        current = (current + " " + word).trim();
      }
    }
    if (current) threadParts.push(current);
  }
  return { ...rule, chars: value.length, remaining: rule.max - value.length, over, hashtags, links, paragraphs, threadParts };
}
