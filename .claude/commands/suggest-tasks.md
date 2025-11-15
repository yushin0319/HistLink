---
description: Notionの未着手タスクから着手すべきタスクを自動提案
---

You are being asked to suggest tasks from Notion that the user should work on next.

Follow these steps:

## Step 1: Check in-progress tasks count

Use the `mcp__notion__notion-search` tool to find tasks with status "進行中" in the tasks database:

```
data_source_url: collection://2a02570f-e49f-8048-8e57-000bdbda68da
query: (empty string to get all)
filters: created_date_range if needed
```

Count the number of in-progress tasks (excluding reports).

## Step 2: If in-progress tasks ≤ 3, fetch untouched tasks

Use `mcp__notion__notion-search` to find tasks with status "未着手":

```
data_source_url: collection://2a02570f-e49f-8048-8e57-000bdbda68da
query: (search for specific criteria if needed)
```

## Step 3: Fetch full details for promising candidates

For each untouched task found, use `mcp__notion__notion-fetch` to get:
- Task name
- Parent task (if any)
- Description/content
- Priority indicators

## Step 4: Analyze and rank

Rank tasks based on:
1. **Parent task context**: Does it belong to an active project?
2. **Dependencies**: Can it be started now?
3. **Size**: Quick wins vs. large tasks
4. **User's current focus**: Related to HistLink? Claude Code setup? Other?

## Step 5: Present top 3-5 suggestions

Present suggestions in this format:

```
📌 おすすめタスク

【1】タスク名 (ID: XX)
   親: 親タスク名（あれば）
   理由: なぜこのタスクを提案するか
   見積: 所要時間の目安

【2】タスク名 (ID: XX)
   ...

どれに着手しますか？番号で選んでください。
```

## Important notes:
- **Skip reports**: Do not suggest report tasks (report_YYYYMMDD format)
- **Context matters**: Consider what the user is currently working on
- **Be concise**: Keep explanations brief
- **Use Japanese**: All output should be in Japanese

After the user selects a task, offer to update its status to "進行中" using the `use-notion` skill.
