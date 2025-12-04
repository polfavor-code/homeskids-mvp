import React from "react";
import Link from "next/link";
import { Item } from "@/lib/mockData";
import { CaregiverProfile, ChildProfile } from "@/lib/AppStateContext";
import ItemPhoto from "@/components/ItemPhoto";

interface TravelBagPreviewProps {
    items: Item[]; // All items
    child: ChildProfile | null;
    currentCaregiver: CaregiverProfile | undefined;
}

/**
 * Render a compact travel-bag preview for a child showing requested items associated with the current caregiver.
 *
 * Displays a title using the child's name (or "Child"), a subtitle that reflects whether there are no requested items,
 * the bag is fully packed, or how many items remain to pack at the caregiver's location, and up to two item previews
 * (unpacked items first, then packed). Also includes a link to open the full travel bag.
 *
 * @param items - Array of items to evaluate for packing and display.
 * @param child - Child profile used to build the title; may be `null`.
 * @param currentCaregiver - Caregiver used to filter items by location and to populate subtitle text; may be `undefined`.
 * @returns The JSX element for the travel-bag preview card.
 */
export default function TravelBagPreview({ items, child, currentCaregiver }: TravelBagPreviewProps) {
    // Logic:
    // If June is at Daddy's (currentCaregiver), we are packing FOR Daddy's?
    // Wait, "2 items to pack at Daddy’s Home" implies June is AT Daddy's and we need to pack things located AT Daddy's to go to Mommy's?
    // OR does it mean we are packing TO GO TO Daddy's?
    // Prompt says: "If there are requested items and June is with caregiver A: '2 items to pack at Daddy’s Home'"
    // This implies June is at A (Daddy), and we need to pack items that are AT A, to go to B.
    // So we filter items where location == currentCaregiver AND isRequestedForNextVisit == true.

    const itemsToPack = items.filter(
        (item) =>
            item.locationCaregiverId === currentCaregiver?.id &&
            item.isRequestedForNextVisit
    );

    const packedItems = itemsToPack.filter((item) => item.isPacked);
    const unpackedItems = itemsToPack.filter((item) => !item.isPacked);

    const totalRequested = itemsToPack.length;
    const isAllPacked = totalRequested > 0 && unpackedItems.length === 0;

    let title = `${child?.name || "Child"}'s travel bag`;
    let subtitle = "";

    if (totalRequested === 0) {
        subtitle = "No items requested for the next visit yet";
    } else if (isAllPacked) {
        subtitle = `Bag is ready from ${currentCaregiver?.label || "home"}`;
    } else {
        subtitle = `${unpackedItems.length} items to pack at ${currentCaregiver?.label || "home"}'s Home`;
    }

    // Show up to 2 items (prioritize unpacked)
    const previewItems = [...unpackedItems, ...packedItems].slice(0, 2);

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <div className="mb-4">
                <h3 className="font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500">{subtitle}</p>
            </div>

            {previewItems.length > 0 && (
                <div className="space-y-3 mb-4">
                    {previewItems.map((item) => (
                        <Link
                            key={item.id}
                            href={`/items/${item.id}`}
                            className="flex items-center gap-3 group"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm overflow-hidden border border-transparent group-hover:border-primary/20 transition-colors">
                                <ItemPhoto
                                    photoPath={item.photoUrl}
                                    itemName={item.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-primary transition-colors">
                                    {item.name}
                                </p>
                            </div>
                            <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.isPacked
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                    }`}
                            >
                                {item.isPacked ? "Packed" : "Requested"}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            <div className="flex justify-end">
                <Link
                    href="/travel-bag"
                    className="text-sm font-semibold text-primary hover:text-blue-600"
                >
                    Open travel bag
                </Link>
            </div>
        </div>
    );
}