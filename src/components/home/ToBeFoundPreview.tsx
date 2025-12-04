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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">To be found</h3>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                        {missingItems.length}
                    </span>
                </div>
                <Link href="/items?filter=To be found" className="text-sm text-primary font-medium hover:underline">
                    View all
                </Link>
            </div>

            <div className="space-y-3">
                {missingItems.slice(0, 2).map((item) => (
                    <Link
                        key={item.id}
                        href={`/items/${item.id}`}
                        className="flex items-center gap-3 group"
                    >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg overflow-hidden border border-transparent group-hover:border-primary/20 transition-colors">
                            <ItemPhoto
                                photoPath={item.photoUrl}
                                itemName={item.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">{item.name}</p>
                            <p className="text-xs text-gray-500">Reported missing by Daddy</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
