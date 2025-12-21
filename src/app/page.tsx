"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import AwaitingLocationAlert from "@/components/home/MissingItemAlert";
import HomesHorizontalSection from "@/components/home/HomesHorizontalSection";
import WelcomeDashboard from "@/components/home/WelcomeDashboard";
import SetupSteps from "@/components/home/SetupSteps";
import NoHomeAccessEmptyState from "@/components/NoHomeAccessEmptyState";
import { ToastContainer, ToastData } from "@/components/Toast";
import { useItems } from "@/lib/ItemsContext";
import { useAppState } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import { useHealth } from "@/lib/HealthContext";
import { useContacts } from "@/lib/ContactsContext";
import { useDocuments } from "@/lib/DocumentsContext";
import { useEnsureOnboarding } from "@/lib/useEnsureOnboarding";
import { useHomeSwitchAlert } from "@/lib/HomeSwitchAlertContext";

export default function Home() {
    useEnsureOnboarding();
    const router = useRouter();

    const { user, loading: authLoading } = useAuth();
    const { items, isLoaded: itemsLoaded } = useItems();
    const {
        child,
        caregivers,
        homes,
        accessibleHomes, // Homes the current user can access (filtered by home_memberships)
        currentHomeId,
        isChildAtUserHome, // True if child is at logged-in user's home
        switchChildHomeAndMovePackedItems,
        currentJuneCaregiverId, // Legacy fallback
        inviteInfo, // Info about who invited this user (for no-home-access state)
        isLoaded: appStateLoaded,
        currentChildId,
        childSpaces
    } = useAppState();

    // #region agent log
    // Get child_space IDs for the current child to filter items
    const currentChildSpaceIds = React.useMemo(() => {
        if (!currentChildId || !childSpaces) return [];
        return childSpaces.filter((cs: any) => cs.childId === currentChildId).map((cs: any) => cs.id);
    }, [currentChildId, childSpaces]);
    
    // Filter items to only show those for the current child
    const currentChildItems = React.useMemo(() => {
        if (currentChildSpaceIds.length === 0) return items;
        return items.filter(item => currentChildSpaceIds.includes(item.childSpaceId));
    }, [items, currentChildSpaceIds]);
    
    // Debug instrumentation
    React.useEffect(() => {
        if (itemsLoaded && appStateLoaded) {
            fetch('http://127.0.0.1:7243/ingest/53bbbc81-700c-4dc6-a9fa-0e7f21e94415',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:dashboard',message:'Items count debug POST-FIX',data:{allItemsLength:items.length,currentChildItemsLength:currentChildItems.length,displayedCount:currentChildItems.length,childName:child?.name,currentChildId},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
        }
    }, [items, itemsLoaded, appStateLoaded, currentChildId, currentChildSpaceIds, currentChildItems, child]);
    // #endregion

    // Health context for health step
    const {
        healthStatus,
        isHealthReviewed,
        isAllSkipped,
        skipAllHealthForNow,
        isLoaded: healthLoaded
    } = useHealth();

    // Contacts context for roadmap
    const { contacts, isLoaded: contactsLoaded } = useContacts();

    // Documents context for roadmap
    const { documents, isLoaded: documentsLoaded } = useDocuments();

    // Toast state (for errors and info messages)
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const [switchingHomeId, setSwitchingHomeId] = useState<string | null>(null);

    // Home switch alert (shows to all caregivers in realtime)
    const { showLocalAlert } = useHomeSwitchAlert();

    const addToast = useCallback((toast: Omit<ToastData, "id">) => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { ...toast, id }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Handle switching homes
    const handleSwitchHome = async (targetHomeId: string) => {
        setSwitchingHomeId(targetHomeId);

        const result = await switchChildHomeAndMovePackedItems(targetHomeId);

        setSwitchingHomeId(null);

        if (result.alreadyAtHome) {
            addToast({
                title: "Already here",
                message: `${result.childName} is already set to this home.`,
                type: "info",
            });
            return;
        }

        if (!result.success) {
            addToast({
                title: "Error",
                message: result.error || "Failed to switch home. Please try again.",
                type: "error",
            });
            return;
        }

        // Show alert using the new realtime alert system (visible to all caregivers)
        showLocalAlert({
            childName: result.childName,
            fromHomeName: result.fromHomeName,
            toHomeName: result.toHomeName,
            toHomeId: targetHomeId,
            movedCount: result.movedCount,
        });
    };

    // Get current home - must be a home the user can ACCESS
    const currentHome = accessibleHomes.length > 0
        ? (accessibleHomes.find((h) => h.id === currentHomeId) ?? accessibleHomes[0])
        : undefined;

    // Legacy fallback for current caregiver (for travel bag, etc.)
    const currentCaregiver = caregivers.length
        ? (caregivers.find((c) => c.id === currentJuneCaregiverId) ?? caregivers[0])
        : undefined;

    // Filter missing items (from current child's items only)
    const missingItems = currentChildItems.filter((item) => item.isMissing);

    // Separate current home and other accessible homes (only show homes user can access)
    // FIX: Use currentHome.id instead of currentHomeId to ensure consistency
    // This prevents the same home appearing as both current AND destination
    const activeHome = currentHome;
    const otherHomes = accessibleHomes.filter((h) => h.id !== currentHome?.id);

    // Get items for a specific home (NEW: by home_id)
    // Falls back to caregiver-based location for items without home_id
    // Uses currentChildItems to only show items for the active child
    const getItemsForHome = (homeId: string) => {
        const home = homes.find(h => h.id === homeId);
        return currentChildItems.filter((item) => {
            if (item.isMissing) return false;
            // Primary: check location_home_id
            if (item.locationHomeId === homeId) return true;
            // Fallback: check if item's caregiver is the home owner
            if (home?.ownerCaregiverId && item.locationCaregiverId === home.ownerCaregiverId) return true;
            // Fallback: check if item's caregiver is in home's accessible caregivers
            if (item.locationCaregiverId && home?.accessibleCaregiverIds?.includes(item.locationCaregiverId)) return true;
            return false;
        });
    };

    // Get owner caregiver for a home
    const getOwnerCaregiver = (home: typeof homes[0]) => {
        return caregivers.find(c => c.id === home.ownerCaregiverId);
    };

    // Get valid caregiver count for a home (only count caregivers that exist)
    const getValidCaregiverCount = (home: typeof homes[0]) => {
        return (home.accessibleCaregiverIds || []).filter(id =>
            caregivers.some(c => c.id === id)
        ).length;
    };

    // Show loading state while auth/data is loading to prevent flash of content
    if (authLoading || !appStateLoaded || !itemsLoaded || !contactsLoaded || !documentsLoaded) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest"></div>
            </div>
        );
    }

    // Only show content if user is authenticated (otherwise will redirect via useEnsureOnboarding)
    if (!user) {
        return null;
    }

    // If user has no accessible homes, show appropriate empty state
    if (accessibleHomes.length === 0) {
        // If user was invited but has no home access, show the invited caregiver empty state
        if (inviteInfo) {
            return (
                <AppShell>
                    <NoHomeAccessEmptyState
                        inviterName={inviteInfo.inviterName}
                        onCreateHome={() => router.push("/setup-home?new=true")}
                        onWaitForAccess={() => {
                            // Could show a toast or just stay on the page
                            addToast({
                                title: "Got it!",
                                message: `We'll let you know when ${inviteInfo.inviterName} adds you to a home.`,
                                type: "info",
                            });
                        }}
                    />
                    {/* Toast notifications - needed for addToast to render */}
                    <ToastContainer toasts={toasts} onDismiss={removeToast} />
                </AppShell>
            );
        }

        // Otherwise, show the standard "set up your homes" prompt
        return (
            <AppShell>
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-20 h-20 bg-softGreen rounded-full flex items-center justify-center text-4xl mb-6">
                        🏠
                    </div>
                    <h2 className="text-xl font-dmSerif text-forest mb-2">
                        Set up your homes
                    </h2>
                    <p className="text-textSub mb-8 max-w-xs mx-auto">
                        Add the homes where {child?.name || "your child"} stays to start tracking their things.
                    </p>
                    <Link
                        href="/settings/homes?add=true"
                        className="btn-primary"
                    >
                        Add your first home
                    </Link>
                </div>
            </AppShell>
        );
    }

    // Global empty state for items - Show generic welcome dashboard
    if (currentChildItems.length === 0) {
        // Get current user's first name only (e.g. "Paul")
        const currentUser = caregivers.find(c => c.isCurrentUser);
        const welcomeUserName = (currentUser?.name?.split(' ')[0]) || (user?.user_metadata?.name?.split(' ')[0]) || 'there';

        return (
            <AppShell>
                <WelcomeDashboard
                    userName={welcomeUserName}
                    childName={child?.name || "your child"}
                />
            </AppShell>
        );
    }

    // Get current user's first name only (e.g. "Paul")
    const currentUser = caregivers.find(c => c.isCurrentUser);
    const userName = (currentUser?.name?.split(' ')[0]) || (user?.user_metadata?.name?.split(' ')[0]) || 'there';

    // Get requested items count and who requested them (from current child's items only)
    const requestedItems = currentChildItems.filter(item => item.isRequestedForNextVisit && !item.isMissing);
    const requestedByOthers = requestedItems.filter(item => item.requestedBy && item.requestedBy !== currentUser?.id);

    // Find who requested items (get the first requester's name for simplicity)
    const getRequesterName = () => {
        if (requestedByOthers.length === 0) return null;
        const requesterId = requestedByOthers[0].requestedBy;
        const requester = caregivers.find(c => c.id === requesterId);
        return requester?.name || requester?.label || null;
    };

    // Get the home where the child currently is (for display when not at user's home)
    const childCurrentHome = accessibleHomes.find(h => h.id === currentHomeId);
    const childHomeOwner = childCurrentHome ? caregivers.find(c => c.id === childCurrentHome.ownerCaregiverId) : null;

    // Build dynamic subtitle
    const getDynamicSubtitle = () => {
        const childName = child?.name || "Your child";

        if (isChildAtUserHome) {
            // Child is at user's home
            const requesterName = getRequesterName();
            if (requestedByOthers.length > 0 && requesterName) {
                return (
                    <>
                        {childName} is staying at your home.<br />
                        {requesterName} requested {requestedByOthers.length} {requestedByOthers.length === 1 ? 'item' : 'items'} to pack.
                    </>
                );
            }
            return (
                <>
                    {childName} is staying at your home.<br />
                    Everything is up to date.
                </>
            );
        } else {
            // Child is at another home
            const homeName = childCurrentHome?.name || "another home";
            return (
                <>
                    {childName} is at {homeName}.<br />
                    Request items for the next stay at yours.
                </>
            );
        }
    };

    return (
        <AppShell>
            {/* Dashboard Content */}
            <div>
                {/* Header Section - V6 Style */}
                <div className="grid grid-cols-[1fr_auto] gap-5 mb-3 items-start mt-3">
                    <div className="greeting-col">
                        <h1 className="font-dmSerif text-4xl text-forest leading-none mb-2">
                            Hi {userName},
                        </h1>
                        <p className="text-sm text-forest/60 leading-relaxed">
                            {getDynamicSubtitle()}
                        </p>
                    </div>

                    {/* Stats Box - Links to all items */}
                    <Link
                        href="/items"
                        className="bg-white p-4 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] text-right min-w-[100px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-shadow"
                    >
                        <span className="block text-2xl font-bold text-forest leading-none mb-1">
                            {currentChildItems.length}
                        </span>
                        <span className="text-[11px] text-forest/60 uppercase font-bold tracking-wide">
                            ITEMS TOTAL
                        </span>
                    </Link>
                </div>

                {/* Action Buttons Row - Tighter spacing to divider */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <Link
                        href="/items/new"
                        className="bg-forest text-white px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap hover:bg-forest/90 transition-colors border border-forest"
                    >
                        + New item
                    </Link>
                    {/* Only show "Request to pack" when child is NOT at the logged-in user's home */}
                    {!isChildAtUserHome && (
                        <Link
                            href="/items/travel-bag"
                            className="bg-transparent border border-forest text-forest px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap hover:bg-forest hover:text-white transition-colors"
                        >
                            Request to pack
                        </Link>
                    )}
                    <Link
                        href="/settings/caregivers?invite=true"
                        className="bg-transparent border border-forest text-forest px-5 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap hover:bg-forest hover:text-white transition-colors"
                    >
                        Invite caregiver
                    </Link>
                </div>

                {/* Awaiting Location Alert - Inline */}
                {missingItems.length > 0 && (
                    <div className="mb-6">
                        <AwaitingLocationAlert awaitingLocationItems={missingItems} />
                    </div>
                )}

                {/* Section Header with Decorative Line */}
                <div className="text-center mb-6 relative">
                    {/* Decorative line behind - Darker as requested */}
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/10 -translate-y-1/2 z-0" />
                    {/* Title on top of line */}
                    <h2 className="font-dmSerif text-xl text-forest bg-cream inline-block px-4 relative z-10">
                        Homes for {child?.name || "Child"}
                    </h2>
                </div>

                {/* Horizontal Homes Section */}
                <HomesHorizontalSection
                    activeHome={activeHome}
                    otherHomes={otherHomes}
                    child={child}
                    caregivers={caregivers}
                    getItemsForHome={getItemsForHome}
                    getOwnerCaregiver={getOwnerCaregiver}
                    getValidCaregiverCount={getValidCaregiverCount}
                    onSwitchHome={handleSwitchHome}
                    switchingHomeId={switchingHomeId}
                    items={currentChildItems}
                    currentCaregiver={currentCaregiver}
                />

                {/* Bottom Advisor - Setup Steps (Dynamic) */}
                <SetupSteps
                    child={child}
                    items={currentChildItems}
                    caregivers={caregivers}
                    healthStatus={healthStatus}
                    isHealthReviewed={isHealthReviewed}
                    isAllSkipped={isAllSkipped}
                    healthLoaded={healthLoaded}
                    skipAllHealthForNow={skipAllHealthForNow}
                    addToast={addToast}
                />
            </div>

            {/* Toast notifications */}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </AppShell>
    );
}
