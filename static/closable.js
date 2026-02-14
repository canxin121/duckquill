const closable = document.querySelectorAll("details.closable");

closable.forEach((detail) => {
	detail.addEventListener("toggle", () => {
		if (detail.open) setTargetDetail(detail);
	});
});

function shouldCloseOnOutsideClick(detail) {
	return detail.dataset.closeOnOutside !== "false";
}

function setTargetDetail(targetDetail) {
	closable.forEach((detail) => {
		if (detail !== targetDetail) {
			detail.open = false;
		}
	});
}

document.addEventListener("click", function (event) {
	const isClickInsideDetail = [...closable].some((detail) =>
		detail.contains(event.target)
	);

	if (!isClickInsideDetail) {
		closable.forEach((detail) => {
			if (shouldCloseOnOutsideClick(detail)) {
				detail.open = false;
			}
		});
	}
});

initFloatingTocState();

function initFloatingTocState() {
	const tocDetail = document.querySelector("#buttons-container #toc");
	if (!tocDetail) {
		return;
	}

	const tocLinks = [...tocDetail.querySelectorAll("a[href]")];
	const tocEntries = tocLinks
		.map((link) => {
			const heading = getHeadingForTocLink(link);
			if (!heading) {
				return null;
			}

			return {
				link,
				heading,
				level: heading.tagName.toUpperCase(),
				title: link.textContent.trim(),
			};
		})
		.filter(Boolean);

	if (tocEntries.length === 0) {
		return;
	}

	const tocCurrent = ensureCurrentLabel(tocDetail);
	let activeHeadingId = "";

	const update = () => {
		const activeEntry = getActiveTocEntry(tocEntries);
		if (!activeEntry) {
			return;
		}

		const headingId = activeEntry.heading.id;
		if (headingId === activeHeadingId) {
			return;
		}

		activeHeadingId = headingId;

		tocEntries.forEach((entry) => {
			entry.link.classList.remove("is-current", "is-current-parent");
			entry.link.removeAttribute("aria-current");
		});

		activeEntry.link.classList.add("is-current");
		activeEntry.link.setAttribute("aria-current", "location");

		let parentLink = getParentTocLink(activeEntry.link);
		while (parentLink) {
			parentLink.classList.add("is-current-parent");
			parentLink = getParentTocLink(parentLink);
		}

		tocCurrent.textContent = `${activeEntry.level} · ${activeEntry.title}`;
	};

	let isTicking = false;
	const requestUpdate = () => {
		if (isTicking) {
			return;
		}

		isTicking = true;
		requestAnimationFrame(() => {
			isTicking = false;
			update();
		});
	};

	window.addEventListener("scroll", requestUpdate, { passive: true });
	window.addEventListener("resize", requestUpdate);
	window.addEventListener("hashchange", requestUpdate);
	window.addEventListener("load", requestUpdate);

	requestUpdate();
}

function getHeadingForTocLink(link) {
	const href = link.getAttribute("href");
	if (!href) {
		return null;
	}

	let hash = "";
	if (href.startsWith("#")) {
		hash = href;
	} else {
		try {
			hash = new URL(href, window.location.href).hash;
		} catch (error) {
			return null;
		}
	}

	if (!hash) {
		return null;
	}

	const rawId = hash.slice(1);
	const decodedId = decodeTocId(rawId);

	return document.getElementById(decodedId) || document.getElementById(rawId);
}

function decodeTocId(id) {
	try {
		return decodeURIComponent(id);
	} catch (error) {
		return id;
	}
}

function getActiveTocEntry(entries) {
	const threshold = Math.min(Math.max(window.innerHeight * 0.28, 96), 220);
	let activeEntry = entries[0];

	for (const entry of entries) {
		if (entry.heading.getBoundingClientRect().top - threshold <= 0) {
			activeEntry = entry;
		} else {
			break;
		}
	}

	return activeEntry;
}

function getParentTocLink(link) {
	const item = link.closest("li");
	if (!item) {
		return null;
	}

	const parentList = item.parentElement;
	if (!parentList) {
		return null;
	}

	const parentItem = parentList.closest("li");
	if (!parentItem) {
		return null;
	}

	const firstChild = parentItem.firstElementChild;
	if (firstChild && firstChild.tagName === "A") {
		return firstChild;
	}

	return parentItem.querySelector("a");
}

function ensureCurrentLabel(tocDetail) {
	const existing = tocDetail.querySelector("[data-toc-current]");
	if (existing) {
		return existing;
	}

	const label = document.createElement("p");
	label.className = "toc-current";
	label.setAttribute("data-toc-current", "");
	label.setAttribute("aria-live", "polite");
	const panelTitle = tocDetail.querySelector(".title");
	panelTitle?.insertAdjacentElement("afterend", label);
	return label;
}
