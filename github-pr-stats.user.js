// ==UserScript==
// @name         GitHub PR Stats
// @namespace    https://chriscarini.com
// @version      0.0.1
// @description  Augment GitHub PRs with nice statistics.
// @author       Chris Carini & Sulabh Bansal
// @match        https://*.ghe.com/*/pull/*
// @match        https://github.com/*/pull/*
// @grant        GM_xmlhttpRequest
// @connect      https://chriscarini.com/developer_insights/data.json
// @connect      chriscarini.com
// @updateURL https://raw.githubusercontent.com/ChrisCarini/github-pull-request-reminder/main/github-pr-stats.user.js
// @downloadURL https://raw.githubusercontent.com/ChrisCarini/github-pull-request-reminder/main/github-pr-stats.user.js
// ==/UserScript==

(function () {
    'use strict';

    // True prints more debug information in the console; False prints minimal things in the console log.
    const DEBUG = true;

    // The base URL for which to fetch data
    const BASE_DATA_URL = "https://chriscarini.com/developer_insights/data.json";

    console.log("GitHub PR Stats starting...");

    function debug(msg) {
        if (DEBUG) {
            console.log(msg);
        }
    }

    debug("REQUEST URL: " + BASE_DATA_URL);
    GM_xmlhttpRequest({
        method: "GET", url: BASE_DATA_URL, onload: function (result) {
            const data = JSON.parse(result.responseText);
            debug(data);

            const metrics = data.metrics;
            debug(metrics);

            // Create element for us to use
            const ourThing = document.createElement("div");

            // TODO: Do some stuff with the metrics...
            for (const [metricName, stats] of Object.entries(metrics)) {
                debug(`Metric Name: ${metricName}`);
                ourThing.innerHTML += `<hr/><div class="text-bold discussion-sidebar-heading discussion-sidebar-toggle hx_rsm-trigger">Metric Name: ${metricName}</div><br/>`;

                debug(`Metric Stats:`);
                for (const [statName, statValue] of Object.entries(stats)) {
                    debug(`---> ${statName}: ${statValue}`);
                    ourThing.innerHTML += `<span>${statName}: ${statValue}</span><br/>`;
                }
            }

            document.getElementById("partial-discussion-sidebar").prepend(ourThing)

        }
    });

    console.log("GitHub PR Stats completed.");
})();
