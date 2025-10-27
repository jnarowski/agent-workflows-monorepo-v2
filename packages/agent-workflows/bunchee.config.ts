export default {
  entries: [
    { input: './src/index.ts' },
    { input: './src/cli/index.ts', name: 'cli' },
  ],
  // The bin/agent-workflows.js is a wrapper file, not a build target
  // It imports the built dist/cli.js, so we don't need bunchee to build it
};
