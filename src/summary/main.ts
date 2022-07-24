import * as core from '@actions/core'
import * as github from '@actions/github'
import {getMetrics, pullRequests} from '../lib'

type ClientType = ReturnType<typeof github.getOctokit>;

const myToken = core.getInput('GITHUB_TOKEN')
const octokit: ClientType = github.getOctokit(myToken)

const owner: string = github.context.repo.owner
const repo: string = github.context.repo.repo

async function run(): Promise<void> {
  try {
    const allClosedPrs = await pullRequests(octokit, owner, repo, 'closed')
    for (const pr of allClosedPrs.data) {
      core.debug(`PR: ${JSON.stringify(pr, null, 2)}`)

      if (pr.merged_at) {
        const merged_time = new Date(pr.merged_at)
        const creation_time = new Date(pr.created_at)
        const age_seconds = (merged_time.getTime() - creation_time.getTime()) / 1000
        const age = age_seconds / 3600
        const data = getMetrics()
        const ttm_p50 = data.metrics['Time to Merge'].P50.Overall
        const tta_p50 = data.metrics['Time to Approval'].P50.Overall
        const merge_percent_diff = (100 * Math.abs((age_seconds - ttm_p50) / ttm_p50)).toFixed(2)
        const merge_dir = age_seconds > ttm_p50 ? 'higher' : 'lower'

        let approve_blurb = ""

        const review_params = {owner, repo, pull_number: pr.number}
        octokit.rest.pulls.listReviews(review_params).then(reviews => {
          core.info(`Reviews: ${reviews}`)
          const approve = reviews.data.find(review => review.state === "APPROVED")
          if(approve && approve.submitted_at) {
            const approve_time = new Date(approve.submitted_at)
            const approve_age_seconds = (approve_time.getTime() - creation_time.getTime()) / 1000
            const approve_age = approve_age_seconds / 3600
            const approve_percent_diff = (100 * Math.abs((approve_age_seconds - tta_p50) / tta_p50)).toFixed(2)
            const approve_dir = approve_age_seconds > tta_p50 ? 'higher' : 'lower'
            approve_blurb = `Your pull request took ${approve_age.toFixed(2)} hours to be merged. This is ${approve_percent_diff}% ${approve_dir} than the P50 Time to Approval for this multiproduct.`
          }
        })
        const commentText = `Hi @${pr.user?.login}
  
Here is a summary of your pull request:

<details open>
<summary>Time to Merge</summary>
Your pull request took ${age.toFixed(2)} hours to be merged. This is ${merge_percent_diff}% ${merge_dir} than the P50 Time to Merge for this multiproduct.
</details
<details open>
<summary>Time to Approval</summary>
${approve_blurb}
</details

Beep Boop Beep,
GitHub PR Metrics Bot`

        const list_params = {owner, repo, issue_number: pr.number}
        octokit.rest.issues.listComments(list_params).then(comments => {
          const index = comments.data.findIndex(comment => comment.body?.includes('GitHub PR Metrics Bot'))
          if (index === -1) {
            const create_params = {
              owner,
              repo,
              issue_number: pr.number,
              body: commentText
            }
            octokit.rest.issues.createComment(create_params)
          }
        })
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
