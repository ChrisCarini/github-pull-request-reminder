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
            const ourThing = document.createElement("div");
            ourThing.innerHTML += `<h4><b>p50/p90 (Biz Hours)</b></h4></br></div>`;

            // TODO: Do some stuff with the metrics...
            for (const [metricName, stats] of Object.entries(metrics)) {
                debug(`Metric Name: ${metricName}`);
                debug(`Metric Stats:`);
                ourThing.innerHTML += `<i>${metricName}:: </i>`;
                for (const [statName, statValue] of Object.entries(stats)) {
                    debug(`---> ${statName}: ${statValue['Overall']}`);
                    ourThing.innerHTML += `<span>${(statValue['Overall']/3600).toFixed(2)}</span>`;
                    if(statName !== 'P90') {
                       ourThing.innerHTML += `<span></span>/`;
                    }
                }
                ourThing.innerHTML += `</br>`;
                for (const [statName, statValue] of Object.entries(stats)) {
                    ourThing.innerHTML += `<details>
                      <summary>${statName} Details</summary>
                      <table>
                        <tr><th>Size</th><th>Biz Hrs</th></tr>
                        <tr><td style='color:MediumSeaGreen;'>Small</td><th>${(statValue['Small']/3600).toFixed(2)}</th></tr>
                        <tr><td style='color:DodgerBlue;'>Medium</td><th>${(statValue['Medium']/3600).toFixed(2)}</th></tr>
                        <tr><td style='color:Orange;'>Large</td><th>${(statValue['Large']/3600).toFixed(2)}</th></tr>
                        <tr><td style='color:Tomato;'>XL</td><th>${(statValue['X-Large']/3600).toFixed(2)}</th></tr>
                      </table>
                    </details>`;
                }
                ourThing.innerHTML += `</br>`;
            }
            var theirThing = document.getElementById("partial-discussion-sidebar");
            if (typeof theirThing === "undefined" || (typeof theirThing === "object" && theirThing === null)) {
                theirThing = document.getElementsByClassName("BorderGrid--spacious")[0];
            }
            theirThing.prepend(ourThing)
        }
    });

    console.log("GitHub PR Stats completed.");
}

window.addEventListener("load", loadDeveloperInsights);
