import * as core from '@actions/core'
import * as github from '@actions/github'
import {getMetrics, pullRequests} from '../lib'

const myToken = core.getInput('GITHUB_TOKEN')
const octokit = github.getOctokit(myToken)

const owner: string = github.context.repo.owner
const repo: string = github.context.repo.repo
const reminder_seconds = 1 * 60
const seconds_in_hour = 3600

async function run(): Promise<void> {
  const data = getMetrics()
  const crl_p50 = data.metrics['Code Review Latency'].P50.Overall

  try {
    const allOpenPrs = await pullRequests(octokit, owner, repo, 'open')
    for (const pr of allOpenPrs.data) {
      core.debug(`PR: ${JSON.stringify(pr, null, 2)}`)

      const reviewerLogins: string = pr.requested_reviewers
        ? pr.requested_reviewers
            .map(reviewer => {
              return reviewer.login
            })
            .join(', ')
        : ''

      core.info(`PR:   #${pr.number} by [${pr.user?.login}] - ${pr.title} (${pr.state})`)
      core.info(`======================================================================`)
      core.info(`Link:       ${pr.html_url}`)
      core.info(`Created at: ${pr.created_at}`)
      core.info(`Updated at: ${pr.updated_at}`)
      core.info(`Reviewers:  ${reviewerLogins}`)

      const current_time = new Date()
      const pr_creation_time = new Date(pr.created_at)
      const age_seconds = (current_time.getTime() - pr_creation_time.getTime()) / 1000
      const age_hours = age_seconds / seconds_in_hour
      const crl_hours = crl_p50 / seconds_in_hour
      let reviewer_mention = ''
      for (const login of reviewerLogins.split(', ')) {
        if (login !== '') {
          reviewer_mention += `@${login} `
        }
      }

      const commentText = `Hi ${reviewer_mention}
  
@${pr.user?.login} opened this PR ${age_hours.toFixed(2)} business hours ago, and the P50 code review latency for this MP is ${crl_hours.toFixed(
        2
      )} business hours. If you are able, review this code now to help reduce this multiproduct's Code Review Latency!

Beep Boop Beep,
GitHub PR Reminder Bot`

      core.info(`Time since creation: ${age_seconds}`)
      const list_params = {owner, repo, issue_number: pr.number}
      octokit.rest.issues.listComments(list_params).then(comments => {
        const index = comments.data.findIndex(comment => comment.body?.includes('GitHub PR Reminder Bot'))
        if (index === -1) {
          core.info(`PR #${pr.number} -- Needs reminder`)
          const withinTimeBound = age_seconds >= crl_p50 - reminder_seconds && age_seconds < crl_p50
          core.info(`Within Time Bound: ${withinTimeBound}`)
          core.info(`'age_seconds'                              : ${age_seconds}`)
          core.info(`'crl_p50'                                  : ${crl_p50}`)
          core.info(`'reminder_seconds'                         : ${reminder_seconds}`)
          core.info(`'age_seconds >= crl_p50 - reminder_seconds': ${age_seconds >= crl_p50 - reminder_seconds}`)
          core.info(`'age_seconds < crl_p50'                    : ${age_seconds < crl_p50}`)
          if (withinTimeBound) {
            //comment when time since creation is within reminder time of the p50 crl
            const create_params = {
              owner,
              repo,
              issue_number: pr.number,
              body: commentText
            }
            octokit.rest.issues.createComment(create_params)
          }
        }
      })
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
