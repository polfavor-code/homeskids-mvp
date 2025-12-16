"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";

interface HomeEntry {
    id: string;
    name: string;
}

export default function SetupHomePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const childId = searchParams.get("child_id");
    const inviteId = searchParams.get("invite_id");
    // These params come directly from the invite page to avoid re-querying
    const urlHomeId = searchParams.get("home_id");
    const urlHasOwnHome = searchParams.get("has_own_home") === "true";

    const { user } = useAuth();
    const { setOnboardingCompleted, refreshData } = useAppState();

    const [existingHomes, setExistingHomes] = useState<{ id: string; name: string }[]>([]);
    const [selectedHomeIds, setSelectedHomeIds] = useState<string[]>([]);
    const [newHomes, setNewHomes] = useState<HomeEntry[]>([]);
    const [childName, setChildName] = useState("");
    const [userLabel, setUserLabel] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    // Load child name, user label, and existing homes
    useEffect(() => {
        const loadData = async () => {
            if (!childId || !user) return;

            console.log("🏠 Loading setup-home data:", { childId, inviteId });

            // Get child name
            const { data: child } = await supabase
                .from("children")
                .select("name")
                .eq("id", childId)
                .single();

            if (child) {
                setChildName(child.name);
            }

            // Get user's label for default home name placeholder
            const { data: profile } = await supabase
                .from("profiles")
                .select("label, name")
                .eq("id", user.id)
                .single();

            if (profile) {
                setUserLabel(profile.label || profile.name || "");
            }

            // If coming from invite, load invite data to filter homes
            let allowedHomeIds: string[] | null = null;
            let shouldCreateOwnHome = false;

            // Check for invite data from URL params (passed from invite page)
            // or fall back to querying the database
            if (urlHomeId || urlHasOwnHome) {
                // Use URL params directly (more reliable, avoids RLS issues)
                console.log("🏠 Using URL params:", { urlHomeId, urlHasOwnHome });
                
                if (urlHomeId) {
                    allowedHomeIds = [urlHomeId];
                    setSelectedHomeIds([urlHomeId]);
                } else {
                    allowedHomeIds = [];
                }
                
                shouldCreateOwnHome = urlHasOwnHome;
                
                if (shouldCreateOwnHome) {
                    setNewHomes([{ id: crypto.randomUUID(), name: "" }]);
                }
            } else if (inviteId) {
                // Fallback: query invite from database
                const { data: invite, error: inviteError } = await supabase
                    .from("invites")
                    .select("home_id, has_own_home")
                    .eq("id", inviteId)
                    .single();

                console.log("🏠 Invite query result:", { invite, error: inviteError });

                if (invite) {
                    if (invite.home_id) {
                        allowedHomeIds = [invite.home_id];
                    } else {
                        allowedHomeIds = [];
                    }
                    
                    shouldCreateOwnHome = invite.has_own_home || false;

                    if (allowedHomeIds.length > 0) {
                        setSelectedHomeIds(allowedHomeIds);
                    }

                    if (shouldCreateOwnHome) {
                        setNewHomes([{ id: crypto.randomUUID(), name: "" }]);
                    }
                }
            }

            // Get existing homes for this child (homes already set up by other caregivers)
            const { data: childSpaces } = await supabase
                .from("child_spaces")
                .select(`
                    home_id,
                    homes (
                        id,
                        name
                    )
                `)
                .eq("child_id", childId);

            if (childSpaces && childSpaces.length > 0) {
                let homes = childSpaces
                    .map((cs: any) => cs.homes)
                    .filter(Boolean)
                    .map((h: any) => ({ id: h.id, name: h.name }));
                
                // If coming from invite, only show homes that were selected in the invite
                // allowedHomeIds is null if NOT from invite (show all), array if from invite (filter to only those)
                if (allowedHomeIds !== null) {
                    homes = homes.filter(h => allowedHomeIds!.includes(h.id));
                    console.log("🏠 Filtered to allowed homes:", homes);
                }
                
                setExistingHomes(homes);
            }

            setLoading(false);
        };

        loadData();
    }, [childId, inviteId, urlHomeId, urlHasOwnHome, user]);

    const addHome = () => {
        setNewHomes([...newHomes, { id: crypto.randomUUID(), name: "" }]);
    };

    const updateHomeName = (id: string, name: string) => {
        setNewHomes(newHomes.map(h => h.id === id ? { ...h, name } : h));
    };

    const removeHome = (id: string) => {
        setNewHomes(newHomes.filter(h => h.id !== id));
    };

    const toggleExistingHome = (homeId: string) => {
        setSelectedHomeIds(prev => 
            prev.includes(homeId) 
                ? prev.filter(id => id !== homeId)
                : [...prev, homeId]
        );
    };

    const handleConnect = async () => {
        const validNewHomes = newHomes.filter(h => h.name.trim());
        
        if (selectedHomeIds.length === 0 && validNewHomes.length === 0) {
            setError("Please select or add at least one home.");
            return;
        }

        if (!user || !childId) {
            setError("Session error. Please try again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            // 1. Connect to selected existing homes
            for (const homeId of selectedHomeIds) {
                // Add home_membership
                await supabase.from("home_memberships").upsert({
                    home_id: homeId,
                    user_id: user.id,
                    is_home_admin: false,
                }, {
                    onConflict: "home_id,user_id",
                });

                // Get child_space for this home
                const { data: childSpace } = await supabase
                    .from("child_spaces")
                    .select("id")
                    .eq("home_id", homeId)
                    .eq("child_id", childId)
                    .single();

                if (childSpace) {
                    // Grant child_space_access
                    await supabase.from("child_space_access").upsert({
                        child_space_id: childSpace.id,
                        user_id: user.id,
                        can_view_address: true,
                    }, {
                        onConflict: "child_space_id,user_id",
                    });
                }
            }

            // 2. Create new homes
            for (const home of validNewHomes) {
                const { data: newHome, error: homeError } = await supabase
                    .from("homes")
                    .insert({
                        name: home.name.trim(),
                        created_by: user.id,
                    })
                    .select()
                    .single();

                if (homeError) throw homeError;

                // Create home_membership for this user (as admin since they created it)
                await supabase.from("home_memberships").insert({
                    home_id: newHome.id,
                    user_id: user.id,
                    is_home_admin: true,
                });

                // Create child_space linking child to this home
                // IMPORTANT: Only link the specific child from the invite, not all children
                const childSpaceData: any = {
                    home_id: newHome.id,
                    child_id: childId,
                    status: "active", // Explicitly set active status
                };
                // Add audit field if this came from an invite
                if (inviteId) {
                    childSpaceData.created_by_invite_id = inviteId;
                }
                
                const { data: newChildSpace, error: csError } = await supabase
                    .from("child_spaces")
                    .insert(childSpaceData)
                    .select()
                    .single();

                if (csError) throw csError;

                // Grant child_space_access to this user
                await supabase.from("child_space_access").insert({
                    child_space_id: newChildSpace.id,
                    user_id: user.id,
                    can_view_address: true,
                });
            }

            // 3. Mark onboarding as complete
            await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", user.id);

            // 4. Mark invite as accepted (if this came from an invite flow)
            if (inviteId) {
                await supabase
                    .from("invites")
                    .update({
                        status: "accepted",
                        accepted_at: new Date().toISOString(),
                        accepted_by: user.id,
                    })
                    .eq("id", inviteId);
            }

            // 5. Update app state and redirect with full page reload
            // Full reload ensures all contexts (items, contacts, health, etc.) refresh properly
            setOnboardingCompleted(true);
            await refreshData();
            window.location.href = "/";
        } catch (err: any) {
            console.error("Error setting up homes:", err);
            setError(err.message || "Failed to set up homes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = async () => {
        if (!user) return;
        
        setSaving(true);
        try {
            await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", user.id);

            // Mark invite as accepted (if this came from an invite flow)
            if (inviteId) {
                await supabase
                    .from("invites")
                    .update({
                        status: "accepted",
                        accepted_at: new Date().toISOString(),
                        accepted_by: user.id,
                    })
                    .eq("id", inviteId);
            }

            setOnboardingCompleted(true);
            await refreshData();
            window.location.href = "/";
        } catch (err) {
            console.error("Error skipping:", err);
            window.location.href = "/";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <div className="text-forest">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">
            {/* Brand Side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                <Logo size="lg" variant="light" />
                <p className="text-lg opacity-90 mt-4 mb-8">Setup your homes for {childName || "your child"}.</p>
                <ul className="max-w-sm space-y-4">
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Connect to existing homes or add your own.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm border-b border-white/10 pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Track items as they move between homes.</span>
                    </li>
                    <li className="flex items-start gap-3 text-white/85 text-sm pb-4">
                        <span className="opacity-60 mt-0.5">→</span>
                        <span>Everyone sees the same information.</span>
                    </li>
                </ul>
            </div>

            {/* Form Side */}
            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Co-parenting made simple.</p>
                    </div>

                    {/* Progress indicator - step 2 of 2 */}
                    <div className="flex justify-center gap-2 mb-6">
                        <div className="w-2 h-2 rounded-full bg-forest" />
                        <div className="w-2 h-2 rounded-full bg-forest" />
                    </div>

                    <div className="space-y-6">
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-forest mb-2">Setup homes</h1>
                            <p className="text-gray-600">
                                Where do you take care of {childName || "your child"}?
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Unified home selection */}
                        <div className="space-y-3">
                            {/* Existing homes as selectable buttons */}
                            {existingHomes.map(home => (
                                <button
                                    key={home.id}
                                    onClick={() => toggleExistingHome(home.id)}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                                        selectedHomeIds.includes(home.id)
                                            ? "border-forest bg-softGreen/30"
                                            : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                        selectedHomeIds.includes(home.id)
                                            ? "border-forest bg-forest"
                                            : "border-gray-300"
                                    }`}>
                                        {selectedHomeIds.includes(home.id) && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-forest">{home.name}</div>
                                    </div>
                                </button>
                            ))}

                            {/* New homes added by user - styled like selected existing homes */}
                            {newHomes.map((home) => (
                                <div 
                                    key={home.id} 
                                    className="p-4 rounded-xl border-2 border-forest bg-softGreen/30 flex items-center gap-3"
                                >
                                    <div className="w-6 h-6 rounded-full border-2 border-forest bg-forest flex items-center justify-center flex-shrink-0">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={home.name}
                                        onChange={e => updateHomeName(home.id, e.target.value)}
                                        className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 font-medium text-forest placeholder-forest/50"
                                        placeholder={userLabel ? `e.g. ${userLabel}'s home` : "e.g. My home"}
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => removeHome(home.id)}
                                        className="text-forest/50 hover:text-red-500 flex-shrink-0"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            ))}

                            {/* Add another home button */}
                            <button
                                onClick={addHome}
                                type="button"
                                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-forest hover:text-forest transition-colors flex items-center justify-center gap-2"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add another home
                            </button>

                            {/* Connect button */}
                            <button
                                onClick={handleConnect}
                                disabled={saving || (selectedHomeIds.length === 0 && newHomes.every(h => !h.name.trim()))}
                                className="w-full py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50 mt-2"
                            >
                                {saving ? "Connecting..." : "Continue"}
                            </button>
                        </div>



                        {/* Skip option - always visible */}
                        <div className="text-center pt-2">
                            <button
                                onClick={handleSkip}
                                disabled={saving}
                                className="text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                Skip for now
                            </button>
                            <p className="text-xs text-gray-400 mt-1">
                                You can set this up later.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
