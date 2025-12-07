export interface Caregiver {
    id: string;
    name: string;
    label: string;
    avatarInitials: string;
    avatarColor: string;
}

export interface Item {
    id: string;
    name: string;
    category: string;
    locationCaregiverId: string | null; // Legacy: caregiver who has the item
    locationHomeId: string | null; // NEW: home where the item is located
    isRequestedForNextVisit: boolean;
    isPacked: boolean;
    isMissing: boolean;
    isRequestCanceled: boolean; // When requester cancels a packed item - packer must confirm removal
    photoUrl?: string; // Optional photo URL from Supabase Storage
    notes?: string; // Optional notes
}

export interface Child {
    id: string;
    name: string;
    avatarInitials: string;
}

export const MOCK_CHILD: Child = {
    id: "child1",
    name: "June",
    avatarInitials: "J",
};

export const MOCK_CAREGIVERS: Caregiver[] = [
    {
        id: "a1",
        name: "Paul",
        label: "Daddy",
        avatarInitials: "P",
        avatarColor: "bg-blue-500",
    },
    {
        id: "b1",
        name: "Ellis",
        label: "Mommy",
        avatarInitials: "A",
        avatarColor: "bg-pink-500",
    },
];

export const MOCK_ITEMS: Item[] = [
    // Daddy's Home (a1)
    {
        id: "i1",
        name: "Blue Teddy",
        category: "Toy",
        locationCaregiverId: "a1",
        locationHomeId: null,
        isRequestedForNextVisit: false,
        isPacked: false,
        isMissing: false,
        isRequestCanceled: false,
    },
    {
        id: "i2",
        name: "Rain Boots",
        category: "Clothing",
        locationCaregiverId: "a1",
        locationHomeId: null,
        isRequestedForNextVisit: true,
        isPacked: false, // Requested but not packed
        isMissing: false,
        isRequestCanceled: false,
    },
    {
        id: "i3",
        name: "Math Book",
        category: "School",
        locationCaregiverId: "a1",
        locationHomeId: null,
        isRequestedForNextVisit: false,
        isPacked: false,
        isMissing: false,
        isRequestCanceled: false,
    },
    // Mommy's Home (b1)
    {
        id: "i4",
        name: "Red Sweater",
        category: "Clothing",
        locationCaregiverId: "b1",
        locationHomeId: null,
        isRequestedForNextVisit: false,
        isPacked: false,
        isMissing: false,
        isRequestCanceled: false,
    },
    {
        id: "i5",
        name: "Tablet",
        category: "Electronics",
        locationCaregiverId: "b1",
        locationHomeId: null,
        isRequestedForNextVisit: true,
        isPacked: true, // Requested and packed
        isMissing: false,
        isRequestCanceled: false,
    },
    {
        id: "i6",
        name: "Soccer Ball",
        category: "Toy",
        locationCaregiverId: "b1",
        locationHomeId: null,
        isRequestedForNextVisit: false,
        isPacked: false,
        isMissing: false,
        isRequestCanceled: false,
    },
    // Missing Item
    {
        id: "i7",
        name: "Left Mitten",
        category: "Clothing",
        locationCaregiverId: "a1", // Last seen at Daddy's? Or unknown.
        locationHomeId: null,
        isRequestedForNextVisit: false,
        isPacked: false,
        isMissing: true,
        isRequestCanceled: false,
    },
];
