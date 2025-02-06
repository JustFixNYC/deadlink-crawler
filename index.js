const core = require("@actions/core");
const github = require("@actions/github");
import { LinkChecker } from "linkinator";

const skipLinks = [
  "images.ctfassets.net",
  "linkedin.com",
  "netlify.com",
  "x.com",
];

try {
  const siteUrl = core.getInput("site-url");
  const repoToken = core.getInput("token");
  const octokit = github.getOctokit(repoToken);

  async function checkLinks() {
    const checker = new LinkChecker();

    checker.on("pagestart", (url) => {
      console.log(`Scanning ${url}`);
    });

    const result = await checker.check({
      path: siteUrl,
      recurse: true,
      linksToSkip: skipLinks,
    });

    console.log(result.passed ? "PASSED :D" : "FAILED :(");

    console.log(`Scanned total of ${result.links.length} links!`);

    const brokenLinks = result.links.filter((x) => x.state === "BROKEN");

    console.log(`Detected ${brokenLinks.length} broken links.`);

    if (brokenLinks.length === 0) return;

    console.log("Opening GitHub issue for broken links");

    const uniqueUrls = [...new Set(brokenLinks.map((x) => x.url))];
    const issueByURL = uniqueUrls
      .map((url) => {
        const pages = brokenLinks
          .filter((x) => x.url === url)
          .map((x) => x.parent);

        return `- [ ] ${url}\r\n  - [ ] ${pages.join("\r\n  - [ ]")}`;
      })
      .join("\r\n \r\n");

    const uniquePages = [...new Set(brokenLinks.map((x) => x.parent))];
    const issueByPage = uniquePages
      .map((page) => {
        const urls = brokenLinks
          .filter((x) => x.parent === page)
          .map((x) => x.url);

        return `- [ ] ${page}\r\n  - [ ] ${urls.join("\r\n  - [ ] ")}`;
      })
      .join("\r\n \r\n");

    const issueBody =
      `## Dead Links by URL\r\n\r\n${issueByURL}\r\n\r\n` +
      `## Dead Links by Page\r\n\r\n${issueByPage}`;

    console.log(issueBody);

    const context = github.context;
    octokit.rest.issues.create({
      ...context.repo,
      title: "Dead Links",
      body: issueBody,
    });
  }

  checkLinks();
} catch (error) {
  core.setFailed(error.message);
}
