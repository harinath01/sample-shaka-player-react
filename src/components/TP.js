import React, { useEffect, useCallback, useState, useRef } from "react";
import { useSelector } from "react-redux";
import './TP.css';

const TP = ({ data, className = '', orgId = 'bfbsz3' }) => {
    console.log("Component Rendered: TP");

    const [isLoading, setIsLoading] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [shakaLoaded, setShakaLoaded] = useState(false);
    const playerRef = useRef(null);
    const videoRef = useRef(null);
    const tpStreamDatas = useSelector((state) => state.tpStream.tpStreamData);
    const tpStreamData = data?.data || tpStreamDatas?.data;

    console.log("tpStreamData:", tpStreamData);

    const manifestUri = tpStreamData?.playback_url || "";
    const manifestURLWidevine = tpStreamData?.dash_url || "";
    const accessToken = tpStreamData?.access_token || "";
    const asset_id = tpStreamData?.asset_id || "";

    console.log("Manifest URIs:", { manifestUri, manifestURLWidevine });

    // Generate DRM license URLs as per documentation
    const FAIRPLAY_LICENSE_URL = `https://app.tpstreams.com/api/v1/${orgId}/assets/${asset_id}/drm_license/?access_token=${accessToken}&drm_type=fairplay`;
    const WIDEVINE_LICENSE_URL = `https://app.tpstreams.com/api/v1/${orgId}/assets/${asset_id}/drm_license/?access_token=${accessToken}&drm_type=widevine`;

    console.log("License URLs:", { FAIRPLAY_LICENSE_URL, WIDEVINE_LICENSE_URL });

    const handleVideoLoaded = () => {
        console.log("Video loaded successfully");
        setIsVideoLoaded(true);
        setIsLoading(false);
    };

    const handleVideoError = (error) => {
        console.error("Video loading error:", error);
        if (error.nativeEvent) {
            console.error("Error details:", error.nativeEvent);
        }
        setIsLoading(false);
        setError("Failed to load video. Please try again.");
    };

    useEffect(() => {
        console.log("useEffect triggered: Checking mobile device");
        setIsLoading(true);
        setIsVideoLoaded(false);
        setError(null);

        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobileDevice = /android|iPad|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            setIsMobile(isMobileDevice);
            console.log("Is mobile device:", isMobileDevice);
        };

        checkMobile();
    }, [manifestUri]);

    // Setup FairPlay DRM for Safari
    const setupFairPlay = async (player) => {
        window.shaka.polyfill.PatchedMediaKeysApple.install();
        try {
            console.log("Setting up FairPlay DRM");

            const certificatePath = "https://static.testpress.in/static/fairplay.cer";
            const response = await fetch(certificatePath);
            if (!response.ok) {
                throw new Error('Failed to fetch FairPlay certificate');
            }
            const certificate = await response.arrayBuffer();

            player.configure({
                drm: {
                    servers: {
                        'com.apple.fps.1_0': FAIRPLAY_LICENSE_URL,
                    },
                    advanced: {
                        'com.apple.fps.1_0': {
                            serverCertificate: new Uint8Array(certificate),
                        },
                    },
                },
            });

            // Add initDataTransform as per documentation
            player.configure('drm.initDataTransform', (initData, type, drmInfo) => {
                if (type !== 'skd') return initData;
                const contentId = new TextDecoder("utf-16").decode(initData.slice(16));
                const cert = player.drmInfo().serverCertificate;

                return window.shaka.util.FairPlayUtils.initDataTransform(
                    initData,
                    contentId,
                    cert
                );
            });

            // Register request filter for FairPlay
            player.getNetworkingEngine().registerRequestFilter(function (type, request) {
                if (type === window.shaka.net.NetworkingEngine.RequestType.LICENSE) {
                    request.headers['Content-Type'] = 'application/json';
                    const originalPayload = new Uint8Array(request.body);
                    const base64Payload = window.shaka.util.Uint8ArrayUtils.toStandardBase64(originalPayload);
                    request.body = JSON.stringify({
                        spc: base64Payload,
                    });
                }
            });

            console.log("FairPlay DRM configured successfully");
        } catch (error) {
            console.error("FairPlay setup error:", error);
            throw error;
        }
    };

    // Setup Widevine DRM for Chrome and other browsers
    const setupWidevine = (player) => {
        try {
            console.log("Setting up Widevine DRM");
            console.log("Widevine License URL:", WIDEVINE_LICENSE_URL);

            player.configure({
                drm: {
                    servers: {
                        'com.widevine.alpha': WIDEVINE_LICENSE_URL,
                    },
                },
            });

            player.getNetworkingEngine().registerRequestFilter(function (type, request) {
                if (type === window.shaka.net.NetworkingEngine.RequestType.LICENSE) {
                    console.log("Setting Content-type header for license request");
                    request.headers['Content-Type'] = 'application/octet-stream';
                }
            });

            console.log("Widevine DRM configured successfully");
        } catch (error) {
            console.error("Widevine setup error:", error);
            throw error;
        }
    };

    const initPlayer = useCallback(async (video, player) => {
        console.log("Initializing player...");
        if (!tpStreamData) {
            console.error("No stream data available");
            setError("No video data available");
            return;
        }

        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const manifestURL = (isSafari || isIOS) ? manifestUri : manifestURLWidevine;

        console.log("Browser detection:", { isSafari, isIOS });
        console.log("Using manifest URL:", manifestURL);

        try {
            // Install built-in polyfills to patch browser incompatibilities
            window.shaka.polyfill.installAll();

            // Set common configurations for all browsers
            player.configure({
                streaming: {
                    bufferingGoal: 60,
                    rebufferingGoal: 15,
                    bufferBehind: 30,
                    retryParameters: {
                        maxAttempts: 5,
                        baseDelay: 1000,
                        backoffFactor: 2,
                        fuzzFactor: 0.5
                    }
                }
            });

            // Configure browser-specific DRM
            if (isSafari || isIOS) {
                console.log("Setting up Safari/iOS playback with FairPlay");
                await setupFairPlay(player);
            } else {
                console.log("Setting up Widevine DRM for non-Safari browser");
                setupWidevine(player);
            }

            // Add error event listener
            player.addEventListener('error', (event) => {
                console.error('Player error event:', event);
                if (event.detail) {
                    console.error('Error code:', event.detail.code);
                    console.error('Error category:', event.detail.category);
                    console.error('Error severity:', event.detail.severity);
                    console.error('Error data:', event.detail.data);
                    setError(`Player error: ${event.detail.message || 'Unknown error'}`);
                }
            });

            // Load the manifest
            await player.load(manifestURL);
            console.log("Player loaded successfully");
            setIsLoading(false);
        } catch (e) {
            console.error("Player Error:", e);
            setError(`Failed to load video: ${e.message || 'Unknown error'}`);
            setIsLoading(false);
            if (player) player.detach();
        }
    }, [tpStreamData, manifestUri, manifestURLWidevine, FAIRPLAY_LICENSE_URL, WIDEVINE_LICENSE_URL]);

    useEffect(() => {
        console.log("Loading Shaka Player dynamically...");
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/shaka-player@4.12.8/dist/shaka-player.compiled.js';
        script.async = true;
        script.onload = () => {
            console.log("Shaka Player loaded successfully");
            setShakaLoaded(true);
        };
        script.onerror = (error) => {
            console.error("Failed to load Shaka Player:", error);
            setError("Failed to load video player");
        };
        document.body.appendChild(script);
    }, []);

    useEffect(() => {
        if (!shakaLoaded || !tpStreamData) return;
        console.log("Initializing video player after Shaka loaded");

        if (!window.shaka.Player.isBrowserSupported()) {
            console.error("Browser not supported!");
            setError("Your browser is not supported for video playback");
            return;
        }

        const video = videoRef.current;
        if (!video) {
            console.error("Video element not found");
            return;
        }

        const player = new window.shaka.Player(video);
        playerRef.current = player;
        initPlayer(video, player);

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
        };
    }, [tpStreamData, initPlayer, shakaLoaded]);

    // Function to retry playback
    const retryPlayback = () => {
        console.log("Retrying playback...");
        setIsLoading(true);
        setError(null);

        if (videoRef.current) {
            videoRef.current.src = '';
            videoRef.current.load();
        }

        if (playerRef.current) {
            try {
                playerRef.current.destroy();
            } catch (e) {
                console.log("Error destroying player:", e);
            }
            playerRef.current = null;
        }

        if (window.shaka && videoRef.current) {
            const player = new window.shaka.Player(videoRef.current);
            playerRef.current = player;
            initPlayer(videoRef.current, player);
        } else {
            setError("Video player not available. Please refresh the page.");
            setIsLoading(false);
        }
    };

    return (
        <div className={`media ${className}`}>
            {isLoading && <div className="loading-overlay"><div className="loading-spinner" /></div>}

            {error && (
                <div className="error-container">
                    <p className="error-message">{error}</p>
                    <button className="retry-button" onClick={retryPlayback}>Retry</button>
                </div>
            )}

            <video
                ref={videoRef}
                controls
                onLoadedData={handleVideoLoaded}
                onError={handleVideoError}
                className={`video-player ${isVideoLoaded ? 'loaded' : ''}`}
                autoPlay={false}
                muted={isMobile}
                style={{ display: error ? 'none' : 'block' }}
            />
        </div>
    );
};

export default React.memo(TP); 