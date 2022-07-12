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

            const metrics = data.metrics[0];
            debug(metrics);

            // TODO: Do some stuff with the metrics...
            for (const [metricName, stats] of Object.entries(metrics)) {
                debug(`Metric Name: ${metricName}`);
                debug(`Metric Stats:`);
                for (const [statName, statValue] of Object.entries(stats)) {
                    debug(`---> ${statName}: ${statValue}`);
                }
            }
        }
    });

    console.log("GitHub PR Stats completed.");
})();
