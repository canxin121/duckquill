const sharePanels = document.querySelectorAll("[data-share-panel]");

sharePanels.forEach((panel) => {
	const statusElement = panel.querySelector("[data-share-status]");
	const nativeButton = panel.querySelector("[data-share-native]");
	const copyButton = panel.querySelector("[data-share-copy]");

	const copiedMessage = panel.dataset.shareCopied || "Link copied";
	const copyFailedMessage =
		panel.dataset.shareCopyFailed || "Could not copy link";
	const nativeFailedMessage =
		panel.dataset.shareNativeFailed || "System share is unavailable";

	if (nativeButton) {
		if (typeof navigator.share !== "function") {
			nativeButton.hidden = true;
		} else {
			nativeButton.addEventListener("click", async () => {
				const title = nativeButton.dataset.shareTitle || "";
				const text = nativeButton.dataset.shareText || title;
				const url = nativeButton.dataset.shareUrl || window.location.href;

				try {
					await navigator.share({ title, text, url });
					setStatus(statusElement, "");
				} catch (error) {
					if (error && error.name === "AbortError") {
						return;
					}
					setStatus(statusElement, nativeFailedMessage);
				}
			});
		}
	}

	if (copyButton) {
		copyButton.addEventListener("click", async () => {
			const url = copyButton.dataset.shareUrl || window.location.href;
			const copied = await copyText(url);

			if (copied) {
				setStatus(statusElement, copiedMessage);
				return;
			}

			setStatus(statusElement, copyFailedMessage);
		});
	}
});

function setStatus(statusElement, text) {
	if (!statusElement) {
		return;
	}

	statusElement.textContent = text;
}

async function copyText(text) {
	if (!text) {
		return false;
	}

	if (navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (error) {
			return false;
		}
	}

	const input = document.createElement("textarea");
	input.value = text;
	input.setAttribute("readonly", "");
	input.style.position = "fixed";
	input.style.opacity = "0";
	document.body.appendChild(input);
	input.select();

	let copied = false;
	try {
		copied = document.execCommand("copy");
	} catch (error) {
		copied = false;
	}

	document.body.removeChild(input);
	return copied;
}
