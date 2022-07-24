import * as core from '@actions/core'
import * as github from '@actions/github'
import {getMetrics, Metrics, pullRequests} from '../lib'

type ClientType = ReturnType<typeof github.getOctokit>;

const myToken = core.getInput('GITHUB_TOKEN')
const octokit: ClientType = github.getOctokit(myToken)

const owner: string = github.context.repo.owner
const repo: string = github.context.repo.repo

const data = getMetrics()

function generateCommentText(metricName: keyof Metrics, action: string, compareTime: string, creationTime: string): string {
  const compare_time = new Date(compareTime)
  const creation_time = new Date(creationTime)
  const age_seconds = (compare_time.getTime() - creation_time.getTime()) / 1000
  const age = age_seconds / 3600
  const metricP50Overall = data.metrics[metricName].P50.Overall
  const percent_diff = (100 * Math.abs((age_seconds - metricP50Overall) / metricP50Overall)).toFixed(2)
  const direction = age_seconds > metricP50Overall ? 'higher' : 'lower'
  return `<details open>
<summary>${metricName}</summary>
Your pull request took ${age.toFixed(2)} hours to be ${action}. This is ${percent_diff}% ${direction} than the P50 ${metricName} for this project.
</details>`
}

async function run(): Promise<void> {
  try {
    const allClosedPrs = await pullRequests(octokit, owner, repo, 'closed')
    for (const pr of allClosedPrs.data) {
      core.info(`PR #${pr.number} - Processing...`)
      core.debug(`PR: ${JSON.stringify(pr, null, 2)}`)

      if (!pr.merged_at) {
        core.info(`PR #${pr.number} does not have 'merged_at' set; closed no merge. Continuing to next PR...`)
        continue
      }

      const {data: prComments} = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pr.number
      })
      core.debug(`PR #${pr.number} - Comments: ${JSON.stringify(prComments, null, 2)}`)
      const index = prComments.findIndex(comment => comment.body?.includes('GitHub PR Metrics Bot'))
      if (index !== -1) {
        core.info(`PR #${pr.number} already has a comment from GitHub PR Metrics Bot. Continuing to next PR...`)
        continue
      }

      core.info(`PR #${pr.number} - Generating comment text...`)

      const merge_blurb = generateCommentText('Time to Merge', 'merged', pr.merged_at, pr.created_at)

      // Identify if the PR was approved, and if so, generate text for associated approval information.
      const {data: prReviews} = await octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: pr.number
      })
      core.debug(`PR #${pr.number} - Reviews: ${JSON.stringify(prReviews, null, 2)}`)
      const approve = prReviews.find(review => review.state === 'APPROVED')
      const approve_blurb = !(approve && approve.submitted_at) ? '' :
        generateCommentText('Time to Approval', 'approved', approve.submitted_at, pr.created_at)

      const commentText = `Hi @${pr.user?.login}

Here is a summary of your pull request:

${merge_blurb}

${approve_blurb}

Beep Boop Beep,
GitHub PR Metrics Bot`

      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pr.number,
        body: commentText
      })
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
