import os
import openai

NOTES_SYSTEM = "You are a helpful assistant that summarizes git commits into well-structured release notes."
NOTES_PROMPT = """\
Below is a list of git commits. Please create a well-formatted release notes summary.
Group the changes into categories (Features, Bug Fixes, Documentation, etc.) and provide a high-level summary.
Format the output in Markdown.

Commits:
{commits}
"""

TITLE_SYSTEM = "You are a helpful assistant that creates concise release titles."
TITLE_PROMPT = """\
Based on these git commits, create a very short (5-7 words max) summary of the main changes for a release title.
Focus on the most significant changes. Be concise and informative.

Commits:
{commits}
"""

client = openai.OpenAI(
    api_key=os.environ["OPENROUTER_API_KEY"],
    base_url="https://openrouter.ai/api/v1",
)

with open("commits.txt") as f:
    commits = f.read()

if not commits.strip():
    print("No new commits found")
    with open("release_notes.md", "w") as f:
        f.write("No changes in this release")
    with open("release_title.txt", "w") as f:
        f.write("Maintenance Release")
    raise SystemExit(0)

notes_response = client.chat.completions.create(
    model="anthropic/claude-sonnet-4-5",
    messages=[
        {"role": "system", "content": NOTES_SYSTEM},
        {"role": "user", "content": NOTES_PROMPT.format(commits=commits)},
    ],
    max_tokens=1000,
)

release_notes = notes_response.choices[0].message.content.strip()
# Strip markdown code fences if the model wrapped its output
if release_notes.startswith("```"):
    release_notes = release_notes.split("\n", 1)[-1]
    if release_notes.endswith("```"):
        release_notes = release_notes[:-3].strip()

with open("release_notes.md", "w") as f:
    f.write(release_notes)

title_response = client.chat.completions.create(
    model="anthropic/claude-sonnet-4-5",
    messages=[
        {"role": "system", "content": TITLE_SYSTEM},
        {"role": "user", "content": TITLE_PROMPT.format(commits=commits)},
    ],
    max_tokens=50,
)

release_title = title_response.choices[0].message.content.strip().strip('"')

with open("release_title.txt", "w") as f:
    f.write(release_title)

print("Release notes and title generated successfully")
