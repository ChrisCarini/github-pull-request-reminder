import * as core from '@actions/core'
import * as github from '@actions/github'
import {getMetrics, getPrNumber} from '../lib'

type ClientType = ReturnType<typeof github.getOctokit>

async function addLabels(owner: string, repo: string, client: ClientType, prNumber: number, labels: string[]): Promise<void> {
  await client.rest.issues.addLabels({
    owner,
    repo,
    issue_number: prNumber,
    labels
  })
}

function formatLabelName(thresholdName: string): string {
  return `pr-size: ${thresholdName}`
}

function computeChangeSize(prNumber: number): number {
  let additions: number = github.context.payload.pull_request?.additions
  additions ??= 0
  let deletions: number = github.context.payload.pull_request?.deletions
  deletions ??= 0
  const changeSize: number = additions + deletions
  core.info(`PR #${prNumber} has ${changeSize} LoC change (${additions} additions; ${deletions} deletions)`)
  return changeSize
}

async function run(): Promise<void> {
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
      owner,
      repo
    })

    const repoLabelNames = repoLabels.map(repoLabel => {
      return repoLabel.name
    })

    const metricsData = getMetrics()
    const thresholds = metricsData.thresholds.sort((a, b) => {
      // -1 is a marker for 'MAX' value, so sort it last.
      if (a.threshold === -1) {
        return 1
      }
      if (b.threshold === -1) {
        return -1
      }
      return a.threshold - b.threshold
    })

    // Create labels if needed
    let prevThresholdSize = 0
    for (const threshold of thresholds) {
      const label = formatLabelName(threshold.name)
      if (repoLabelNames.includes(label)) {
        core.debug(`Label [${label}] already exists for this repo. Skipping creation.`)
        continue
      }

      const thresholdSize = threshold.threshold
      const desc = `For PRs that are considered '${threshold.name}' in size`
      const descDetail = thresholdSize === -1 ? `LoC change size > ${prevThresholdSize}` : `${prevThresholdSize} <= LoC change size <= ${thresholdSize}`
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
      core.debug(`changeSize <= thresholdLoc || thresholdLoc == -1 ? :${changeSize <= thresholdLoc || thresholdLoc === -1}`)
      if (changeSize <= thresholdLoc || thresholdLoc === -1) {
        const label = formatLabelName(thresholdName)
        core.info(`Adding ${label} to PR #${prNumber} in ${owner}/${repo} and exiting.`)
        await addLabels(owner, repo, client, prNumber, [label])
        return
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()
