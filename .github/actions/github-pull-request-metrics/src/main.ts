import * as core from '@actions/core'
import * as github from '@actions/github'
import fetch from 'node-fetch'
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods'

const myToken = core.getInput('GITHUB_TOKEN')
const octokit = github.getOctokit(myToken)

const owner: string = github.context.repo.owner
const repo: string = github.context.repo.repo

async function closedPullRequests(repoOwner: string, repoName: string): Promise<RestEndpointMethodTypes['pulls']['list']['response']> {
  return octokit.rest.pulls.list({
    owner: repoOwner,
    repo: repoName,
    state: 'closed',
    sort: 'created'
  })
}

async function run(): Promise<void> {
  try {
    const allClosedPrs = await closedPullRequests(owner, repo)
    for (const pr of allClosedPrs.data) {
      core.debug(`PR: ${JSON.stringify(pr, null, 2)}`)

      if(pr.merged_at) {

        const merged_time = new Date(pr.merged_at)
        const creation_time = new Date(pr.created_at)
        const age = ((merged_time.getTime() - creation_time.getTime()) / (3600 * 1000)).toFixed(2)

        const comment = `Hi @${pr.user?.login}
  
Here is a summary of your pull request:

Your pull request took ${age} hours to be merged.

Beep Boop Beep,
GitHub PR Metrics Bot`

        const list_params = {owner, repo, issue_number: pr.number}
        octokit.rest.issues.listComments(list_params).then(comments => {
          const index = comments.data.findIndex(comments => comments.body?.includes("GitHub PR Metrics Bot"))
          if (index === -1) {
            const create_params = {
              owner: owner as string,
              repo: repo as string,
              issue_number: pr.number as number,
              body: comment as string
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