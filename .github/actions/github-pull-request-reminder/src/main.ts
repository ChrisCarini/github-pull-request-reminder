import * as core from '@actions/core'
import * as github from '@actions/github'
import fetch from 'node-fetch';

const myToken = core.getInput('GITHUB_TOKEN')
const octokit = github.getOctokit(myToken)

const owner: string = github.context.repo.owner
const repo: string = github.context.repo.repo
const reminder_seconds = 15 * 60

function pullRequests(repoOwner: string, repo: string) {
  return octokit.rest.pulls.list({
    owner: repoOwner,
    repo: repo,
    state: 'open',
    sort: 'created'
  })
}

async function getMetrics(): Promise<any> {
  const url = "https://chriscarini.com/developer_insights/data.json";
  const response = await fetch(url)
  const result = await response.json() as any;
  return result;
}

async function run(): Promise<void> {
  const api_response = await getMetrics();
  const crl_p50 = api_response.metrics['Code Review Latency'].P50.Overall

  try {
    const allOpenPrs = await pullRequests(owner, repo)
    allOpenPrs.data.forEach(pr => {
      core.debug(`PR: ${JSON.stringify(pr, null, 2)}`)

      const reviewerLogins: string = pr.requested_reviewers
        ? pr.requested_reviewers.map(reviewer => {
          return reviewer.login
        })
        .join(', ') : '';

      core.info(`PR:   #${pr.number} by [${pr.user?.login}] - ${pr.title} (${pr.state})`)
      core.info(`======================================================================`)
      core.info(`Link:       ${pr.html_url}`)
      core.info(`Created at: ${pr.created_at}`)
      core.info(`Created at: ${pr.updated_at}`)
      core.info(`Reviewers:  ${reviewerLogins}`)

      const current_time = new Date()
      const pr_creation_time = new Date(pr.created_at)
      const age_seconds = (current_time.getTime() - pr_creation_time.getTime()) / 1000
      let reviewer_mention:string = "";
      for (let login of reviewerLogins.split(', ')) {
        if(login != "") {
          reviewer_mention += "@" + login + " "
        }
      }

      const comment:string = "Please review this pull request to reduce the P50 code review latency for this multiproduct."
      core.info(`Overall p50 CRL:  ${crl_p50}`)
      core.info(`Time since creation: ${age_seconds}`)
      const list_params = {owner: owner, repo: repo, issue_number: pr.number}
      octokit.rest.issues.listComments(list_params).then(comments => {
        const index = comments.data.findIndex(comments => comments.body?.includes(comment))
        if (index === -1) {
          core.info(`Needs reminder`)
          if(age_seconds >= crl_p50 - reminder_seconds) {
            //comment when time since creation is within reminder time of the p50 crl
            const create_params = {owner: owner as string, repo: repo as string, issue_number: pr.number as number, body: (reviewer_mention + comment) as string};
            octokit.rest.issues.createComment(create_params);
          }
        }
      })
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
