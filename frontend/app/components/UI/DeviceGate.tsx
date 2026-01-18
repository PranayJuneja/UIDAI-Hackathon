'use client';

import { useState, useEffect } from 'react';
import styles from './DeviceGate.module.css';

interface DeviceGateProps {
    children: React.ReactNode;
}

type DeviceStatus = 'loading' | 'allowed' | 'mobile' | 'tablet-portrait';

export default function DeviceGate({ children }: DeviceGateProps) {
    const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('loading');

    useEffect(() => {
        const checkDevice = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const isPortrait = height > width;

            // Mobile: width < 768px (regardless of orientation)
            if (width < 768) {
                setDeviceStatus('mobile');
                return;
            }

            // Tablet in portrait: catches iPad Pro (1024px), iPad Air, and other tablets
            // Threshold of 1200px covers most tablet portrait widths
            if (width <= 1200 && isPortrait) {
                setDeviceStatus('tablet-portrait');
                return;
            }

            // Desktop or tablet in landscape
            setDeviceStatus('allowed');
        };

        // Initial check
        checkDevice();

        // Listen for resize and orientation changes
        window.addEventListener('resize', checkDevice);
        window.addEventListener('orientationchange', () => {
            // Delay to allow orientation change to complete
            setTimeout(checkDevice, 100);
        });

        return () => {
            window.removeEventListener('resize', checkDevice);
            window.removeEventListener('orientationchange', checkDevice);
        };
    }, []);

    // Show loading state briefly to prevent flash
    if (deviceStatus === 'loading') {
        return (
            <div className={styles.gateContainer}>
                <div className={styles.terminal}>
                    <div className={styles.terminalHeader}>
                        <div className={styles.terminalButtons}>
                            <span className={styles.terminalButtonRed}></span>
                            <span className={styles.terminalButtonYellow}></span>
                            <span className={styles.terminalButtonGreen}></span>
                        </div>
                        <span className={styles.terminalTitle}>chronos-x ~ system</span>
                    </div>
                    <div className={styles.terminalBody}>
                        <div className={styles.line}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.command}>initializing...</span>
                            <span className={styles.cursor}>▊</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Mobile device - show message to use desktop
    if (deviceStatus === 'mobile') {
        return (
            <div className={styles.gateContainer}>
                <div className={styles.terminal}>
                    <div className={styles.terminalHeader}>
                        <div className={styles.terminalButtons}>
                            <span className={styles.terminalButtonRed}></span>
                            <span className={styles.terminalButtonYellow}></span>
                            <span className={styles.terminalButtonGreen}></span>
                        </div>
                        <span className={styles.terminalTitle}>chronos-x ~ access_denied</span>
                    </div>
                    <div className={styles.terminalBody}>
                        <div className={styles.asciiArt}>
                            {`
  ╔═══════════════════════════════════════╗
  ║                                       ║
  ║     📱 MOBILE DEVICE DETECTED         ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
`}
                        </div>
                        <div className={styles.line}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.command}>check_device --type</span>
                        </div>
                        <div className={styles.output}>
                            <span className={styles.error}>[ERROR]</span> Mobile viewport detected
                        </div>
                        <div className={styles.line}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.command}>run chronos-x --mobile</span>
                        </div>
                        <div className={styles.output}>
                            <span className={styles.warning}>[WARN]</span> This application requires a larger screen
                        </div>
                        <div className={styles.lineBreak}></div>
                        <div className={styles.message}>
                            <span className={styles.info}>[INFO]</span> Chronos-X features advanced data visualization
                        </div>
                        <div className={styles.message}>
                            <span className={styles.info}>[INFO]</span> and interactive maps that require desktop resolution.
                        </div>
                        <div className={styles.lineBreak}></div>
                        <div className={styles.line}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.command}>suggest --action</span>
                        </div>
                        <div className={styles.suggestion}>
                            <span className={styles.success}>→</span> Please access from a <span className={styles.highlight}>desktop</span> or <span className={styles.highlight}>laptop</span>
                        </div>
                        <div className={styles.suggestion}>
                            <span className={styles.success}>→</span> Tablets in <span className={styles.highlight}>landscape mode</span> are also supported
                        </div>
                        <div className={styles.lineBreak}></div>
                        <div className={styles.line}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.blinkingCursor}>_</span>
                        </div>
                    </div>
                </div>
                <div className={styles.glowOrb}></div>
                <div className={styles.glowOrb2}></div>
            </div>
        );
    }

    // Tablet in portrait mode - show message to rotate
    if (deviceStatus === 'tablet-portrait') {
        return (
            <div className={styles.gateContainer}>
                <div className={styles.terminal}>
                    <div className={styles.terminalHeader}>
                        <div className={styles.terminalButtons}>
                            <span className={styles.terminalButtonRed}></span>
                            <span className={styles.terminalButtonYellow}></span>
                            <span className={styles.terminalButtonGreen}></span>
                        </div>
                        <span className={styles.terminalTitle}>chronos-x ~ orientation</span>
                    </div>
                    <div className={styles.terminalBody}>
                        <div className={styles.asciiArt}>
                            {`
  ╔═══════════════════════════════════════╗
  ║                                       ║
  ║     🔄 ROTATE YOUR DEVICE             ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
`}
                        </div>
                        <div className={styles.line}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.command}>check_orientation</span>
                        </div>
                        <div className={styles.output}>
                            <span className={styles.warning}>[WARN]</span> Portrait mode detected
                        </div>
                        <div className={styles.line}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.command}>get_optimal_orientation</span>
                        </div>
                        <div className={styles.output}>
                            <span className={styles.info}>[INFO]</span> Landscape orientation required
                        </div>
                        <div className={styles.lineBreak}></div>
                        <div className={styles.rotateIcon}>
                            <div className={styles.phoneIcon}>
                                <div className={styles.phoneScreen}></div>
                            </div>
                            <div className={styles.rotateArrow}>↻</div>
                        </div>
                        <div className={styles.lineBreak}></div>
                        <div className={styles.suggestion}>
                            <span className={styles.success}>→</span> Please rotate your tablet to <span className={styles.highlight}>landscape</span>
                        </div>
                        <div className={styles.suggestion}>
                            <span className={styles.success}>→</span> The app will load automatically
                        </div>
                        <div className={styles.lineBreak}></div>
                        <div className={styles.line}>
                            <span className={styles.prompt}>$</span>
                            <span className={styles.command}>awaiting orientation_change...</span>
                            <span className={styles.blinkingCursor}>_</span>
                        </div>
                    </div>
                </div>
                <div className={styles.glowOrb}></div>
                <div className={styles.glowOrb2}></div>
            </div>
        );
    }

    // Desktop or tablet in landscape - show content
    return <>{children}</>;
}
