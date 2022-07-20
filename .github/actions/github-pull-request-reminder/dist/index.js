import './sourcemap-register.cjs';/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

var __createBinding = (undefined && undefined.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (undefined && undefined.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (undefined && undefined.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (undefined && undefined.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const myToken = core.getInput('GITHUB_TOKEN');
const octokit = github.getOctokit(myToken);
const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
function pullRequests(repoOwner, repo) {
    return octokit.rest.pulls.list({
        owner: repoOwner,
        repo: repo,
        state: 'open',
        sort: 'created'
    });
}
function getMetrics() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = "https://chriscarini.com/developer_insights/data.json";
        const response = yield (0, node_fetch_1.default)(url);
        const result = yield response.json();
        return result;
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const api_response = yield getMetrics();
        const crl_p50 = api_response.metrics['Code Review Latency'].P50.Overall;
        try {
            const allOpenPrs = yield pullRequests(owner, repo);
            allOpenPrs.data.forEach(pr => {
                var _a, _b;
                core.debug(`PR: ${JSON.stringify(pr, null, 2)}`);
                const reviewerLogins = (_a = pr.requested_reviewers) === null || _a === void 0 ? void 0 : _a.map(reviewer => {
                    return reviewer.login;
                }).join(', ');
                core.info(`PR:   #${pr.number} by [${(_b = pr.user) === null || _b === void 0 ? void 0 : _b.login}] - ${pr.title} (${pr.state})`);
                core.info(`======================================================================`);
                core.info(`Link:       ${pr.html_url}`);
                core.info(`Created at: ${pr.created_at}`);
                core.info(`Created at: ${pr.updated_at}`);
                core.info(`Reviewers:  ${reviewerLogins}`);
                const current_time = new Date();
                const pr_creation_time = new Date(pr.created_at);
                const difference = current_time.getTime() - pr_creation_time.getTime();
                const comment = "Please review within " + difference + " seconds to reduce the P50 code review latency.";
                if (difference < crl_p50) {
                    const data = { owner: 'me', repo: 'fds', issue_number: pr.number, body: comment };
                    octokit.rest.issues.createComment(data);
                }
            });
        }
        catch (error) {
            if (error instanceof Error)
                core.setFailed(error.message);
        }
    });
}
run();


//# sourceMappingURL=index.js.map