import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods' // eslint-disable-line import/named
import {GitHub} from '@actions/github/lib/utils'
import * as github from '@actions/github'

export async function pullRequests(
  octokit: InstanceType<typeof GitHub>,
  repoOwner: string,
  repoName: string,
  state: "open" | "all" | "closed" | undefined
): Promise<RestEndpointMethodTypes['pulls']['list']['response']> {
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