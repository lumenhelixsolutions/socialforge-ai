# Open Source Research Notes

This MVP borrows patterns from current open-source ecosystems without copying full products.

## Local model UI inspiration

- Open WebUI: self-hosted/local AI interface with Ollama support and model-management patterns.
- Ollama: simple local model runner with localhost API.
- AnythingLLM: local-by-default AI app pattern for documents, chats, and agents.

## Agent and workflow inspiration

- CrewAI: role-based multi-agent workflows with crews and flows.
- LangGraph: durable, stateful, human-in-the-loop agent workflows.
- Langflow: visual AI workflow builder pattern.
- Activepieces/n8n: automation template, retry, connector, and visual flow ideas.

## UI/component inspiration

- shadcn/ui: copy-owned React components with Tailwind/Radix patterns.
- Tiptap: headless rich-text editor for draft editing.
- React Flow / xyflow: node-based workflow/diagram UI.
- FullCalendar: scheduling/calendar interface pattern.
- TanStack Query/Table: robust frontend server-state/data table patterns.

## Important implementation lesson

Existing open-source tools are powerful, but generic. This app should be opinionated and narrow:

```txt
Social media ideation → drafts → review → approval → schedule → controlled publish
```

Avoid turning MVP 0.1 into a full generic workflow engine.
