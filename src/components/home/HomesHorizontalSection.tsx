"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CaregiverProfile, ChildProfile, HomeProfile } from "@/lib/AppStateContext";
import { Item } from "@/lib/mockData";
import ItemPhoto from "@/components/ItemPhoto";

interface HomesHorizontalSectionProps {
    activeHome: HomeProfile | undefined;
    otherHomes: HomeProfile[];
    child: ChildProfile | null;
    getItemsForHome: (homeId: string) => Item[];
    getOwnerCaregiver: (home: HomeProfile) => CaregiverProfile | undefined;
    getValidCaregiverCount: (home: HomeProfile) => number;
    onSwitchHome: (homeId: string) => void;
    switchingHomeId: string | null;
    items: Item[]; // All items for travel bag
    currentCaregiver: CaregiverProfile | undefined;
}

export default function HomesHorizontalSection({
    activeHome,
    otherHomes,
    child,
    getItemsForHome,
    getOwnerCaregiver,
    getValidCaregiverCount,
    onSwitchHome,
    switchingHomeId,
    items,
    currentCaregiver,
}: HomesHorizontalSectionProps) {
    // Pagination for other homes
    const [currentDestinationIndex, setCurrentDestinationIndex] = useState(0);
    const currentDestination = otherHomes[currentDestinationIndex];

    // Track which home is marked as "next stay" (defaults to first other home)
    const [nextStayHomeId, setNextStayHomeId] = useState<string | null>(
        otherHomes.length > 0 ? otherHomes[0].id : null
    );

    const nextDestination = () => {
        setCurrentDestinationIndex((prev) => (prev + 1) % otherHomes.length);
    };

    const prevDestination = () => {
        setCurrentDestinationIndex((prev) => (prev - 1 + otherHomes.length) % otherHomes.length);
    };

    // Travel bag items
    const itemsToPack = items.filter((item) => {
        if (!item.isRequestedForNextVisit) return false;
        if (activeHome && item.locationHomeId === activeHome.id) return true;
        if (currentCaregiver && item.locationCaregiverId === currentCaregiver.id) return true;
        return false;
    });

    const packedItems = itemsToPack.filter((item) => item.isPacked);
    const unpackedItems = itemsToPack.filter((item) => !item.isPacked);
    const totalRequested = itemsToPack.length;

    // Get the caregiver at the active home for the status text
    const activeHomeOwner = activeHome ? getOwnerCaregiver(activeHome) : undefined;
    const packerName = activeHomeOwner?.label || activeHomeOwner?.name || "someone";

    let statusText: string;
    if (totalRequested === 0) {
        statusText = "No items to pack";
    } else if (unpackedItems.length === 0) {
        statusText = "Bag is ready!";
    } else {
        const itemWord = unpackedItems.length === 1 ? "item" : "items";
        statusText = `${unpackedItems.length} ${itemWord} for ${packerName} to pack`;
    }

    const previewItems = [...unpackedItems, ...packedItems].slice(0, 3);

    // Get current local time
    const getCurrentTime = (home?: HomeProfile) => {
        return new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: home?.timeZone && home.timeZone !== 'auto' ? home.timeZone : undefined,
        });
    };

    // Child name with capital first letter
    const childName = child?.name || "Child";

    return (
        <div className="homes-section">
            {/* 3-column grid */}
            <div className="homes-row">
                {/* COLUMN 1: Current Home */}
                {activeHome && (
                    <div className="home-column">
                        <Link
                            href={`/items?filter=${activeHome.id}`}
                            className="home-card-link"
                        >
                            <div className="home-card">
                                {/* Top row: section label only (no pagination on left card) */}
                                <div className="card-label-row">
                                    <span className="card-section-label">WHERE {childName.toUpperCase()} IS</span>
                                </div>
                                {/* Title */}
                                <h3 className="card-title">{activeHome.name}</h3>
                                {/* Local time */}
                                <div className="time-label">Local time {getCurrentTime(activeHome)}</div>

                                {/* Stats grid */}
                                <div className="stats-grid">
                                    <div className="stat-item">
                                        <span className="stat-val">Map</span>
                                        <span className="stat-lbl">VIEW</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-val">{getValidCaregiverCount(activeHome)}</span>
                                        <span className="stat-lbl">
                                            {getValidCaregiverCount(activeHome) === 1 ? 'PERSON' : 'PEOPLE'}
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-val">{getItemsForHome(activeHome.id).length}</span>
                                        <span className="stat-lbl">ITEMS</span>
                                    </div>
                                </div>

                                {/* Status button - unified style */}
                                <div className="card-footer">
                                    <div className="card-btn card-btn-status">
                                        <svg className="status-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        <span>{childName} is staying here now</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                )}

                {/* COLUMN 2: Travel Bag */}
                <div className="home-column center-column">
                    <div className="travel-card">
                        <h3 className="bag-title">{childName}'s Travel Bag</h3>

                        {/* Item preview or checkmark */}
                        <div className="bag-preview">
                            {previewItems.length > 0 ? (
                                <div className="bag-items-stack">
                                    {previewItems.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="bag-item"
                                            style={{
                                                marginLeft: index === 0 ? 0 : "-22px",
                                                zIndex: 4 - index,
                                            }}
                                        >
                                            {item.photoUrl ? (
                                                <ItemPhoto
                                                    photoPath={item.photoUrl}
                                                    itemName={item.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                getItemEmoji(item.category)
                                            )}
                                        </div>
                                    ))}
                                    {totalRequested > 3 && (
                                        <div
                                            className="bag-item bag-item-overflow"
                                            style={{ marginLeft: "-22px", zIndex: 0 }}
                                        >
                                            +{totalRequested - 3}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="check-circle">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            )}
                        </div>

                        <div className="bag-status">{statusText}</div>
                        <Link href="/items/travel-bag" className="bag-btn-link">
                            <span className="bag-btn">Open bag →</span>
                        </Link>
                    </div>
                </div>

                {/* COLUMN 3: Destination Home */}
                {currentDestination && (
                    <div className="home-column">
                        <div
                            className="home-card"
                            onClick={() => {}}
                        >
                            {/* Top row: section label + pagination aligned */}
                            <div className="card-label-row">
                                <span className="card-section-label">NEXT DESTINATION(S)</span>
                                <div className="card-pagination">
                                    <button
                                        className="pagination-arrow"
                                        onClick={(e) => { e.stopPropagation(); prevDestination(); }}
                                        aria-label="Previous home"
                                    >
                                        ‹
                                    </button>
                                    <span className="pagination-indicator">
                                        {currentDestinationIndex + 1}/{otherHomes.length}
                                    </span>
                                    <button
                                        className="pagination-arrow"
                                        onClick={(e) => { e.stopPropagation(); nextDestination(); }}
                                        aria-label="Next home"
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                            {/* Title with Next stay badge/button */}
                            <div className="card-title-row">
                                <h3 className="card-title">{currentDestination.name}</h3>
                                {nextStayHomeId === currentDestination.id ? (
                                    <span className="next-stay-badge next-stay-active">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Next stay
                                    </span>
                                ) : (
                                    <button
                                        className="next-stay-badge next-stay-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setNextStayHomeId(currentDestination.id);
                                        }}
                                    >
                                        Set as next stay
                                    </button>
                                )}
                            </div>
                            {/* Local time */}
                            <div className="time-label">Local time {getCurrentTime(currentDestination)}</div>

                            {/* Stats grid */}
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-val">Map</span>
                                    <span className="stat-lbl">VIEW</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-val">{getValidCaregiverCount(currentDestination)}</span>
                                    <span className="stat-lbl">
                                        {getValidCaregiverCount(currentDestination) === 1 ? 'PERSON' : 'PEOPLE'}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-val">{getItemsForHome(currentDestination.id).length}</span>
                                    <span className="stat-lbl">ITEMS</span>
                                </div>
                            </div>

                            {/* Switch button - unified style */}
                            <div className="card-footer">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (switchingHomeId !== currentDestination.id) {
                                            onSwitchHome(currentDestination.id);
                                        }
                                    }}
                                    disabled={switchingHomeId === currentDestination.id}
                                    className="card-btn"
                                >
                                    {switchingHomeId === currentDestination.id ? (
                                        <span className="btn-loading">
                                            <svg className="spin-icon" viewBox="0 0 24 24">
                                                <circle className="spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="spinner-head" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Switching...
                                        </span>
                                    ) : (
                                        "Switch to this home"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .homes-section {
                    position: relative;
                    margin-bottom: 2rem;
                    width: 100%;
                }

                .homes-row {
                    display: flex;
                    align-items: stretch;
                    justify-content: space-between;
                    gap: 32px;
                    position: relative;
                    width: 100%;
                }

                .home-column {
                    position: relative;
                    z-index: 2;
                    flex: 1 1 0;
                    max-width: 340px;
                }

                .home-column.center-column {
                    position: relative;
                    flex: 1 1 0;
                    max-width: 340px;
                }

                /* Connector line segments */
                .home-column.center-column::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    right: 100%;
                    width: 32px;
                    height: 2px;
                    background: #E0DCD5;
                    z-index: 0;
                    transform: translateY(-50%);
                }

                .home-column.center-column::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 100%;
                    width: 32px;
                    height: 2px;
                    background: #E0DCD5;
                    z-index: 0;
                    transform: translateY(-50%);
                }

                /* Link wrapper for clickable cards */
                .home-card-link {
                    display: flex;
                    text-decoration: none;
                    color: inherit;
                    width: 100%;
                    height: 100%;
                }

                /* Card styles */
                .home-card {
                    display: flex;
                    flex-direction: column;
                    background: white;
                    border-radius: 20px;
                    padding: 24px;
                    border: 1px solid #EBE6DC;
                    box-shadow: 0 4px 0 #EBE6DC;
                    width: 100%;
                    height: 100%;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-decoration: none;
                    color: inherit;
                }

                .home-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 0 #EBE6DC;
                }

                /* Label row - flex container for label + pagination */
                .card-label-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                    min-height: 20px;
                }

                .card-section-label {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    color: #888899;
                    font-weight: 600;
                }

                /* Pagination - same baseline as label */
                .card-pagination {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }

                .pagination-arrow {
                    width: 22px;
                    height: 22px;
                    border: none;
                    background: transparent;
                    color: #888899;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: all 0.15s ease;
                    padding: 0;
                    font-size: 16px;
                    font-weight: 500;
                }

                .pagination-arrow:hover {
                    color: #2C3E2D;
                    background: #E8F0E8;
                }

                .pagination-indicator {
                    font-size: 11px;
                    font-weight: 600;
                    color: #888899;
                    min-width: 32px;
                    text-align: center;
                }

                /* Title row - for title + badge layout */
                .card-title-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }

                /* Title - 4px below label row */
                .card-title {
                    font-family: 'DM Serif Display', serif;
                    font-size: 22px;
                    margin: 0 0 4px 0;
                    line-height: 1.2;
                    color: #2C3E2D;
                }

                .card-title-row .card-title {
                    margin: 0;
                }

                /* Next stay badge/button */
                .next-stay-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 4px 10px;
                    border-radius: 20px;
                    white-space: nowrap;
                    border: none;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .next-stay-badge.next-stay-active {
                    background: #E8F0E8;
                    color: #2C3E2D;
                    cursor: default;
                }

                .next-stay-badge.next-stay-btn {
                    background: transparent;
                    color: #888899;
                    border: 1px solid #D4CFC5;
                }

                .next-stay-badge.next-stay-btn:hover {
                    background: #E8F0E8;
                    color: #2C3E2D;
                    border-color: #E8F0E8;
                }

                /* Time label - follows title */
                .time-label {
                    font-size: 12px;
                    color: #888899;
                    margin-bottom: 16px;
                }

                /* Stats grid */
                .stats-grid {
                    background: #F9F9F8;
                    border-radius: 12px;
                    padding: 14px;
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 8px;
                    text-align: center;
                    margin-top: auto;
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .stat-val {
                    font-weight: 700;
                    font-size: 14px;
                    color: #2C3E2D;
                }

                .stat-lbl {
                    font-size: 9px;
                    color: #888899;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 700;
                }

                /* Card footer */
                .card-footer {
                    margin-top: 14px;
                }

                /* Unified card button style for both left and right cards */
                .card-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    width: 100%;
                    padding: 14px 16px;
                    border: none;
                    border-radius: 12px;
                    background: #2C3E2D;
                    font-family: 'Karla', sans-serif;
                    font-weight: 700;
                    font-size: 14px;
                    color: white;
                    cursor: pointer;
                    text-align: center;
                    transition: all 0.2s ease;
                }

                .card-btn:hover:not(:disabled) {
                    background: #1e2b1f;
                    transform: translateY(-1px);
                }

                .card-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                /* Status button variant (left card) - secondary style */
                .card-btn.card-btn-status {
                    background: white !important;
                    color: #2C3E2D !important;
                    border: 1px solid #E0DCD5 !important;
                    cursor: default;
                }

                .card-btn.card-btn-status:hover {
                    background: white !important;
                    transform: none;
                }

                .status-icon {
                    flex-shrink: 0;
                    color: #2C3E2D;
                }

                /* Loading state for button */
                .btn-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }

                .spin-icon {
                    width: 16px;
                    height: 16px;
                    animation: spin 1s linear infinite;
                }

                .spinner-track {
                    opacity: 0.25;
                }

                .spinner-head {
                    opacity: 0.75;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                /* Travel Bag Card - visually dominant */
                .travel-card {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    justify-content: center;
                    text-align: center;
                    background: linear-gradient(135deg, #2C3E2D 0%, #4CA1AF 100%);
                    color: white;
                    padding: 24px;
                    border: none;
                    border-radius: 20px;
                    box-shadow: 0 8px 16px rgba(44, 62, 45, 0.15);
                    width: 100%;
                    height: 100%;
                }

                .bag-title {
                    font-family: 'DM Serif Display', serif;
                    font-size: 24px;
                    margin: 0 0 20px 0;
                }

                .bag-preview {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin-bottom: 12px;
                    height: 64px;
                }

                .bag-items-stack {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }

                .bag-item {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    border: 4px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 26px;
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
                    background: #FFE4E1;
                    overflow: hidden;
                }

                .bag-item-overflow {
                    background: #E8E8E8;
                    color: #4A5D4B;
                    font-size: 14px;
                    font-weight: 700;
                }

                .check-circle {
                    width: 48px;
                    height: 48px;
                    background: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #2C3E2D;
                }

                .bag-status {
                    font-size: 13px;
                    opacity: 0.9;
                    margin-bottom: 20px;
                }

                .bag-btn-link {
                    display: block;
                    width: 100%;
                    text-decoration: none;
                }

                .bag-btn {
                    background: white !important;
                    color: #2C3E2D !important;
                    text-decoration: none;
                    padding: 14px 16px;
                    border-radius: 12px;
                    font-family: 'Karla', sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                    width: 100%;
                    display: block;
                    text-align: center;
                    transition: all 0.2s ease;
                    box-sizing: border-box;
                }

                .bag-btn:hover {
                    background: #f5f5f5 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }

                /* Responsive - tablet and below */
                @media (max-width: 1100px) {
                    .homes-section {
                        position: relative;
                    }

                    .homes-row {
                        flex-direction: column;
                        align-items: center;
                        gap: 0;
                        position: relative;
                    }

                    /* Vertical connector line for mobile - starts/ends at card centers */
                    .homes-row::before {
                        content: '';
                        position: absolute;
                        top: 50%;
                        bottom: 50%;
                        left: 50%;
                        width: 2px;
                        background: #E0DCD5;
                        transform: translateX(-50%);
                        z-index: 0;
                        /* Adjust to connect card centers, not extend beyond */
                        top: calc(10px + 120px); /* padding + approx half of first card */
                        bottom: calc(10px + 120px); /* padding + approx half of last card */
                    }

                    .home-column {
                        width: 100%;
                        max-width: 400px;
                        min-width: auto;
                        position: relative;
                        z-index: 1;
                        padding: 10px 0;
                    }

                    .home-column.center-column {
                        width: 100%;
                        max-width: 400px;
                        min-width: auto;
                        padding: 10px 0;
                    }

                    .home-column.center-column::before,
                    .home-column.center-column::after {
                        display: none;
                    }

                    .travel-card {
                        min-height: auto;
                        padding: 28px 24px;
                    }
                }

                /* Mobile */
                @media (max-width: 480px) {
                    .home-column,
                    .home-column.center-column {
                        max-width: 100%;
                        min-width: auto;
                    }

                    .home-card {
                        padding: 20px;
                    }

                    .card-btn {
                        padding: 14px 16px;
                        min-height: auto;
                    }

                    .travel-card {
                        padding: 24px 20px;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper function to get emoji based on category
function getItemEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
        clothing: "👕",
        toys: "🧸",
        electronics: "📱",
        books: "📚",
        school: "🎒",
        sports: "⚽",
        hygiene: "🧴",
        other: "📦",
    };
    return emojiMap[category?.toLowerCase()] || "📦";
}
