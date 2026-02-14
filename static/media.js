const mainContent = document.querySelector("main");

if (mainContent) {
	if (window.requestIdleCallback) {
		window.requestIdleCallback(() => {
			initImageLightbox(mainContent);
			initVideoPlayers(mainContent);
		});
	} else {
		setTimeout(() => {
			initImageLightbox(mainContent);
			initVideoPlayers(mainContent);
		}, 0);
	}
}

function initImageLightbox(root) {
	const items = collectLightboxItems(root);
	if (items.length === 0) {
		return;
	}

	const lightbox = createImageLightbox(items);

	items.forEach((item, index) => {
		const target = item.anchor || item.image;
		target.classList.add("media-lightbox-trigger");

		if (!item.anchor) {
			target.setAttribute("role", "button");
			target.tabIndex = 0;
		}

		target.addEventListener("click", (event) => {
			if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
				return;
			}

			event.preventDefault();
			lightbox.open(index);
		});

		target.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") {
				return;
			}

			event.preventDefault();
			lightbox.open(index);
		});
	});
}

function collectLightboxItems(root) {
	const images = Array.from(root.querySelectorAll("img"));
	const items = [];

	images.forEach((image) => {
		if (!isLightboxCandidate(image)) {
			return;
		}

		const anchor =
			image.parentElement && image.parentElement.tagName === "A"
				? image.parentElement
				: null;
		const imageSrc = image.currentSrc || image.src || "";
		if (!imageSrc) {
			return;
		}

		let fullSrc = imageSrc;
		if (anchor && anchor.getAttribute("href")) {
			const resolvedHref = resolveUrl(anchor.getAttribute("href"));
			const pointsToImage =
				isLikelyImageUrl(resolvedHref) || areSameAsset(resolvedHref, imageSrc);

			if (!pointsToImage) {
				return;
			}

			fullSrc = resolvedHref || imageSrc;
		}

		const figure = image.closest("figure");
		const figcaption = figure ? figure.querySelector("figcaption") : null;
		const caption = figcaption && figcaption.textContent ? figcaption.textContent.trim() : "";

		items.push({
			image,
			anchor,
			fullSrc,
			alt: (image.alt || "").trim(),
			caption,
		});
	});

	return items;
}

function createImageLightbox(items) {
	const shell = document.createElement("div");
	shell.className = "media-lightbox";
	shell.setAttribute("aria-hidden", "true");
	shell.setAttribute("data-open", "false");
	shell.tabIndex = -1;

	shell.innerHTML = `
		<button type="button" class="media-lightbox-close" data-lightbox-action="close" aria-label="Close media viewer">×</button>
		<button type="button" class="media-lightbox-nav media-lightbox-prev" data-lightbox-action="prev" aria-label="Previous image">‹</button>
		<figure class="media-lightbox-figure">
			<img class="media-lightbox-image" alt="" />
			<figcaption class="media-lightbox-caption"></figcaption>
		</figure>
		<button type="button" class="media-lightbox-nav media-lightbox-next" data-lightbox-action="next" aria-label="Next image">›</button>
		<div class="media-lightbox-toolbar">
			<span class="media-lightbox-counter"></span>
			<div class="media-lightbox-actions">
				<button type="button" class="media-lightbox-action" data-lightbox-action="zoom-out" aria-label="Zoom out">-</button>
				<button type="button" class="media-lightbox-action" data-lightbox-action="zoom-in" aria-label="Zoom in">+</button>
				<a class="media-lightbox-original" target="_blank" rel="noopener noreferrer" aria-label="Open original image" title="Open original image">
					<i class="icon" aria-hidden="true"></i>
					<span class="visually-hidden">Original</span>
				</a>
			</div>
		</div>
	`;

	document.body.appendChild(shell);

	const imageElement = shell.querySelector(".media-lightbox-image");
	const captionElement = shell.querySelector(".media-lightbox-caption");
	const counterElement = shell.querySelector(".media-lightbox-counter");
	const originalLink = shell.querySelector(".media-lightbox-original");
	const previousButton = shell.querySelector(".media-lightbox-prev");
	const nextButton = shell.querySelector(".media-lightbox-next");

	let activeIndex = 0;
	let zoom = 1;
	let touchStartX = null;

	const wrapIndex = (index) => {
		const total = items.length;
		return ((index % total) + total) % total;
	};

	const preloadNeighbors = () => {
		if (items.length < 2) {
			return;
		}

		const neighbors = [
			items[wrapIndex(activeIndex + 1)].fullSrc,
			items[wrapIndex(activeIndex - 1)].fullSrc,
		];

		neighbors.forEach((src) => {
			const preloadImage = new Image();
			preloadImage.src = src;
		});
	};

	const updateZoom = (nextZoom) => {
		zoom = Math.max(1, Math.min(4, nextZoom));
		imageElement.style.transform = `scale(${zoom})`;
		shell.classList.toggle("is-zoomed", zoom > 1);
	};

	const show = (index) => {
		activeIndex = wrapIndex(index);
		const item = items[activeIndex];

		updateZoom(1);
		imageElement.src = item.fullSrc;
		imageElement.alt = item.alt || "";
		captionElement.textContent = item.caption;
		captionElement.hidden = !item.caption;
		counterElement.textContent = `${activeIndex + 1} / ${items.length}`;
		originalLink.href = item.fullSrc;
		preloadNeighbors();
	};

	const open = (index) => {
		show(index);
		shell.setAttribute("data-open", "true");
		shell.setAttribute("aria-hidden", "false");
		document.body.classList.add("media-lightbox-open");
		shell.focus();
	};

	const close = () => {
		shell.setAttribute("data-open", "false");
		shell.setAttribute("aria-hidden", "true");
		document.body.classList.remove("media-lightbox-open");
	};

	const navigate = (delta) => {
		show(activeIndex + delta);
	};

	if (items.length < 2) {
		previousButton.hidden = true;
		nextButton.hidden = true;
	}

	shell.addEventListener("click", (event) => {
		if (event.target === shell) {
			close();
			return;
		}

		const actionTarget = event.target.closest("[data-lightbox-action]");
		if (!actionTarget) {
			return;
		}

		event.preventDefault();
		const action = actionTarget.dataset.lightboxAction;

		if (action === "close") {
			close();
		}

		if (action === "prev") {
			navigate(-1);
		}

		if (action === "next") {
			navigate(1);
		}

		if (action === "zoom-in") {
			updateZoom(zoom + 0.25);
		}

		if (action === "zoom-out") {
			updateZoom(zoom - 0.25);
		}
	});

	shell.addEventListener("keydown", (event) => {
		if (shell.getAttribute("data-open") !== "true") {
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			close();
		}

		if (event.key === "ArrowLeft") {
			event.preventDefault();
			navigate(-1);
		}

		if (event.key === "ArrowRight") {
			event.preventDefault();
			navigate(1);
		}

		if (event.key === "+" || event.key === "=") {
			event.preventDefault();
			updateZoom(zoom + 0.25);
		}

		if (event.key === "-") {
			event.preventDefault();
			updateZoom(zoom - 0.25);
		}
	});

	imageElement.addEventListener("dblclick", () => {
		updateZoom(zoom > 1 ? 1 : 2);
	});

	imageElement.addEventListener(
		"wheel",
		(event) => {
			if (shell.getAttribute("data-open") !== "true") {
				return;
			}

			event.preventDefault();
			const step = event.deltaY < 0 ? 0.25 : -0.25;
			updateZoom(zoom + step);
		},
		{ passive: false }
	);

	shell.addEventListener("touchstart", (event) => {
		touchStartX = event.changedTouches[0].clientX;
	});

	shell.addEventListener("touchend", (event) => {
		if (touchStartX === null || items.length < 2) {
			return;
		}

		const deltaX = event.changedTouches[0].clientX - touchStartX;
		touchStartX = null;

		if (Math.abs(deltaX) < 48) {
			return;
		}

		navigate(deltaX > 0 ? -1 : 1);
	});

	return { open };
}

function isLightboxCandidate(image) {
	if (!image || !image.src) {
		return false;
	}

	if (
		image.id === "banner" ||
		image.classList.contains("emoji") ||
		image.classList.contains("no-lightbox") ||
		image.closest("#banner-container") ||
		image.closest("#site-nav")
	) {
		return false;
	}

	return true;
}

function resolveUrl(url) {
	if (!url) {
		return "";
	}

	try {
		return new URL(url, window.location.href).href;
	} catch (error) {
		return "";
	}
}

function isLikelyImageUrl(url) {
	if (!url) {
		return false;
	}

	try {
		const parsed = new URL(url, window.location.href);
		if (parsed.protocol === "data:") {
			return true;
		}

		return /\.(avif|bmp|gif|heic|jpeg|jpg|png|svg|webp)$/i.test(parsed.pathname);
	} catch (error) {
		return false;
	}
}

function areSameAsset(a, b) {
	if (!a || !b) {
		return false;
	}

	try {
		const urlA = new URL(a, window.location.href);
		const urlB = new URL(b, window.location.href);
		return urlA.href === urlB.href;
	} catch (error) {
		return false;
	}
}

function initVideoPlayers(root) {
	const videos = Array.from(root.querySelectorAll("video[controls]"));
	if (videos.length === 0) {
		return;
	}

	const observer =
		"IntersectionObserver" in window
			? new IntersectionObserver(
					(entries, io) => {
						entries.forEach((entry) => {
							if (!entry.isIntersecting) {
								return;
							}

							enhanceVideo(entry.target);
							io.unobserve(entry.target);
						});
					},
					{ rootMargin: "300px" }
			  )
			: null;

	videos.forEach((video) => {
		if (observer) {
			observer.observe(video);
		} else {
			enhanceVideo(video);
		}
	});
}

function enhanceVideo(video) {
	if (!video || video.dataset.videoEnhanced === "true") {
		return;
	}

	video.dataset.videoEnhanced = "true";

	if (!video.getAttribute("preload")) {
		video.setAttribute("preload", "metadata");
	}

	video.setAttribute("playsinline", "");

	const wrapper = document.createElement("div");
	wrapper.className = "media-video-player";
	wrapper.tabIndex = 0;
	wrapper.setAttribute("role", "group");
	wrapper.setAttribute("aria-label", "Enhanced video player");

	transferVideoLayoutClasses(video, wrapper);

	video.parentNode.insertBefore(wrapper, video);
	wrapper.appendChild(video);

	video.controls = false;

	const controls = document.createElement("div");
	controls.className = "media-video-controls";
	controls.innerHTML = `
		<button type="button" data-video-action="play" aria-label="Play video" title="Play or pause">
			<i class="icon" aria-hidden="true"></i>
			<span class="visually-hidden">Play or pause video</span>
		</button>
		<button type="button" data-video-action="backward" aria-label="Seek backward 10 seconds" title="Back 10 seconds">
			<i class="icon" aria-hidden="true"></i>
			<span class="visually-hidden">Seek backward 10 seconds</span>
		</button>
		<button type="button" data-video-action="forward" aria-label="Seek forward 10 seconds" title="Forward 10 seconds">
			<i class="icon" aria-hidden="true"></i>
			<span class="visually-hidden">Seek forward 10 seconds</span>
		</button>
		<input type="range" data-video-seek min="0" max="1000" value="0" step="1" aria-label="Seek" />
		<span data-video-time>0:00 / 0:00</span>
		<div class="media-video-volume">
			<button type="button" data-video-action="mute" aria-label="Mute video" title="Mute or unmute">
				<i class="icon" aria-hidden="true"></i>
				<span class="visually-hidden">Mute or unmute</span>
			</button>
			<div class="media-video-volume-panel">
				<input type="range" data-video-volume min="0" max="1" step="0.05" value="1" aria-label="Volume" />
			</div>
		</div>
		<button type="button" data-video-action="speed" data-speed="1x" aria-label="Playback speed 1x" title="Playback speed 1x">
			<i class="icon" aria-hidden="true"></i>
			<span class="visually-hidden">Playback speed</span>
		</button>
		<button type="button" data-video-action="pip" aria-label="Picture in picture" title="Picture in picture">
			<i class="icon" aria-hidden="true"></i>
			<span class="visually-hidden">Picture in picture</span>
		</button>
		<button type="button" data-video-action="fullscreen" aria-label="Fullscreen" title="Toggle fullscreen">
			<i class="icon" aria-hidden="true"></i>
			<span class="visually-hidden">Toggle fullscreen</span>
		</button>
	`;

	wrapper.appendChild(controls);

	const gestureStatus = document.createElement("p");
	gestureStatus.className = "media-video-gesture";
	gestureStatus.hidden = true;
	gestureStatus.setAttribute("aria-live", "polite");
	wrapper.appendChild(gestureStatus);

	const playButton = controls.querySelector('[data-video-action="play"]');
	const muteButton = controls.querySelector('[data-video-action="mute"]');
	const speedButton = controls.querySelector('[data-video-action="speed"]');
	const pipButton = controls.querySelector('[data-video-action="pip"]');
	const fullscreenButton = controls.querySelector(
		'[data-video-action="fullscreen"]'
	);
	const seekInput = controls.querySelector("[data-video-seek]");
	const volumeInput = controls.querySelector("[data-video-volume]");
	const timeLabel = controls.querySelector("[data-video-time]");
	const speedSteps = [0.5, 0.75, 1, 1.25, 1.5, 2];
	let speedIndex = closestStepIndex(video.playbackRate || 1, speedSteps);
	let lastVolume = video.volume > 0 ? video.volume : 1;
	let visualBrightness = 1;
	let touchState = null;
	let gestureTimer = null;
	const controlsAutoHideDelay = 2200;
	let controlsIdleTimer = null;
	let controlsInteractionLock = false;

	const standardPiPEnabled =
		typeof document !== "undefined" &&
		("pictureInPictureEnabled" in document ? document.pictureInPictureEnabled : true);
	const supportsStandardPiP =
		standardPiPEnabled &&
		typeof video.requestPictureInPicture === "function" &&
		!video.disablePictureInPicture;
	const supportsWebkitPiP =
		typeof video.webkitSupportsPresentationMode === "function" &&
		typeof video.webkitSetPresentationMode === "function" &&
		video.webkitSupportsPresentationMode("picture-in-picture");
	const supportsPiP = supportsStandardPiP || supportsWebkitPiP;
	if (!supportsPiP) {
		pipButton.hidden = true;
		pipButton.disabled = true;
	}

	if (volumeInput) {
		volumeInput.value = String(video.muted ? 0 : video.volume);
	}

	const showGesture = (label, value) => {
		gestureStatus.textContent = `${label}: ${value}`;
		gestureStatus.hidden = false;
		gestureStatus.dataset.visible = "true";

		if (gestureTimer) {
			clearTimeout(gestureTimer);
		}

		gestureTimer = setTimeout(() => {
			gestureStatus.dataset.visible = "false";
			gestureTimer = setTimeout(() => {
				gestureStatus.hidden = true;
			}, 150);
		}, 850);
	};

	const setBrightness = (value) => {
		visualBrightness = clamp(value, 0.4, 1.8);
		wrapper.style.setProperty("--media-video-brightness", visualBrightness.toFixed(2));
	};

	const setVolume = (value) => {
		const normalized = clamp(value, 0, 1);
		video.volume = normalized;
		video.muted = normalized === 0;

		if (normalized > 0) {
			lastVolume = normalized;
		}

		if (volumeInput) {
			volumeInput.value = String(video.muted ? 0 : video.volume);
		}
	};

	const seekBy = (seconds) => {
		const duration = Number.isFinite(video.duration) ? video.duration : Infinity;
		video.currentTime = clamp(video.currentTime + seconds, 0, duration);
	};

	const clearControlsIdleTimer = () => {
		if (controlsIdleTimer) {
			clearTimeout(controlsIdleTimer);
			controlsIdleTimer = null;
		}
	};

	const isCustomFullscreenActive = () => getActiveFullscreenElement() === wrapper;

	const shouldAutoHideControls = () => {
		if (!isCustomFullscreenActive() || video.paused || controlsInteractionLock) {
			return false;
		}

		return true;
	};

	const setControlsHidden = (hidden) => {
		wrapper.classList.toggle("is-controls-hidden", hidden);
	};

	const scheduleControlsAutoHide = () => {
		clearControlsIdleTimer();

		if (!shouldAutoHideControls()) {
			setControlsHidden(false);
			return;
		}

		controlsIdleTimer = setTimeout(() => {
			if (shouldAutoHideControls()) {
				setControlsHidden(true);
			}
		}, controlsAutoHideDelay);
	};

	const wakeControls = () => {
		setControlsHidden(false);
		scheduleControlsAutoHide();
	};

	const updatePlayButton = () => {
		const playing = !video.paused;
		playButton.dataset.state = playing ? "playing" : "paused";
		playButton.setAttribute("aria-label", playing ? "Pause video" : "Play video");
		playButton.setAttribute("title", playing ? "Pause" : "Play");
	};

	const updateMuteButton = () => {
		const muted = video.muted || video.volume === 0;
		muteButton.dataset.state = muted ? "muted" : "unmuted";
		muteButton.setAttribute("aria-label", muted ? "Unmute video" : "Mute video");
		muteButton.setAttribute("title", muted ? "Unmute" : "Mute");

		if (!muted && video.volume > 0) {
			lastVolume = video.volume;
		}

		if (volumeInput) {
			volumeInput.value = String(muted ? 0 : video.volume);
		}
	};

	const updateSpeedButton = () => {
		const speedValue = speedSteps[speedIndex];
		speedButton.dataset.speed = `${speedValue}x`;
		speedButton.setAttribute("aria-label", `Playback speed ${speedValue}x`);
		speedButton.setAttribute("title", `Playback speed ${speedValue}x`);
	};

	const updateFullscreenButton = () => {
		const activeFullscreenElement = getActiveFullscreenElement();
		const isWrapperFullscreen = activeFullscreenElement === wrapper;
		const isVideoFullscreen = activeFullscreenElement === video;
		const isFullscreen = isWrapperFullscreen || isVideoFullscreen;

		wrapper.classList.toggle("is-fullscreen", isWrapperFullscreen);
		wrapper.classList.toggle("is-controls-hidden", false);
		controls.hidden = isVideoFullscreen;
		video.controls = isVideoFullscreen;
		controlsInteractionLock = false;
		if (isVideoFullscreen || !isWrapperFullscreen) {
			clearControlsIdleTimer();
		} else {
			scheduleControlsAutoHide();
		}
		fullscreenButton.dataset.state = isFullscreen ? "on" : "off";
		fullscreenButton.setAttribute(
			"aria-label",
			isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
		);
		fullscreenButton.setAttribute(
			"title",
			isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
		);
	};

	const updatePiPButton = () => {
		if (!supportsPiP) {
			return;
		}

		const isStandardPiPActive =
			typeof document !== "undefined" &&
			"pictureInPictureElement" in document
				? document.pictureInPictureElement === video
				: false;
		const isInPiP = supportsStandardPiP
			? isStandardPiPActive
			: video.webkitPresentationMode === "picture-in-picture";
		pipButton.dataset.state = isInPiP ? "on" : "off";
		pipButton.setAttribute(
			"aria-label",
			isInPiP ? "Exit picture in picture" : "Enter picture in picture"
		);
		pipButton.setAttribute(
			"title",
			isInPiP ? "Exit picture in picture" : "Picture in picture"
		);
	};

	const togglePiP = async () => {
		if (!supportsPiP) {
			return;
		}

		try {
			if (supportsStandardPiP) {
				if (document.pictureInPictureElement === video) {
					if (typeof document.exitPictureInPicture === "function") {
						await document.exitPictureInPicture();
					}
				} else {
					await video.requestPictureInPicture();
				}
				return;
			}

			if (supportsWebkitPiP) {
				const isInPiP = video.webkitPresentationMode === "picture-in-picture";
				video.webkitSetPresentationMode(isInPiP ? "inline" : "picture-in-picture");
			}
		} catch (error) {
			showGesture("PiP", "Unavailable");
		}
	};

	const updateTime = () => {
		const duration = Number.isFinite(video.duration) ? video.duration : 0;
		const current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
		const progress = duration > 0 ? (current / duration) * 1000 : 0;

		seekInput.value = String(progress);
		timeLabel.textContent = `${formatMediaTime(current)} / ${formatMediaTime(duration)}`;
	};

	const togglePlay = async () => {
		if (video.paused) {
			try {
				await video.play();
			} catch (error) {
				return;
			}
		} else {
			video.pause();
		}
	};

	controls.addEventListener("click", async (event) => {
		const button = event.target.closest("button[data-video-action]");
		if (!button) {
			return;
		}

		wakeControls();

		const action = button.dataset.videoAction;

		if (action === "play") {
			await togglePlay();
		}

		if (action === "backward") {
			seekBy(-10);
		}

		if (action === "forward") {
			seekBy(10);
		}

		if (action === "mute") {
			if (video.muted || video.volume === 0) {
				setVolume(lastVolume || 1);
			} else {
				lastVolume = video.volume;
				setVolume(0);
			}
			updateMuteButton();
		}

		if (action === "speed") {
			speedIndex = (speedIndex + 1) % speedSteps.length;
			video.playbackRate = speedSteps[speedIndex];
			updateSpeedButton();
			showGesture("Speed", `${speedSteps[speedIndex]}x`);
		}

		if (action === "pip" && supportsPiP) {
			await togglePiP();
			updatePiPButton();
		}

		if (action === "fullscreen") {
			toggleFullscreen(wrapper);
		}
	});

	controls.addEventListener("pointerdown", () => {
		controlsInteractionLock = true;
		wakeControls();
	});

	controls.addEventListener(
		"touchstart",
		() => {
			controlsInteractionLock = true;
			wakeControls();
		},
		{ passive: true }
	);

	const releaseControlsInteractionLock = () => {
		if (!controlsInteractionLock) {
			return;
		}

		controlsInteractionLock = false;
		scheduleControlsAutoHide();
	};

	document.addEventListener("pointerup", releaseControlsInteractionLock);
	document.addEventListener("pointercancel", releaseControlsInteractionLock);
	document.addEventListener(
		"touchend",
		() => {
			releaseControlsInteractionLock();
		},
		{ passive: true }
	);
	document.addEventListener(
		"touchcancel",
		() => {
			releaseControlsInteractionLock();
		},
		{ passive: true }
	);

	wrapper.addEventListener("mousemove", () => {
		wakeControls();
	});

	wrapper.addEventListener("pointerdown", () => {
		wakeControls();
	});

	wrapper.addEventListener(
		"touchstart",
		() => {
			wakeControls();
		},
		{ passive: true }
	);

	seekInput.addEventListener("input", () => {
		const duration = Number.isFinite(video.duration) ? video.duration : 0;
		if (duration <= 0) {
			return;
		}

		const progress = Number(seekInput.value) / 1000;
		video.currentTime = duration * progress;
	});

	if (volumeInput) {
		volumeInput.addEventListener("input", () => {
			setVolume(Number(volumeInput.value));
			updateMuteButton();
		});
	}

	wrapper.addEventListener("keydown", async (event) => {
		wakeControls();

		const interactive = ["INPUT", "BUTTON"];
		if (interactive.includes(event.target.tagName)) {
			return;
		}

		const key = event.key.toLowerCase();

		if (key === " " || key === "k") {
			event.preventDefault();
			await togglePlay();
		}

		if (key === "arrowleft" || key === "j") {
			event.preventDefault();
			seekBy(-10);
		}

		if (key === "arrowright" || key === "l") {
			event.preventDefault();
			seekBy(10);
		}

		if (key === "m") {
			event.preventDefault();
			if (video.muted || video.volume === 0) {
				setVolume(lastVolume || 1);
			} else {
				lastVolume = video.volume;
				setVolume(0);
			}
			updateMuteButton();
		}

		if (key === "arrowup") {
			event.preventDefault();
			setVolume(video.volume + 0.05);
			showGesture("Volume", `${Math.round(video.volume * 100)}%`);
		}

		if (key === "arrowdown") {
			event.preventDefault();
			setVolume(video.volume - 0.05);
			showGesture("Volume", `${Math.round(video.volume * 100)}%`);
		}

		if (key === "," || key === "<") {
			event.preventDefault();
			speedIndex = (speedIndex - 1 + speedSteps.length) % speedSteps.length;
			video.playbackRate = speedSteps[speedIndex];
			updateSpeedButton();
			showGesture("Speed", `${speedSteps[speedIndex]}x`);
		}

		if (key === "." || key === ">") {
			event.preventDefault();
			speedIndex = (speedIndex + 1) % speedSteps.length;
			video.playbackRate = speedSteps[speedIndex];
			updateSpeedButton();
			showGesture("Speed", `${speedSteps[speedIndex]}x`);
		}

		if (key === "f") {
			event.preventDefault();
			toggleFullscreen(wrapper);
		}

		if (key === "p" && supportsPiP) {
			event.preventDefault();
			await togglePiP();
			updatePiPButton();
		}
	});

	const supportsTouchGestures =
		"ontouchstart" in window || window.matchMedia("(pointer: coarse)").matches;

	if (supportsTouchGestures) {
		wrapper.addEventListener(
			"touchstart",
			(event) => {
				if (event.target.closest(".media-video-controls") || event.touches.length !== 1) {
					return;
				}

				const touch = event.touches[0];
				const rect = video.getBoundingClientRect();

				if (
					touch.clientX < rect.left ||
					touch.clientX > rect.right ||
					touch.clientY < rect.top ||
					touch.clientY > rect.bottom
				) {
					return;
				}

				touchState = {
					startX: touch.clientX,
					startY: touch.clientY,
					startVolume: video.muted ? 0 : video.volume,
					startBrightness: visualBrightness,
					height: rect.height,
					mode: touch.clientX <= rect.left + rect.width / 2 ? "brightness" : "volume",
					active: false,
				};
			},
			{ passive: true }
		);

		wrapper.addEventListener(
			"touchmove",
			(event) => {
				if (!touchState || event.touches.length !== 1) {
					return;
				}

				const touch = event.touches[0];
				const deltaX = touch.clientX - touchState.startX;
				const deltaY = touch.clientY - touchState.startY;

				if (!touchState.active) {
					if (Math.abs(deltaY) < 14 || Math.abs(deltaY) <= Math.abs(deltaX)) {
						return;
					}

					touchState.active = true;
				}

				event.preventDefault();
				const normalizedDelta = (-deltaY / touchState.height) * 1.5;

				if (touchState.mode === "brightness") {
					setBrightness(touchState.startBrightness + normalizedDelta);
					showGesture("Brightness", `${Math.round(visualBrightness * 100)}%`);
					return;
				}

				setVolume(touchState.startVolume + normalizedDelta);
				showGesture("Volume", `${Math.round(video.volume * 100)}%`);
			},
			{ passive: false }
		);

		const resetTouchState = () => {
			touchState = null;
		};

		wrapper.addEventListener("touchend", resetTouchState, { passive: true });
		wrapper.addEventListener("touchcancel", resetTouchState, { passive: true });
	}

	video.addEventListener("play", () => {
		updatePlayButton();
		scheduleControlsAutoHide();
	});

	video.addEventListener("pause", () => {
		updatePlayButton();
		setControlsHidden(false);
		clearControlsIdleTimer();
	});
	video.addEventListener("timeupdate", updateTime);
	video.addEventListener("durationchange", updateTime);
	video.addEventListener("loadedmetadata", updateTime);
	video.addEventListener("volumechange", () => {
		updateMuteButton();
	});
	if (supportsStandardPiP) {
		video.addEventListener("enterpictureinpicture", updatePiPButton);
		video.addEventListener("leavepictureinpicture", updatePiPButton);
	}

	if (supportsWebkitPiP) {
		video.addEventListener("webkitpresentationmodechanged", updatePiPButton);
	}

	document.addEventListener("fullscreenchange", updateFullscreenButton);
	document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
	document.addEventListener("mozfullscreenchange", updateFullscreenButton);
	document.addEventListener("MSFullscreenChange", updateFullscreenButton);

	video.addEventListener("click", () => {
		wakeControls();
		togglePlay();
	});

	video.addEventListener("dblclick", (event) => {
		event.preventDefault();
		wakeControls();
		toggleFullscreen(wrapper);
	});

	setBrightness(1);
	updateSpeedButton();
	updatePlayButton();
	updateMuteButton();
	updatePiPButton();
	updateFullscreenButton();
	updateTime();
}

function transferVideoLayoutClasses(video, wrapper) {
	const layoutClasses = ["full", "full-bleed", "start", "end", "transparent"];

	layoutClasses.forEach((className) => {
		if (video.classList.contains(className)) {
			wrapper.classList.add(className);

			if (className !== "transparent") {
				video.classList.remove(className);
			}
		}
	});

	const src = video.getAttribute("src") || "";
	if (src.includes("#full")) {
		wrapper.classList.add("full");
	}

	if (src.includes("#full-bleed")) {
		wrapper.classList.add("full-bleed");
	}

	if (src.includes("#start")) {
		wrapper.classList.add("start");
	}

	if (src.includes("#end")) {
		wrapper.classList.add("end");
	}

	if (src.includes("#transparent")) {
		wrapper.classList.add("transparent");
	}
}

function getActiveFullscreenElement() {
	return (
		document.fullscreenElement ||
		document.webkitFullscreenElement ||
		document.mozFullScreenElement ||
		document.msFullscreenElement ||
		null
	);
}

function toggleFullscreen(element) {
	const activeFullscreenElement = getActiveFullscreenElement();

	if (!activeFullscreenElement) {
		if (typeof element.requestFullscreen === "function") {
			element.requestFullscreen().catch(() => {
				return;
			});
			return;
		}

		if (typeof element.webkitRequestFullscreen === "function") {
			element.webkitRequestFullscreen();
			return;
		}

		if (typeof element.mozRequestFullScreen === "function") {
			element.mozRequestFullScreen();
			return;
		}

		if (typeof element.msRequestFullscreen === "function") {
			element.msRequestFullscreen();
		}
		return;
	}

	if (activeFullscreenElement === element) {
		if (typeof document.exitFullscreen === "function") {
			document.exitFullscreen().catch(() => {
				return;
			});
			return;
		}

		if (typeof document.webkitExitFullscreen === "function") {
			document.webkitExitFullscreen();
			return;
		}

		if (typeof document.mozCancelFullScreen === "function") {
			document.mozCancelFullScreen();
			return;
		}

		if (typeof document.msExitFullscreen === "function") {
			document.msExitFullscreen();
		}
	}
}

function closestStepIndex(value, steps) {
	let bestIndex = 0;
	let bestDistance = Infinity;

	steps.forEach((step, index) => {
		const distance = Math.abs(step - value);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestIndex = index;
		}
	});

	return bestIndex;
}

function clamp(value, min, max) {
	if (value < min) {
		return min;
	}

	if (value > max) {
		return max;
	}

	return value;
}

function formatMediaTime(rawSeconds) {
	const seconds = Math.max(0, Math.floor(rawSeconds || 0));
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remaining = seconds % 60;

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
	}

	return `${minutes}:${String(remaining).padStart(2, "0")}`;
}
