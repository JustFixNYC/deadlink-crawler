const core = require('@actions/core');
const github = require('@actions/github');
const { SiteChecker } = require('broken-link-checker');


try {
  const siteUrl = core.getInput('site-url');

  const repoToken = core.getInput('token');
  const octokit = github.getOctokit(repoToken);

  const result = {};
  let brokenLinks = [];

  const options = {
    excludedKeywords: ["linkedin.com", "netlify.com"]
  }

  const handlers = {
    link: (result) => {
      if (result.broken) {
        brokenLinks.push(result.url.original);
      }
    },
    page: (error, pageURL) => {
      console.log(`Scanned... ${pageURL}`);
      if (brokenLinks.length) {
        console.log(`${brokenLinks.length} broken links\r\n`);
        result[pageURL] = brokenLinks;
        brokenLinks = [];
      }
    },
    site: () => {
      console.log("Done scanning!");

      let count = 0;
      let issue = "## Dead links found";
      Object.keys(result).forEach(page => {
        issue += `\r\n \r\n- [ ] ${page}`;
        for (let link of result[page]) {
          issue += `\r\n  - [ ] ${link}`;
          count += 1;
        }
      })

      console.log(`${count} broken links found`);

      const context = github.context;
      octokit.rest.issues.create({
        ...context.repo,
        title: 'Learning center deadlinks',
        body: issue,
      });
    },
  }

  const siteChecker = new SiteChecker(options, handlers);
  siteChecker.enqueue(siteUrl);

} catch (error) {
  core.setFailed(error.message);
}