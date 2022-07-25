import * as core from '@actions/core'
import * as github from '@actions/github'
import {getMetrics, getPrNumber, Metrics} from '../lib'
import {components} from '@octokit/openapi-types'
import fetch from 'node-fetch'

type ClientType = ReturnType<typeof github.getOctokit>;

const myToken = core.getInput('GITHUB_TOKEN')
const octokit: ClientType = github.getOctokit(myToken)

const owner: string = github.context.repo.owner
const repo: string = github.context.repo.repo

const data = getMetrics()

function computeDeltaInHours(compareTime: string, creationTime: string): number {
  const compare_time = new Date(compareTime)
  const creation_time = new Date(creationTime)
  const age_seconds = (compare_time.getTime() - creation_time.getTime()) / 1000
  return age_seconds / 3600
}

function generateCommentText(metricName: keyof Metrics, action: string, compareTime: string, creationTime: string): string {
  const compare_time = new Date(compareTime)
  const creation_time = new Date(creationTime)
  const age_seconds = (compare_time.getTime() - creation_time.getTime()) / 1000
  const age = age_seconds / 3600
  const metricP50Overall = data.metrics[metricName].P50.Overall
  const percent_diff = (100 * Math.abs((age_seconds - metricP50Overall) / metricP50Overall)).toFixed(2)
  const direction = age_seconds > metricP50Overall ? 'higher' : 'lower'
  return `<details open>
<summary><b>${metricName}</b></summary>
Your pull request took <b>${age.toFixed(2)}</b> hours to be ${action}. This is ${percent_diff}% <b>${direction}</b> than the P50 ${metricName} (currently ${(metricP50Overall / 3600).toFixed(2)} hours) for this project.
</details>`
}

function findSortedApprovals(prReviews: components['schemas']['pull-request-review'][]): components['schemas']['pull-request-review'][] {
  return prReviews
    .filter(review => review.state === 'APPROVED')
    .sort((a, b) => {
      if (!a || !a?.submitted_at) {
        return -1
      }
      if (!b || !b?.submitted_at) {
        return 1
      }

      return (new Date(a?.submitted_at)).getTime() - (new Date(b?.submitted_at)).getTime()
    })
}

function generateInfoTable(
  pr: components['schemas']['pull-request'],
  prComments: components['schemas']['issue-comment'][],
  prReviews: components['schemas']['pull-request-review'][]
): string {
  const firstComment = prComments
    .sort((a, b) => {
      if (!a || !a?.created_at) {
        return -1
      }
      if (!a || !b?.created_at) {
        return 1
      }

      return (new Date(a?.created_at)).getTime() - (new Date(b?.created_at)).getTime()
    })[0]
  const prApprovals = findSortedApprovals(prReviews)
  const firstApproval = prApprovals[0]

  const collaborators = new Set([
    ...prComments.map(value => value?.user?.login),
    ...prReviews.map(value => value?.user?.login)
  ])

  return `<details>
<summary><h4>PR Recap</h4></summary>
<table>
<tr><th>Opened at</th><td>${pr?.created_at}</td></tr>
<tr><th># of comments</th><td>${prComments.length}</td></tr>
<tr><th>First comment at</th><td>${firstComment?.created_at} <i>(by ${firstComment?.user?.login})</i></td></tr>
<tr><th># of Approvals</th><td>${prApprovals.length}</td></tr>
<tr><th>First Approval at</th><td>${firstApproval.submitted_at} <i>(by ${firstApproval?.user?.login})</i></td></tr>
<tr><th>Merged at</th><td>${pr.merged_at}</td></tr>
<tr><th># of collaborators</th><td>${collaborators.size}</td></tr>
</table>
</details>`
}

async function run(): Promise<void> {
  try {
    const prNumber = getPrNumber()

    if (!prNumber) {
      core.error('Could not get pull request number from context, exiting')
      return
    }

    core.info(`PR #${prNumber} - Get PR Info...`)
    const {data: pr}: {data: components['schemas']['pull-request']} = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    })

    core.info(`PR #${prNumber} - Processing...`)
    if (!pr.merged_at) {
      core.info(`PR #${prNumber} does not have 'merged_at' set; closed no merge. Continuing to next PR...`)
      return
    }

    const {data: prComments}: {data: components['schemas']['issue-comment'][]} = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    })
    core.debug(`PR #${prNumber} - Comments: ${JSON.stringify(prComments, null, 2)}`)
    const index = prComments.findIndex(comment => comment.body?.includes('GitHub PR Metrics Bot'))
    if (index !== -1) {
      core.info(`PR #${prNumber} already has a comment from GitHub PR Metrics Bot. Continuing to next PR...`)
      return
    }

    core.info(`PR #${prNumber} - Generating comment text...`)

    const merge_blurb = generateCommentText('Time to Merge', 'merged', pr.merged_at, pr.created_at)

    // Identify if the PR was approved, and if so, generate text for associated approval information.
    const {data: prReviews}: {data: components['schemas']['pull-request-review'][]} = await octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: prNumber
    })
    core.debug(`PR #${prNumber} - Reviews: ${JSON.stringify(prReviews, null, 2)}`)
    const approve = prReviews.find(review => review.state === 'APPROVED')
    const approve_blurb = !(approve && approve.submitted_at) ? '' :
      generateCommentText('Time to Approval', 'approved', approve.submitted_at, pr.created_at)

    const commentText = `Hi @${pr.user?.login}

Here is a summary of your pull request:

${merge_blurb}

${approve_blurb}

${generateInfoTable(pr, prComments, prReviews)}

Beep Boop Beep,
GitHub PR Metrics Bot`

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentText
    })

    const slackWebhook = core.getInput('SLACK_WEBHOOK')
    core.info(`SLACK WEBHOOK: ${slackWebhook}`)
    if (slackWebhook) {
      let login = pr.user?.login
      // REMAP FOR DEMO ONLY - testing on GH.com
      if (login === 'ChrisCarini') {
        login = 'ccarini'
      }
      if (login === 'am19') {
        login = 'ankumehta'
      }
      if (login === 'bansalsulabh') {
        login = 'subansal'
      }
      const msg = JSON.stringify({
        'repo_name': repo,
        'pr_number': `${pr.number}`,
        'time_to_merge': `${computeDeltaInHours(pr.merged_at, pr.created_at).toFixed(2)} hours`,
        'time_to_approval': !(approve && approve.submitted_at) ? 'not approved' : `${computeDeltaInHours(approve.submitted_at, pr.created_at).toFixed(2)} hours`,
        'pr_author': `${login}@linkedin.com`,
        'pr_link': `${pr.html_url}`
      })
      core.info(`SLACK WEBHOOK MSG: ${msg}`)
      const response = await fetch(slackWebhook, {
        method: 'POST',
        body: msg,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
      /*
URL: https://hooks.slack.com/workflows/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
{
  "repo_name": "Example text",
  "pr_number": "Example text",
  "time_to_merge": "Example text",
  "time_to_approval": "Example text",
  "pr_author": "example@example.com"
}
       */
    }

  } catch
    (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
