import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods'
import {GitHub} from '@actions/github/lib/utils'

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
    sort: 'created'
  })
}