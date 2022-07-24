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

function formatLabelName(thresholdName: string): string {
  return `pr-size: ${thresholdName}`
}

function computeChangeSize(prNumber: number): number {
  const additions = github.context.payload.pull_request?.additions
  const deletions = github.context.payload.pull_request?.deletions
  const changeSize = additions + deletions
  core.info(`PR #${prNumber} has ${changeSize} LoC change (${additions} additions; ${deletions} deletions)`)
  return changeSize
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

    const changeSize = computeChangeSize(prNumber)

    const client: ClientType = github.getOctokit(token)

    const owner = github.context.repo.owner
    const repo = github.context.repo.repo
    core.debug(`Get repo labels for [${owner}/${repo}]...`)
    const {data: repoLabels} = await client.rest.issues.listLabelsForRepo({
      owner: owner,
      repo: repo
    })

    const repoLabelNames = repoLabels.map((repoLabel) => {
      return repoLabel.name
    })

    const metricsData = getMetrics()
    const thresholds = metricsData.thresholds.sort((a, b) => {
      return a.threshold - b.threshold
    })

    // Create labels if needed
    let prevThresholdSize = 0
    for (const threshold of thresholds) {
      const label = formatLabelName(threshold.name)
      if (repoLabelNames.includes(label)) {
        core.info(`Label [${label}] already exists for this repo. Skipping creation.`)
        continue
      }

      const thresholdSize = threshold.threshold
      const desc = `For PRs that are considered '${threshold.name}' in size`
      const descDetail = thresholdSize == -1 ? `larger than ${thresholdSize} LoC changed` :
        `between ${prevThresholdSize} and ${thresholdSize} LoC changed, inclusive`
      const description = `${desc} (${descDetail})`

      core.info(`Creating label in [${owner}/${repo}] => ${label} : ${description}`)
      await client.rest.issues.createLabel({
        owner,
        repo,
        name: label,
        description
      })

      // Update `prevThresholdSize` for the next iteration
      prevThresholdSize = thresholdSize
    }

    // Add respective label to PR
    for (const threshold of thresholds) {
      const thresholdName = threshold.name
      const thresholdLoc = threshold.threshold
      core.debug(`${thresholdName}: ${thresholdLoc}`)
      core.debug(`changeSize <= thresholdLoc || thresholdLoc == -1 ? :${changeSize <= thresholdLoc || thresholdLoc == -1}`)
      if (changeSize <= thresholdLoc || thresholdLoc == -1) {
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