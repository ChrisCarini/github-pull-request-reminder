import {GitHub} from '@actions/github/lib/utils'
import * as github from '@actions/github'

type OctokitType = InstanceType<typeof GitHub>

export async function pullRequests(
  octokit: OctokitType,
  repoOwner: string,
  repoName: string,
  state: "open" | "all" | "closed" | undefined
): Promise<Awaited<ReturnType<OctokitType['rest']['pulls']['list']>>> {
  return octokit.rest.pulls.list({
    owner: repoOwner,
    repo: repoName,
    state,
    sort: 'created',
    direction: 'desc'
  })
}

export function getPrNumber(): number | undefined {
  const pullRequest = github.context.payload.pull_request
  if (!pullRequest) {
    return undefined
  }

  return pullRequest.number
}