// ==UserScript==
// @name         GitHub PR Stats
// @namespace    https://chriscarini.com
// @version      0.0.2
// @description  Augment GitHub PRs with nice statistics.
// @author       Chris Carini & Sulabh Bansal
// @match        https://*.ghe.com/*/pull/*
// @match        https://github.com/*/pull/*
// @match        https://github.com/*
// @match        https://*.ghe.com/*
// @grant        GM_xmlhttpRequest
// @connect      https://chriscarini.com/developer_insights/data.json
// @connect      chriscarini.com
// @connect      https://developer-productivity-insights.stg.corp.linkedin.com/api/v1/hack_projects/code_review/stats
// @connect      developer-productivity-insights.stg.corp.linkedin.com
// @connect      https://developer-productivity-insights.corp.linkedin.com/api/v1/hack_projects/code_review/stats
// @connect      developer-productivity-insights.corp.linkedin.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.8.0/chart.min.js
// @updateURL https://raw.githubusercontent.com/ChrisCarini/github-pull-request-reminder/main/github-pr-stats.user.js
// @downloadURL https://raw.githubusercontent.com/ChrisCarini/github-pull-request-reminder/main/github-pr-stats.user.js
// ==/UserScript==


// True prints more debug information in the console; False prints minimal things in the console log.
const DEBUG = true

// The base URL for which to fetch data
const BASE_DATA_URL = `https://chriscarini.com/developer_insights/data.json?t=${Date.now()}`;

// Nice colors we'll use later
const LIGHT_GREY = 'rgb(128, 128, 128, 0.4)'
const DARK_GREY = 'rgb(128, 128, 128, 1.0)'
const LIGHT_GREEN = 'rgba(60, 179, 113, 0.4)'
const DARK_GREEN = 'rgba(60, 179, 113, 1.0)'
const LIGHT_BLUE = 'rgba(30, 144, 255, 0.4)'
const DARK_BLUE = 'rgba(30, 144, 255, 1.0)'
const LIGHT_ORANGE = 'rgba(255, 165, 0, 0.4)'
const DARK_ORANGE = 'rgba(255, 165, 0, 1.0)'
const LIGHT_RED = 'rgba(255, 99, 71, 0.4)'
const DARK_RED = 'rgba(255, 99, 71, 1.0)'

const debug = (msg) => {
  if (DEBUG) {
    console.log(msg)
  }
}
const toHrs = (num) => (num / 3600).toFixed(2)
const txt_c = () => 'text-align: center;'

const GITHUB_STATS_MARKER = 'GITHUB_STATS_MARKER'

function get_project_name() {
  const og_url = document.querySelectorAll('[property="og:url"]')[0].content
  let og_url_parts = og_url.split('/')

  let repo_name_loc

  // 7 parts means it is a PR page
  if (og_url_parts.length === 7) {
    repo_name_loc = -3
  }
  // 5 parts means it is the repo/projects main page
  else if (og_url_parts.length === 5) {
    repo_name_loc = -1
  }
  // If it is something else; we have no idea so just exit.
  else {
    console.log(`meta tag for og:url had [${og_url_parts.length}] parts; this is != 5 or 7, so we don't know if repo or PR page. Exiting.`)
    console.log(og_url)
    console.log(og_url_parts)
    return
  }

  return og_url_parts.at(repo_name_loc)
}

function loadDeveloperInsights() {
  'use strict'

  console.log('GitHub PR Stats starting...')

  // Check if marker exists, if so, exit.
  const marker = document.querySelectorAll(`#${GITHUB_STATS_MARKER}`)
  if (marker.length !== 0) {
    console.log(`GitHub Stats already exists on page. Exiting.`)
    return
  }

  const project = get_project_name()

  const request_url = `${BASE_DATA_URL}?t=${Date.now()}&project=${project}`

  debug(`REQUEST URL FOR PROJECT [${project}]: ${request_url}`)
  GM_xmlhttpRequest({
    method: 'GET', url: request_url, onload: function(result) {
      const data = JSON.parse(result.responseText)
      debug(data)

      const metrics = data.metrics
      debug(metrics)
      if (Object.keys(metrics).length === 0) {
        debug(`There are no keys in the 'metrics' object of the API call - exiting.`)
        return
      }

      // Create element for us to use
      let ourHtml = `<h4 style='padding-bottom: 10px;'><b>Code Review Metrics (biz hrs)</b></h4></div>`
      let yValuesHashMapP50 = new Map()
      let yValuesHashMapP90 = new Map()
      let overviewP50HashMap = new Map()
      let overviewP90HashMap = new Map()

      // TODO: Do some stuff with the metrics...
      Object.entries(metrics).forEach(([metricName, stats], index) => {
        const yValuesP50 = []
        const yValuesP90 = []
        debug(`Metric Name: ${metricName}`)
        debug(`Metric Stats:`)

        // Add custom styling to fake the details arrow; we need this,
        // because without it, we can not have a div be on the same line
        // as the arrow when using `inline` style, which is the default
        // for details/summary
        ourHtml += `<style>
        details.githubPrStats > summary:before {
          content: "▶"
        }
        details.githubPrStats[open] > summary:before {
          content: "▼"
        }
        </style>`

        // Build the HTML we are going to swap in
        ourHtml += `<div class='Box' style='margin-bottom: 10px;'><details>`
        ourHtml += `<summary class='Box-header' style='padding: 10px; display: flex;'>
          <div style='display:flex; justify-content: space-between; width: 100%; padding-left: 5px'><b>${metricName}</b>P50: ${toHrs(stats['P50']['Overall'])}</div>
        </summary>`

        // Add the Overall P50 & P90 horizontal bar chart
        ourHtml += `<canvas style='padding:5px;' id='chart_overview_${index}' style='width:90%;'></canvas>`

        ourHtml += `<details class="githubPrStats" style='padding-left:10px; padding-top: 5px; padding-bottom: 5px;'><summary style='display: flex;'><i style='padding-left: 5px'>Code Size Breakdown</i></summary>
          <canvas style='padding:5px;' id='chart_detail_${index}' style='width:90%;'></canvas>
          <table style='padding: 5px; margin: 10px; width: 90%;'>
            <tr style='${txt_c()} background-color: var(--color-bg-tertiary);'><th>P50</th><th>Size</th><th>P90</th></tr>
            <tr style='${txt_c()}'><td>${toHrs(stats['P50']['Small'])}</td><th style='color:${DARK_GREEN};'>Small</th><td>${toHrs(stats['P90']['Small'])}</td></tr>
            <tr style='${txt_c()}'><td>${toHrs(stats['P50']['Medium'])}</td><th style='color:${DARK_BLUE};'>Medium</th><td>${toHrs(stats['P90']['Medium'])}</td></tr>
            <tr style='${txt_c()}'><td>${toHrs(stats['P50']['Large'])}</td><th style='color:${DARK_ORANGE};'>Large</th><td>${toHrs(stats['P90']['Large'])}</td></tr>
            <tr style='${txt_c()}'><td>${toHrs(stats['P50']['X-Large'])}</td><th style='color:${DARK_RED};'>XL</th><td>${toHrs(stats['P90']['X-Large'])}</td></tr>
          </table><a href='https://tableau.linkedin.biz/#/views/GitHubInsights/CodeCollab?Repository=${project}'>See detailed dashboard</a></details></details></div>`

        // Add data to array for
        yValuesP50.push(toHrs(stats['P50']['Small']))
        yValuesP50.push(toHrs(stats['P50']['Medium']))
        yValuesP50.push(toHrs(stats['P50']['Large']))
        yValuesP50.push(toHrs(stats['P50']['X-Large']))
        yValuesHashMapP50.set(index, yValuesP50)
        overviewP50HashMap.set(index, toHrs(stats['P50']['Overall']))

        yValuesP90.push(toHrs(stats['P90']['Small']))
        yValuesP90.push(toHrs(stats['P90']['Medium']))
        yValuesP90.push(toHrs(stats['P90']['Large']))
        yValuesP90.push(toHrs(stats['P90']['X-Large']))
        yValuesHashMapP90.set(index, yValuesP90)
        overviewP90HashMap.set(index, toHrs(stats['P90']['Overall']))
      })

      // Add a marker element intended for checking if GitHub Stats is shown...
      ourHtml += `<div id='${GITHUB_STATS_MARKER}'></div>`

      // Add our element into the GitHub DOM
      let theirThing = document.getElementById('partial-discussion-sidebar')
      if (typeof theirThing === 'undefined' || (typeof theirThing === 'object' && theirThing === null)) {
        theirThing = document.getElementsByClassName('BorderGrid--spacious')[0]
      }
      const ourThing = document.createElement('div')
      ourThing.innerHTML = ourHtml
      theirThing.prepend(ourThing)

      // Grab the default click handler for the legend; we'll use it later.
      const defaultLegendClickHandler = Chart.defaults.plugins.legend.onClick

      // Render out the charts
      for (let j = 0; j < 3; j++) {
        const overviewChart = new Chart(document.getElementById(`chart_overview_${j}`).getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['P50', 'P90'],
            datasets: [
              {
                data: [overviewP50HashMap.get(j), overviewP90HashMap.get(j)],
                backgroundColor: DARK_BLUE
              }
            ]
          },
          options: {
            barThickness: 15,
            scales: {
              xAxes: {
                title: {
                  display: true,
                  text: 'Business Hours'
                }
              }
            },
            indexAxis: 'y',
            responsive: true,
            plugins: {
              legend: {
                display: false
              },
              title: {
                display: false,
                text: 'Chart.js Horizontal Bar Chart'
              }
            }
          }
        })
        const detailChart = new Chart(document.getElementById(`chart_detail_${j}`).getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['S', 'M', 'L', 'XL'],
            datasets: [
              {
                backgroundColor: [LIGHT_GREEN, LIGHT_BLUE, LIGHT_ORANGE, LIGHT_RED],
                data: [yValuesHashMapP50.get(j)[0], yValuesHashMapP50.get(j)[1], yValuesHashMapP50.get(j)[2], yValuesHashMapP50.get(j)[3]],
                label: 'P50',
                yAxisID: 'P50'
              },
              {
                backgroundColor: [DARK_GREEN, DARK_BLUE, DARK_ORANGE, DARK_RED],
                data: [yValuesHashMapP90.get(j)[0], yValuesHashMapP90.get(j)[1], yValuesHashMapP90.get(j)[2], yValuesHashMapP90.get(j)[3]],
                label: 'P90',
                yAxisID: 'P90'
              }
            ]
          },
          options: {
            plugins: {
              legend: {
                onClick: (event, legendItem, legend) => {
                  debug(legend)
                  debug(legendItem)

                  // Do the usual stuff first
                  defaultLegendClickHandler(event, legendItem, legend)

                  // Turn off the axis
                  legend.chart.options.scales[legendItem.text].display = !legend.chart.options.scales[legendItem.text].display

                  // force update
                  legend.chart.update()

                  // Reset the grey colors
                  legend.legendItems[0].fillStyle = LIGHT_GREY
                  legend.legendItems[1].fillStyle = DARK_GREY
                }
              }
            },
            responsive: true,
            scales: {
              'P50': {
                display: true,
                type: 'linear',
                position: 'left'
              },
              'P90': {
                display: true,
                type: 'linear',
                position: 'right',
                // grid line settings
                grid: {
                  drawOnChartArea: false // only want the grid lines for one axis to show up
                }
              }
            },
            skipNull: true,
            barValueSpacing: 20,
            title: {
              display: true,
              text: ''
            }
          }
        })

        // Change the legend colors to be grey, since each 'code size' is a different color
        detailChart.legend.legendItems[0].fillStyle = LIGHT_GREY
        detailChart.legend.legendItems[1].fillStyle = DARK_GREY
      }
    }
  })

  console.log('GitHub PR Stats completed.')
}


function firstLoad() {
  setTimeout(function() {
    console.log('Adding mutation observer...')
    const callback = function(mutationList, observer) {
      console.log('MUTATIONS FOUND!!!!')
      loadDeveloperInsights()
    }
    // GitHub.com - PR page - sidebar
    //      *AND*
    // GitHub.com - Repo Page
    let target = document.querySelectorAll('.Layout-sidebar')
    if (target.length === 0) {
      // GHE.com  - PR page - sidebar + 'conversations' area
      target = document.querySelectorAll('#discussion_bucket')
    }
    if (target.length === 0) {
      // GHE.com - Repo Page
      target = document.querySelectorAll('#repo-content-pjax-container')
    }
    console.log(target)
    new MutationObserver(callback).observe(target[0], {attributes: true, childList: true, subtree: true})
  }, 2000) // How long you want the delay to be, measured in milliseconds.

  loadDeveloperInsights()
  console.log(' ######################### END -----------------------------')
}

window.addEventListener('load', firstLoad)
