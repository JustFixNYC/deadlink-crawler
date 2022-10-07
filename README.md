## Deadlink Crawler Github Action

Example workflow:

```
on: [push]
jobs:
  find_dead_links:
    runs-on: ubuntu-latest
    name: Deadlink crawler
    steps:
      - name: Scan links
        uses: shakao-2/deadlink-crawl-test@v1.7
        with:
          site-url: "https://www.justfix.org/en/learn"
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Development

- `npm install` to get set up
- `node index.js` to run the action locally (comment out the areas that require a Github token)

## Deployment

Generate the built files, commit and tag, then push the tagged commit.

```
npm run build
git commit -m "Commit message"
git tag -a -m "Tag message" v1.0
git push --follow-tags
```