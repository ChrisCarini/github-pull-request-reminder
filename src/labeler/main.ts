import * as core from '@actions/core'
import * as github from '@actions/github'
import {getMetrics} from '../lib'

type ClientType = ReturnType<typeof github.getOctokit>;

function getPrNumber(): number | undefined {
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

function formatLabelName(thresholdName: string) {
  return `pr-size: ${thresholdName}`
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

    const additions = github.context.payload.pull_request?.additions
    const deletions = github.context.payload.pull_request?.deletions
    const changeSize = additions + deletions
    core.info(`PR #${prNumber} has ${changeSize} LoC change (${additions} additions; ${deletions} deletions)`)

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


    const metricsData = getMetrics()

    core.info('metricsData:')
    core.info(JSON.stringify(metricsData))
    core.info('metricsData.thresholds:')
    core.info(JSON.stringify(metricsData.thresholds))

    // Create labels if needed
    for (const threshold of metricsData.thresholds) {
      const label = formatLabelName(threshold.name)
      // if (repoLabels.includes(label)) {
      //   core.info(`Label [${label}] already exists for this repo. Skipping creation.`)
      // }
      core.info(`Creating label in [ ${owner} / ${repo} ]: ${label}`)
      await client.rest.issues.createLabel({
        owner,
        repo,
        name: label
      })
    }

    for (const threshold of metricsData.thresholds) {
      const thresholdName = threshold.name
      const thresholdLoc = threshold.threshold
      core.debug(`${thresholdName}: ${thresholdLoc}`)
      core.debug(`changeSize <= thresholdLoc ? :${changeSize <= thresholdLoc}`)
      if (changeSize <= thresholdLoc) {
        const label = formatLabelName(thresholdName)
        core.info(`Adding ${label} to PR #${prNumber} and exiting.`)
        await addLabels(client, prNumber as number, [label])
        return
      }
    }
  } catch (error: any) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()