module.exports = {
  run: [{
    // Remove the cloned app + its venv (re-run Install to rebuild from scratch)
    method: "fs.rm",
    params: {
      path: "app"
    }
  }]
}
