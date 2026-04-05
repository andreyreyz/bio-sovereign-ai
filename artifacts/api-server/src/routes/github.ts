import { Router } from "express";
import { execSync } from "child_process";

const router = Router();

router.post("/github/push", async (req, res) => {
  const { token, repo } = req.body as { token?: string; repo?: string };

  if (!token || typeof token !== "string" || token.length < 10) {
    res.status(400).json({ error: "Введите корректный GitHub токен" });
    return;
  }

  const repoName = (repo || "bio-sovereign-ai").trim();
  const username = "andreyreyz";
  const remoteUrl = `https://${token}@github.com/${username}/${repoName}.git`;

  try {
    const cwd = "/home/runner/workspace";

    // Configure git user
    execSync(`git config user.name "${username}"`, { cwd });
    execSync(`git config user.email "${username}@users.noreply.github.com"`, { cwd });

    // Remove existing github remote if any
    try {
      execSync("git remote remove github", { cwd, stdio: "pipe" });
    } catch {
      // ignore
    }

    // Add remote
    execSync(`git remote add github ${remoteUrl}`, { cwd });

    // Stage and commit README if it exists and is untracked/modified
    try {
      execSync("git add README.md", { cwd, stdio: "pipe" });
      execSync('git commit -m "Add project README"', { cwd, stdio: "pipe" });
    } catch {
      // ignore if nothing to commit
    }

    // Get current branch
    let branch = "main";
    try {
      branch = execSync("git branch --show-current", { cwd }).toString().trim() || "main";
    } catch {
      // ignore
    }

    // Push
    execSync(`git push github ${branch}:main --force`, { cwd, timeout: 60000 });

    // Clean up remote (remove token from config)
    try {
      execSync("git remote remove github", { cwd, stdio: "pipe" });
    } catch {
      // ignore
    }

    res.json({
      success: true,
      repoUrl: `https://github.com/${username}/${repoName}`,
      branch,
    });
  } catch (err) {
    // Clean up remote on error too
    try {
      execSync("git remote remove github", { cwd: "/home/runner/workspace", stdio: "pipe" });
    } catch {
      // ignore
    }
    const msg = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "GitHub push failed");
    res.status(500).json({ error: msg.includes("Repository not found") || msg.includes("not found")
      ? "Репозиторий не найден. Сначала создайте его на github.com/new"
      : `Ошибка: ${msg.slice(0, 300)}` });
  }
});

export default router;
