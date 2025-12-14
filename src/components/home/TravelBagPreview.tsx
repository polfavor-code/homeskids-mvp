import React from "react";
import Link from "next/link";
import { Item } from "@/lib/mockData";
import { CaregiverProfile, ChildProfile, HomeProfile } from "@/lib/AppStateContextV2";
import ItemPhoto from "@/components/ItemPhoto";

interface TravelBagPreviewProps {
    items: Item[]; // All items
    child: ChildProfile | null;
    currentCaregiver: CaregiverProfile | undefined;
    currentHome?: HomeProfile; // NEW: current home for filtering
}

export default function TravelBagPreview({ items, child, currentCaregiver, currentHome }: TravelBagPreviewProps) {
    // Filter items that are requested for next visit and at current location (home or caregiver)
    const itemsToPack = items.filter(
        (item) => {
            if (!item.isRequestedForNextVisit) return false;
            // Prefer home-based filtering
            if (currentHome && item.locationHomeId === currentHome.id) return true;
            // Fallback to caregiver-based filtering
            if (currentCaregiver && item.locationCaregiverId === currentCaregiver.id) return true;
            return false;
        }
    );

    const packedItems = itemsToPack.filter((item) => item.isPacked);
    const unpackedItems = itemsToPack.filter((item) => !item.isPacked);
    const totalRequested = itemsToPack.length;
    const isAllPacked = totalRequested > 0 && unpackedItems.length === 0;

    // Show up to 3 items for the stacked avatars (prioritize unpacked)
    const previewItems = [...unpackedItems, ...packedItems].slice(0, 3);

    // Determine status text based on state
    let statusText: string;
    if (totalRequested === 0) {
        statusText = "No items to pack";
    } else if (isAllPacked) {
        statusText = "Bag is ready!";
    } else {
        statusText = `${unpackedItems.length} more item${unpackedItems.length !== 1 ? "s" : ""} to pack`;
    }

    return (
        <div className="relative">
            {/* Top line segment - from card above to top node */}
            <div className="flex justify-center">
                <div className="w-[2px] h-12 bg-[#E0DCD5]" />
            </div>

            {/* Center Card - V4 style with gradient background */}
            <div
                className="relative z-10 text-center mx-auto"
                style={{
                    background: "linear-gradient(135deg, #2C3E2D 0%, #4CA1AF 100%)",
                    boxShadow: "0 8px 24px rgba(36, 52, 37, 0.08)",
                    padding: "32px 24px",
                    borderRadius: "32px",
                    maxWidth: "348px",
                }}
            >
                {/* Title */}
                <h3
                    className="font-dmSerif text-white"
                    style={{ fontSize: "22px", margin: 0 }}
                >
                    {child?.name || "Child"}'s Travel Bag
                </h3>

                {/* Stacked Item Preview */}
                <div
                    className="flex justify-center items-center"
                    style={{ margin: "24px 0", height: "64px" }}
                >
                    {previewItems.length > 0 ? (
                        <>
                            {previewItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="relative group"
                                    style={{
                                        marginLeft: index === 0 ? 0 : "-22px",
                                        zIndex: 4 - index,
                                    }}
                                >
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-forest text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                        {item.name}
                                    </div>
                                    <div
                                        className="rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
                                        style={{
                                            width: "60px",
                                            height: "60px",
                                            border: "4px solid white",
                                            fontSize: "26px",
                                            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.1)",
                                            background: getItemBgColor(index),
                                            transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "scale(1.15) translateY(-4px)";
                                            e.currentTarget.style.zIndex = "20";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "";
                                            e.currentTarget.style.zIndex = "";
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
                                </div>
                            ))}
                            {/* Overflow indicator when more than 3 items */}
                            {totalRequested > 3 && (
                                <div
                                    className="relative"
                                    style={{
                                        marginLeft: "-22px",
                                        zIndex: 0,
                                    }}
                                >
                                    <div
                                        className="rounded-full flex items-center justify-center cursor-pointer"
                                        style={{
                                            width: "60px",
                                            height: "60px",
                                            border: "4px solid white",
                                            fontSize: "14px",
                                            fontWeight: 700,
                                            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.1)",
                                            background: "#E8E8E8",
                                            color: "#4A5D4B",
                                        }}
                                    >
                                        +{totalRequested - 3}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div
                            className="rounded-full flex items-center justify-center"
                            style={{
                                width: "60px",
                                height: "60px",
                                border: "4px solid white",
                                fontSize: "26px",
                                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.1)",
                                background: "#F0FFF0",
                            }}
                        >
                            ✓
                        </div>
                    )}
                </div>

                {/* Status Text */}
                <p style={{ marginBottom: "24px", fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                    {statusText}
                </p>

                {/* CTA Button - White with forest text, matching V4 */}
                <Link
                    href="/items/travel-bag"
                    className="flex items-center justify-center gap-2 w-full bg-white text-forest hover:opacity-90 transition-opacity"
                    style={{
                        padding: "12px",
                        borderRadius: "16px",
                        fontSize: "15px",
                        fontWeight: 600,
                        boxShadow: "0 4px 12px rgba(36, 52, 37, 0.2)",
                    }}
                >
                    Open bag <span>→</span>
                </Link>
            </div>

            {/* Bottom line segment - from bottom node to card below */}
            <div className="flex justify-center">
                <div className="w-[2px] h-12 bg-[#E0DCD5]" />
            </div>
        </div>
    );
}

// Helper function to get background color for stacked items
function getItemBgColor(index: number): string {
    const colors = ["#FFE4E1", "#F0F8FF", "#F0FFF0", "#FFF8E1"];
    return colors[index % colors.length];
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
