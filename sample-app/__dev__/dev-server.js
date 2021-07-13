require("@oxy2/dev")
  .startDevServer({ api: require("..").sampleApp })
  .catch((err) => {
    console.error("Failed to start dev server", err);
    process.exit(1);
  });
