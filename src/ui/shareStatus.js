/**
 * Share Status — shareable race status via URL hash and clipboard
 */

import { RACES } from '../config/raceSchedule.js';
import { formatRaceDates } from '../utils/dateUtils.js';

/**
 * Generate formatted status text for clipboard sharing
 */
export function generateStatusText(race, riskData, weatherData) {
    const lines = [];
    lines.push(`Florida NICA Race Weather Status`);
    lines.push(`================================`);
    lines.push(`Race: ${race.name}`);
    lines.push(`Venue: ${race.venue}, ${race.city}, ${race.state}`);
    lines.push(`Date: ${formatRaceDates(race)}`);
    lines.push('');

    if (riskData) {
        lines.push(`Risk Level: ${riskData.level} (Score: ${riskData.overall}/100)`);
        lines.push(`Assessment: ${riskData.summary}`);
        lines.push('');
        lines.push(`Key Factors:`);
        lines.push(`  Lightning: ${riskData.lightning}/100`);
        lines.push(`  Trail Damage: ${riskData.trailDamage}/100`);
        lines.push(`  Wind: ${riskData.wind}/100`);
        if (riskData.heat !== undefined) {
            lines.push(`  Heat: ${riskData.heat}/100`);
        }
    }

    lines.push('');
    lines.push(`Last updated: ${new Date().toLocaleString('en-US')}`);
    lines.push(`Dashboard: ${window.location.origin}${window.location.pathname}#race=${race.id}`);

    return lines.join('\n');
}

/**
 * Update URL hash to reflect the active race
 */
export function updateURLHash(raceId) {
    const newHash = `#race=${raceId}`;
    if (window.location.hash !== newHash) {
        history.replaceState(null, '', newHash);
    }
}

/**
 * Read race ID from URL hash
 * @returns {number|null}
 */
export function readRaceFromURL() {
    const hash = window.location.hash;
    const match = hash.match(/#race=(\d+)/);
    if (match) {
        const id = parseInt(match[1], 10);
        if (RACES.find(r => r.id === id)) return id;
    }
    return null;
}

/**
 * Render the share button
 * @param {HTMLElement} container
 * @param {object} race
 * @param {object} riskData
 * @param {object} weatherData
 */
export function renderShareButton(container, race, riskData, weatherData) {
    if (!container) return;

    // Check if share button already exists
    let shareBtn = container.querySelector('.share-btn');
    if (!shareBtn) {
        shareBtn = document.createElement('button');
        shareBtn.className = 'share-btn';
        shareBtn.textContent = 'Share Status';
        container.appendChild(shareBtn);
    }

    // Replace old listener by cloning
    const newBtn = shareBtn.cloneNode(true);
    shareBtn.replaceWith(newBtn);

    newBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = generateStatusText(race, riskData, weatherData);

        try {
            await navigator.clipboard.writeText(text);
            showToast('Status copied to clipboard!');
        } catch {
            // Fallback: select text in a textarea
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('Status copied to clipboard!');
        }
    });
}

function showToast(message) {
    // Remove any existing toast
    const existing = document.querySelector('.share-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('share-toast--visible'));

    setTimeout(() => {
        toast.classList.remove('share-toast--visible');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
