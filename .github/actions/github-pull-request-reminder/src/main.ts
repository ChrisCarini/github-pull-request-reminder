import * as core from '@actions/core'
import * as github from '@actions/github'
import fetch from 'node-fetch';

const myToken = core.getInput('GITHUB_TOKEN')
const octokit = github.getOctokit(myToken)

const owner: string = github.context.repo.owner
const repo: string = github.context.repo.repo

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

      const reviewerLogins = pr.requested_reviewers
        ?.map(reviewer => {
          return reviewer.login
        })
        .join(', ')

      core.info(`PR:   #${pr.number} by [${pr.user?.login}] - ${pr.title} (${pr.state})`)
      core.info(`======================================================================`)
      core.info(`Link:       ${pr.html_url}`)
      core.info(`Created at: ${pr.created_at}`)
      core.info(`Created at: ${pr.updated_at}`)
      core.info(`Reviewers:  ${reviewerLogins}`)

      const current_time = new Date()
      const pr_creation_time = new Date(pr.created_at)
      const difference = current_time.getTime() - pr_creation_time.getTime()
      const comment = "Please review within " + difference + " seconds to reduce the P50 code review latency."
      core.info(`Overall p50 CRL:  ${crl_p50}`)
      core.info(`Time since creation: ${difference}`)
      if((difference/(1000 * 60 * 60)) < crl_p50) {
        //comment only if time passed in hours is less than p50 code review latency
        const data = {owner: owner as string, repo: repo as string, issue_number: pr.number as number, body: comment as string};
        octokit.rest.issues.createComment(data);
      }
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
