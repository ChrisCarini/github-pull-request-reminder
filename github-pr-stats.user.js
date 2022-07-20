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
// @updateURL https://raw.githubusercontent.com/ChrisCarini/github-pull-request-reminder/main/github-pr-stats.user.js
// @downloadURL https://raw.githubusercontent.com/ChrisCarini/github-pull-request-reminder/main/github-pr-stats.user.js
// ==/UserScript==


// True prints more debug information in the console; False prints minimal things in the console log.
const DEBUG = true;

// The base URL for which to fetch data
const BASE_DATA_URL1 = `https://chriscarini.com/developer_insights/data.json?t=${Date.now()}`;

function debug(msg) {
    if (DEBUG) {
        console.log(msg);
    }
}

function toHrs(num) {
    return (num / 3600).toFixed(2)
}

function loadDeveloperInsights() {
    'use strict';

    console.log("GitHub PR Stats starting...");

    debug("REQUEST URL: " + BASE_DATA_URL1);
    GM_xmlhttpRequest({
        method: "GET", url: BASE_DATA_URL1, onload: function (result) {
            const data = JSON.parse(result.responseText);
            debug(data);

            const metrics = data.metrics;
            debug(metrics);

            // Create element for us to use
            let ourHtml = `<h4><b>Code Review Metrics (biz hrs)</b></h4></div>`

            // TODO: Do some stuff with the metrics...
            for (const [metricName, stats] of Object.entries(metrics)) {
                debug(`Metric Name: ${metricName}`);
                debug(`Metric Stats:`);
                ourHtml += `<div style="display: flex; justify-content: space-between;"><b>${metricName}:</b>`;
                for (const [statName, statValue] of Object.entries(stats)) {
                    debug(`---> ${statName}: ${statValue['Overall']}`);
                    ourHtml += `<div>${statName}: ${toHrs(statValue['Overall'])}</div>`;
                }
                ourHtml += `</div>`;
                ourHtml += `<details><summary><i>Code Size Breakdown</i></summary>
                  <table style='padding: 10px; margin: 10px; width: 95%;'>
                    <tr style="background-color: var(--color-canvas-subtle);"><th>Size</th><th>P50 Biz Hrs</th><th>P90 Biz Hrs</th></tr>
                    <tr><td style='text-align: center; color:MediumSeaGreen;'>Small</td><th>${toHrs(stats['P50']['Small'])}</th><th>${toHrs(stats['P90']['Small'])}</th></tr>
                    <tr><td style='text-align: center; color:DodgerBlue;'>Medium</td><th>${toHrs(stats['P50']['Medium'])}</th><th>${toHrs(stats['P90']['Medium'])}</th></tr>
                    <tr><td style='text-align: center; color:Orange;'>Large</td><th>${toHrs(stats['P50']['Large'])}</th><th>${toHrs(stats['P90']['Large'])}</th></tr>
                    <tr><td style='text-align: center; color:Tomato;'>XL</td><th>${toHrs(stats['P50']['X-Large'])}</th><th>${toHrs(stats['P90']['X-Large'])}</th></tr>
                  </table></details>`;
                ourHtml += `</br>`;
            }
            let theirThing = document.getElementById("partial-discussion-sidebar");
            if (typeof theirThing === "undefined" || (typeof theirThing === "object" && theirThing === null)) {
                theirThing = document.getElementsByClassName("BorderGrid--spacious")[0];
            }

            const ourThing = document.createElement("div");
            ourThing.innerHTML = ourHtml

            theirThing.prepend(ourThing)
        }
    });

    console.log("GitHub PR Stats completed.");
}

window.addEventListener("load", loadDeveloperInsights);
