import * as core from '@actions/core'
import * as github from '@actions/github'
import {wait} from './wait'

const myToken = core.getInput('myToken')
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

async function run(): Promise<void> {
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
      core.info(`Reviewers:  ${reviewerLogins}`)
    })
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
