const issueButtons = document.querySelectorAll("#issue[data-issue-url]");

issueButtons.forEach((button) => {
	const configuredUrl = button.dataset.issueUrl || button.getAttribute("href");
	if (!configuredUrl) {
		return;
	}

	const generatedUrl = buildIssueUrl(button, configuredUrl);
	if (generatedUrl) {
		button.setAttribute("href", generatedUrl);
	}
});

function buildIssueUrl(button, configuredUrl) {
	let parsed;

	try {
		parsed = new URL(configuredUrl, window.location.origin);
	} catch (error) {
		return configuredUrl;
	}

	const issuePayload = buildIssuePayload(button);

	if (isGitHub(parsed)) {
		return buildGitHubIssueUrl(parsed, issuePayload);
	}

	if (isGitLab(parsed)) {
		return buildGitLabIssueUrl(parsed, issuePayload);
	}

	if (isGiteaLike(parsed)) {
		return buildGiteaIssueUrl(parsed, issuePayload);
	}

	return configuredUrl;
}

function buildIssuePayload(button) {
	const articleTitle = button.dataset.issueTitle || document.title;
	const articleUrl = button.dataset.issueLink || window.location.href;
	const articleDescription = button.dataset.issueDescription || "";
	const articleLanguage =
		button.dataset.issueLanguage || document.documentElement.lang || "";
	const articleDate = button.dataset.issueDate || "";
	const articleUpdated = button.dataset.issueUpdated || "";
	const pageTheme = document.documentElement.getAttribute("data-theme") || "system";

	const lines = [
		"## Context",
		`- Article: ${articleTitle}`,
		`- Article URL: ${articleUrl}`,
	];

	if (articleDescription) {
		lines.push(`- Description: ${articleDescription}`);
	}

	if (articleLanguage) {
		lines.push(`- Language: ${articleLanguage}`);
	}

	if (articleDate) {
		lines.push(`- Published: ${articleDate}`);
	}

	if (articleUpdated) {
		lines.push(`- Updated: ${articleUpdated}`);
	}

	lines.push(
		"",
		"## Environment",
		`- Current page: ${window.location.href}`,
		`- Theme: ${pageTheme}`,
		`- User Agent: ${navigator.userAgent}`,
		"",
		"## Problem",
		"- ",
		"",
		"## Expected",
		"- "
	);

	const issueTitle = buildIssueTitle(articleTitle, articleUrl);

	return {
		title: issueTitle,
		body: lines.join("\n"),
	};
}

function buildIssueTitle(articleTitle, articleUrl) {
	const pagePath = truncateText(extractPathname(articleUrl), 80);
	const fallbackTitle = truncateText(normalizeText(articleTitle), 60);
	const context = pagePath || fallbackTitle || "unknown-page";
	const summaryPlaceholder = "brief summary";

	return `[Blog] ${context} - ${summaryPlaceholder}`;
}

function extractPathname(rawUrl) {
	try {
		const parsed = new URL(rawUrl, window.location.origin);
		return parsed.pathname;
	} catch (error) {
		return "";
	}
}

function normalizeText(text) {
	return (text || "").replace(/\s+/g, " ").trim();
}

function truncateText(text, maxLength) {
	if (!text || text.length <= maxLength) {
		return text;
	}

	return `${text.slice(0, maxLength - 3)}...`;
}

function isGitHub(url) {
	return url.hostname === "github.com" || url.hostname === "www.github.com";
}

function isGitLab(url) {
	return url.hostname === "gitlab.com" || url.hostname.endsWith(".gitlab.io");
}

function isGiteaLike(url) {
	return url.hostname === "codeberg.org" || url.hostname.includes("gitea");
}

function buildGitHubIssueUrl(url, issuePayload) {
	let path = trimTrailingSlash(url.pathname);

	if (path.endsWith("/issues")) {
		path = path.slice(0, -"/issues".length);
	}

	const params = new URLSearchParams({
		title: issuePayload.title,
		body: issuePayload.body,
	});

	return `${url.origin}${path}/issues/new?${params.toString()}`;
}

function buildGitLabIssueUrl(url, issuePayload) {
	let path = trimTrailingSlash(url.pathname);

	if (path.endsWith("/-/issues")) {
		path = path.slice(0, -"/-/issues".length);
	}

	if (path.endsWith("/issues")) {
		path = path.slice(0, -"/issues".length);
	}

	const params = new URLSearchParams({
		"issue[title]": issuePayload.title,
		"issue[description]": issuePayload.body,
	});

	return `${url.origin}${path}/-/issues/new?${params.toString()}`;
}

function buildGiteaIssueUrl(url, issuePayload) {
	let path = trimTrailingSlash(url.pathname);

	if (path.endsWith("/issues")) {
		path = path.slice(0, -"/issues".length);
	}

	const params = new URLSearchParams({
		title: issuePayload.title,
		body: issuePayload.body,
	});

	return `${url.origin}${path}/issues/new?${params.toString()}`;
}

function trimTrailingSlash(pathname) {
	return pathname.replace(/\/+$/, "");
}
