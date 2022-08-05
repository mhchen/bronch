#!/usr/bin/env node

const { execFileSync } = require('child_process');
const yargs = require('yargs');
const fuzzy = require('fuzzy');
const inquirer = require('inquirer');

inquirer.registerPrompt(
  'autocomplete',
  require('inquirer-autocomplete-prompt')
);

(async () => {
  const { byCommit } = yargs.argv;

  let recentBranches;

  if (byCommit) {
    recentBranches = execFileSync('git', ['branch', '--sort=-committerdate'], {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .map((line) => line.replace(/^[\* ] /, ''));
  } else {
    const output = execFileSync('git', ['reflog', '--grep-reflog=checkout:'], {
      encoding: 'utf-8',
    }).trim();
    if (!output) {
      console.log(
        'No recent branches found. This usually means this is a new repo or you haven’t switched branches yet.'
      );
      process.exit();
    }
    const lines = output.split('\n');
    recentBranches = lines.map(
      (line) => line.match(/moving from [^ ]+ to ([^ ]+)$/)[1]
    );
  }

  const currentBranch = execFileSync('git', ['branch', '--show-current'], {
    encoding: 'utf-8',
  }).trim();

  const allBranchesSet = new Set(
    execFileSync('git', ['branch'], {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .map((line) => line.replace(/^[\* ] /, ''))
  );

  const uniqueBranchesSet = new Set(recentBranches);
  uniqueBranchesSet.delete(currentBranch);

  for (const branch of uniqueBranchesSet) {
    if (!allBranchesSet.has(branch)) {
      uniqueBranchesSet.delete(branch);
    }
  }
  const uniqueBranches = [...uniqueBranchesSet];

  const { newBranch } = await inquirer.prompt({
    type: 'autocomplete',
    message: 'Choose a branch',
    name: 'newBranch',
    source: (_, input) => {
      return Promise.resolve(
        input
          ? fuzzy.filter(input, uniqueBranches).map(({ string }) => string)
          : uniqueBranches
      );
    },
  });

  execFileSync('git', ['checkout', newBranch]);
})();
