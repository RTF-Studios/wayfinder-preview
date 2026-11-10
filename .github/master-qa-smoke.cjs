// Compatibility entry point. All submission QA lives in submission-contract-qa.cjs.
// Do not restore old three-button, popup-first, or navigation tests here.
process.argv = [process.argv[0], require('node:path').join(__dirname,'submission-contract-qa.cjs'), '--master-only'];
require('./submission-contract-qa.cjs');
