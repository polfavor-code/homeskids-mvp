import { Item } from "./mockData";

/**
 * Get items that need to be packed at the current location
 */
export function getToPackItems(
    items: Item[],
    currentCaregiverId: string
): Item[] {
    return items.filter(
        (item) =>
            item.isRequestedForNextVisit &&
            !item.isPacked &&
            !item.isMissing &&
            item.locationCaregiverId === currentCaregiverId
    );
}

/**
 * Get items that are packed and ready
 */
export function getPackedItems(items: Item[]): Item[] {
    return items.filter(
        (item) =>
            item.isRequestedForNextVisit && item.isPacked && !item.isMissing
    );
}

/**
 * Get items that are awaiting location confirmation
 */
export function getAwaitingLocationItems(items: Item[]): Item[] {
    return items.filter((item) => item.isMissing);
}
