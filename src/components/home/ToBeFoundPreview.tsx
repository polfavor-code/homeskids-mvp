import React from "react";
import Link from "next/link";
import { Item } from "@/lib/mockData";
import ItemPhoto from "@/components/ItemPhoto";

interface ToBeFoundPreviewProps {
    awaitingLocationItems: Item[];
}

export default function ToBeFoundPreview({ awaitingLocationItems }: ToBeFoundPreviewProps) {
    if (awaitingLocationItems.length === 0) return null;

    return (
        <div className="card-organic p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-dmSerif text-lg text-forest">Awaiting location</h3>
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">
                        {awaitingLocationItems.length}
                    </span>
                </div>
                <Link href="/items/awaiting-location" className="text-sm font-bold text-forest hover:text-forest/70 transition-colors">
                    View all →
                </Link>
            </div>

            <div className="space-y-3">
                {awaitingLocationItems.slice(0, 2).map((item) => (
                    <Link
                        key={item.id}
                        href={`/items/${item.id}`}
                        className="flex items-center gap-3 group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center text-lg overflow-hidden border border-border group-hover:border-forest/30 transition-colors">
                            <ItemPhoto
                                photoPath={item.photoUrl}
                                itemName={item.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-forest group-hover:text-forest/70 transition-colors">{item.name}</p>
                            <p className="text-xs text-textSub">Location not confirmed</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
