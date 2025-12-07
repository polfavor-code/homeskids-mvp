import React from "react";
import Link from "next/link";
import { Item } from "@/lib/mockData";
import ItemPhoto from "@/components/ItemPhoto";

interface ToBeFoundPreviewProps {
    missingItems: Item[];
}

export default function ToBeFoundPreview({ missingItems }: ToBeFoundPreviewProps) {
    if (missingItems.length === 0) return null;

    return (
        <div className="card-organic p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-dmSerif text-lg text-forest">To be found</h3>
                    <span className="bg-terracotta/20 text-terracotta text-xs font-bold px-2.5 py-1 rounded-full">
                        {missingItems.length}
                    </span>
                </div>
                <Link href="/items?filter=To be found" className="text-sm font-bold text-forest hover:text-terracotta transition-colors">
                    View all →
                </Link>
            </div>

            <div className="space-y-3">
                {missingItems.slice(0, 2).map((item) => (
                    <Link
                        key={item.id}
                        href={`/items/${item.id}`}
                        className="flex items-center gap-3 group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center text-lg overflow-hidden border border-border group-hover:border-terracotta/30 transition-colors">
                            <ItemPhoto
                                photoPath={item.photoUrl}
                                itemName={item.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-forest group-hover:text-terracotta transition-colors">{item.name}</p>
                            <p className="text-xs text-textSub">Reported missing</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
