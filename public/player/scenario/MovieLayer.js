// Video-playback layer — mirrors original movieLayer.
// control(movieId) adds an HTML5 <video> element and returns a Promise.
class MovieLayer {
    constructor() {
        this._container = new PIXI.Container();
        this._video     = null;
        this._sprite    = null;
        this._movieAudio = null;
        this._movieSeStarted = false;
        this._startedAt = 0;
        this._mutedFallback = false;
    }

    get stageObj() { return this._container; }

    // A movie must be visibly playing for a moment before a tap may skip it,
    // otherwise the same tap that starts the movie would immediately cancel it.
    canSkip() {
        return !!(this._video && this._startedAt && performance.now() - this._startedAt > 700 && Number(this._video.currentTime) > 0.3);
    }

    // Returns a Promise that resolves when the video ends.
    // movieUrl is a full URL after AdvResourceConverter (or any string id).
    control(movieUrl, opts = {}) {
        return new Promise(resolve => {
            this._cleanup();
            let settled = false;
            // Any path that drops this video must settle the promise, otherwise
            // AdvPlayer._controlMovie never resumes and the player looks frozen.
            const settle = () => {
                if (settled) return;
                settled = true;
                if (this._pendingSettle === settle) this._pendingSettle = null;
                resolve();
            };
            this._pendingSettle = settle;
            const seUrl = opts.seUrl;
            this._movieSeStarted = false;
            this._startedAt = performance.now();
            this._movieAudio = seUrl ? this._createMovieAudio(seUrl) : null;

            // Stories reference a movie by bare id, but the shipped files live under
            // movies/idols/<kind>/<id>.mp4. Try the real layouts before the flat path,
            // otherwise the request 404s and the movie silently never appears.
            const paths = movieUrl.startsWith('http') || movieUrl.includes('/')
                ? [movieUrl]
                : [
                    `${ASSET_PATH}/movies/idols/card/${movieUrl}.mp4`,
                    `${ASSET_PATH}/movies/idols/card_costume/${movieUrl}.mp4`,
                    `${ASSET_PATH}/movies/${movieUrl}.mp4`
                ];
            let pathIndex = 0;

            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.autoplay = false;
            video.muted    = !!this._movieAudio;
            video.volume   = 1;
            video.preload  = 'auto';
            video.playsInline = true;
            video.setAttribute('playsinline', '');

            const playMovieSe = () => {
                if (!this._movieAudio || this._movieSeStarted || video.currentTime <= 0) return;
                this._movieSeStarted = true;
                this._syncMovieAudio(video);
                const p = this._movieAudio.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
            };
            const resumeMovieSe = () => {
                if (!this._movieAudio || !this._movieSeStarted) return;
                this._syncMovieAudio(video);
                const p = this._movieAudio.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
            };
            const pauseMovieSe = () => {
                if (this._movieAudio) this._movieAudio.pause();
            };

            const fail = (message) => {
                try { const st = document.querySelector('#status'); if (st) st.textContent = '影片无法播放：' + message; } catch (error) {}
                opts.onError?.(message);
                this._cleanup();
                settle();
            };
            const attempt = (muted) => {
                video.muted = muted;
                const p = video.play();
                return p && typeof p.then === 'function' ? p : Promise.resolve();
            };
            const play = () => {
                this._mutedFallback = false;
                attempt(!!this._movieAudio).catch((err) => {
                    // An unmuted start is blocked while this document has no user
                    // activation (e.g. the card-story iframe is opened by a click in the
                    // parent page). Start muted so the picture still plays, then unmute
                    // on the next gesture via unmuteAfterGesture().
                    if (err && err.name === 'NotAllowedError' && !video.muted) {
                        this._mutedFallback = true;
                        this._bindGestureUnmute();
                        attempt(true).catch(() => fail(video.error?.message || '影片无法播放'));
                        return;
                    }
                    fail(video.error?.message || (err && err.message) || '影片无法播放');
                });
            };
            const load = () => {
                video.src = paths[pathIndex];
                video.load();
                play();
            };

            video.addEventListener('ended', () => {
                this._stopMovieAudio();
                video.pause();
                settle();
            });
            video.addEventListener('error', () => {
                if (this._video !== video) return;
                if (pathIndex + 1 < paths.length) {
                    pathIndex += 1;
                    load();
                    return;
                }
                console.warn(`[MovieLayer] failed to load: ${paths[pathIndex]}`);
                opts.onError?.(video.error?.message || '影片无法加载');
                this._cleanup();
                settle();
            });
            video.addEventListener('timeupdate', playMovieSe);
            video.addEventListener('playing', resumeMovieSe);
            video.addEventListener('waiting', pauseMovieSe);
            video.addEventListener('pause', pauseMovieSe);

            this._video  = video;
            // Local fix: do not ask Pixi to load an invalid video in parallel.
            // Its resource promise would otherwise reject outside control().
            video.addEventListener('loadeddata', () => {
                if (this._video !== video) return;
                // Drive the frame upload ourselves: with autoLoad/autoPlay off Pixi
                // never re-uploads the texture, so the sprite stays on the first frame
                // and the "movie" looks frozen even though the video is playing.
                let base = null;
                let texture = null;
                if (PIXI.VideoBaseTexture && typeof PIXI.VideoBaseTexture.fromVideo === 'function') {
                    base = PIXI.VideoBaseTexture.fromVideo(video);
                    texture = new PIXI.Texture(base);
                } else {
                    texture = PIXI.Texture.from(video);
                    base = texture.baseTexture;
                }
                const sprite = new PIXI.Sprite(texture);
                sprite.width = 1136; sprite.height = 640;
                this._container.addChild(sprite); this._sprite = sprite;
                const tick = () => {
                    if (this._video !== video) return;
                    try { if (base && typeof base.update === 'function') base.update(); } catch (error) {}
                    if (typeof video.requestVideoFrameCallback === 'function') {
                        this._frameCallback = video.requestVideoFrameCallback(tick);
                    } else {
                        this._frameRaf = requestAnimationFrame(tick);
                    }
                };
                tick();
            }, { once: true });

            load();
        });
    }
    // Give the sound back on the first interaction inside this document.
    _bindGestureUnmute() {
        if (this._gestureBound) return;
        this._gestureBound = true;
        const once = () => {
            this.unmuteAfterGesture();
            for (const type of ['pointerdown', 'touchstart', 'keydown']) {
                window.removeEventListener(type, once, true);
            }
        };
        for (const type of ['pointerdown', 'touchstart', 'keydown']) {
            window.addEventListener(type, once, true);
        }
    }
    reset() { this._cleanup(); }

    _cleanup() {
        this._mutedFallback = false;
        if (this._video && typeof this._video.cancelVideoFrameCallback === 'function' && this._frameCallback) {
            try { this._video.cancelVideoFrameCallback(this._frameCallback); } catch (error) {}
        }
        this._frameCallback = 0;
        if (this._frameRaf) { try { cancelAnimationFrame(this._frameRaf); } catch (error) {} }
        this._frameRaf = 0;
        // Settle whatever control() promise is still pending, so a reset() or a
        // replacing movie can never leave AdvPlayer._controlMovie awaiting forever.
        const pending = this._pendingSettle;
        this._pendingSettle = null;
        if (pending) pending();
        if (this._video) {
            this._video.pause();
            this._video.src = '';
            this._video = null;
        }
        this._stopMovieAudio();
        if (this._sprite) {
            if (this._sprite.texture) this._sprite.texture.destroy(true);
            this._container.removeChild(this._sprite);
            this._sprite = null;
        }
    }

    // Called from a real user gesture: if playback had to start muted, give it sound back.
    unmuteAfterGesture() {
        if (!this._mutedFallback || !this._video) return;
        this._mutedFallback = false;
        try { this._video.muted = !!this._movieAudio; } catch (error) {}
        if (this._movieAudio && this._video.currentTime > 0) {
            this._movieSeStarted = true;
            this._syncMovieAudio(this._video);
            const p = this._movieAudio.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
        }
    }
    _stopMovieAudio() {
        if (this._movieAudio) {
            this._movieAudio.pause();
            this._movieAudio.src = '';
            this._movieAudio = null;
        }
        this._movieSeStarted = false;
    }

    _createMovieAudio(seUrl) {
        const audio = document.createElement('audio');
        audio.crossOrigin = 'anonymous';
        audio.src = seUrl;
        audio.preload = 'auto';
        audio.volume = 1;
        return audio;
    }

    _syncMovieAudio(video) {
        if (!this._movieAudio) return;
        try {
            if (Math.abs(this._movieAudio.currentTime - video.currentTime) > 0.2) {
                this._movieAudio.currentTime = video.currentTime;
            }
        } catch (_) {}
    }
}





