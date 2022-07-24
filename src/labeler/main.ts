import * as core from '@actions/core'
import * as github from '@actions/github'
import {getMetrics} from '../lib'

type ClientType = ReturnType<typeof github.getOctokit>;

function getPrNumber(): number | undefined {
  core.info(JSON.stringify(github.context.payload))
  const pullRequest = github.context.payload.pull_request
  if (!pullRequest) {
    return undefined
  }

  return pullRequest.number
}

async function addLabels(
  client: ClientType,
  prNumber: number,
  labels: string[]
) {
  await client.rest.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels
  })
}

async function run() {
  try {
    const token = core.getInput('GITHUB_TOKEN', {required: true})

    core.info('Getting PR number from context...')

    const prNumber = getPrNumber()
    if (!prNumber) {
      core.error('Could not get pull request number from context, exiting')
      return
    }

    const client: ClientType = github.getOctokit(token)

    const owner = github.context.repo.owner
    const repo = github.context.repo.repo
    core.info(`Get repo labels for [ ${owner} / ${repo} ]...`)
    const repoLabels = client.rest.issues.listLabelsForRepo({
      owner: owner,
      repo: repo
    })
    core.info('Labels:')
    core.info(JSON.stringify(repoLabels))
    return

    // const {data: pullRequest} = await client.rest.pulls.get({
    //   owner: github.context.repo.owner,
    //   repo: github.context.repo.repo,
    //   pull_number: prNumber
    // })
    //
    // const additions = pullRequest.additions
    // const deletions = pullRequest.deletions
    // const changeSize = additions + deletions
    // core.info(`PR #${prNumber} has ${changeSize} LoC change (${additions} additions; ${deletions} deletions)`)
    //
    // const metricsData = getMetrics()
    //
    // for (const threshold of metricsData.thresholds) {
    //   const thresholdName = threshold.name
    //   const thresholdLoc = threshold.threshold
    //   core.debug(`${thresholdName}: ${thresholdLoc}`)
    //   core.debug(`changeSize <= thresholdLoc ? :${changeSize <= thresholdLoc}`)
    //   if (changeSize <= thresholdLoc) {
    //     const label = `pr-size: ${thresholdName}`
    //     core.info(`Adding ${label} to PR #${prNumber} and exiting.`)
    //     await addLabels(client, prNumber, [label])
    //     return
    //   }
    // }
  } catch (error: any) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()