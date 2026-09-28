# GitHub Starred README Search

Indexes a GitHub user's starred repositories and searches their READMEs. It also
analyzes recent activity and exports the index as CSV.

Everything runs in the browser against the GitHub API. The optional personal
access token stays in the browser and is sent only to GitHub. Without a token,
GitHub allows 60 requests per hour. With one, 5,000.

```bash
bun install      # at the repository root
bun run dev      # start dev server
bun run build    # build to dist/
```
