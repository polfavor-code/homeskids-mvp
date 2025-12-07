"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/AppStateContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import { QRCodeSVG } from "qrcode.react";

// Canonical role options - used throughout the app
// Only Parent and Step-parent can create families via direct signup
const ROLE_OPTIONS = [
    { value: "parent", label: "Parent", isParentRole: true },
    { value: "step_parent", label: "Step-parent", isParentRole: true },
    { value: "family_member", label: "Family member", isParentRole: false },
    { value: "nanny", label: "Nanny", isParentRole: false },
    { value: "babysitter", label: "Babysitter", isParentRole: false },
    { value: "family_friend", label: "Family friend", isParentRole: false },
    { value: "other", label: "Other", isParentRole: false },
];

// Role options for Step 2 (Other Caregiver) - same canonical list
const OTHER_CAREGIVER_ROLE_OPTIONS = [
    { value: "parent", label: "Parent" },
    { value: "step_parent", label: "Step-parent" },
    { value: "family_member", label: "Family member" },
    { value: "nanny", label: "Nanny" },
    { value: "babysitter", label: "Babysitter" },
    { value: "family_friend", label: "Family friend" },
    { value: "other", label: "Other" },
];

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | "waiting";

// Caregiver info collected during onboarding
interface CaregiverInfo {
    id: string; // temporary ID for UI purposes
    name: string;
    label: string;
    role: string;
    isCurrentUser: boolean;
    userId?: string; // Only set for current user
    inviteToken?: string; // Set after invite is created
}

// Invite info for displaying on success screen
interface CreatedInvite {
    caregiverLabel: string;
    caregiverName: string;
    token: string;
}

// Home block with "Who lives here?" selection
interface HomeBlock {
    id: string;
    name: string;
    caregiverIds: string[]; // IDs of caregivers who live here
}

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { setOnboardingCompleted, refreshData } = useAppState();

    // Current step
    const [step, setStep] = useState<OnboardingStep>(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Step 1: About You
    const [realName, setRealName] = useState("");
    const [childCallsYou, setChildCallsYou] = useState("");
    const [selectedRole, setSelectedRole] = useState("parent");

    // Step 2: Other Caregiver (optional)
    const [wantOtherCaregiver, setWantOtherCaregiver] = useState<boolean | null>(null);
    const [otherCaregiverName, setOtherCaregiverName] = useState("");
    const [otherCaregiverLabel, setOtherCaregiverLabel] = useState("");
    const [otherCaregiverRole, setOtherCaregiverRole] = useState("parent");

    // Caregivers collected (includes current user + optional other)
    const [caregivers, setCaregivers] = useState<CaregiverInfo[]>([]);

    // Step 3: Child
    const [childName, setChildName] = useState("");

    // Step 4: Homes
    const [homeSetupType, setHomeSetupType] = useState<"multiple" | "single">("multiple");
    const [homeBlocks, setHomeBlocks] = useState<HomeBlock[]>([]);

    // Family ID (created during onboarding)
    const [familyId, setFamilyId] = useState<string | null>(null);

    // Invites created during onboarding (for showing on success screen)
    const [createdInvites, setCreatedInvites] = useState<CreatedInvite[]>([]);
    const [copiedInviteToken, setCopiedInviteToken] = useState<string | null>(null);

    // Track if user was invited (already has a family)
    const [wasInvited, setWasInvited] = useState(false);

    // Check if user already has a family (via invite)
    useEffect(() => {
        const checkExistingFamily = async () => {
            if (!user) return;

            const { data: familyMember } = await supabase
                .from("family_members")
                .select("family_id")
                .eq("user_id", user.id)
                .single();

            if (familyMember) {
                setFamilyId(familyMember.family_id);
                setWasInvited(true); // User was invited and already belongs to a family
            }
        };
        checkExistingFamily();
    }, [user]);

    // Helper to check if selected role is parent/step-parent
    const isParentRole = () => {
        const role = ROLE_OPTIONS.find(r => r.value === selectedRole);
        return role?.isParentRole ?? false;
    };

    // Initialize home blocks when caregivers change or child name changes
    // Names are empty - placeholders will show suggestions
    const initializeHomeBlocks = () => {
        const firstCaregiver = caregivers[0];
        const secondCaregiver = caregivers[1];

        if (homeSetupType === "single") {
            // Single home: empty name, all caregivers checked
            setHomeBlocks([{
                id: "home-1",
                name: "",
                caregiverIds: caregivers.map(c => c.id),
            }]);
        } else {
            // Multiple homes: empty names, appropriate caregivers checked
            setHomeBlocks([
                {
                    id: "home-1",
                    name: "",
                    caregiverIds: firstCaregiver ? [firstCaregiver.id] : [],
                },
                {
                    id: "home-2",
                    name: "",
                    caregiverIds: secondCaregiver ? [secondCaregiver.id] : (firstCaregiver ? [firstCaregiver.id] : []),
                },
            ]);
        }
    };

    // Re-initialize homes when setup type changes or entering step 4
    useEffect(() => {
        if (step === 4 && caregivers.length > 0) {
            console.log("Initializing home blocks with caregivers:", caregivers);
            initializeHomeBlocks();
        }
    }, [homeSetupType, step, caregivers.length]);

    // STEP 1: Handle About You submission
    const handleStep1Submit = async () => {
        if (!childCallsYou.trim()) {
            setError("Please enter what your child calls you.");
            return;
        }

        if (!user) {
            setError("Authentication error. Please log in again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            // Update user profile
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    name: realName.trim() || null,
                    label: childCallsYou.trim(),
                    relationship: selectedRole,
                    avatar_initials: (realName.trim() || childCallsYou.trim()).charAt(0).toUpperCase(),
                })
                .eq("id", user.id);

            if (profileError) throw profileError;

            // Check if this is a parent role OR if user was invited (already has a family)
            if (isParentRole()) {
                // Add current user as first caregiver
                setCaregivers([{
                    id: "caregiver-current",
                    name: realName.trim() || childCallsYou.trim(),
                    label: childCallsYou.trim(),
                    role: selectedRole,
                    isCurrentUser: true,
                    userId: user.id,
                }]);

                // Continue to Step 2 (Other Caregiver)
                setStep(2);
            } else if (wasInvited) {
                // User was invited - mark onboarding complete and go to dashboard
                await supabase
                    .from("profiles")
                    .update({ onboarding_completed: true })
                    .eq("id", user.id);

                setOnboardingCompleted(true);
                await refreshData();
                router.push("/");
            } else {
                // Non-parent without invite - show waiting screen
                await supabase
                    .from("profiles")
                    .update({ onboarding_completed: false })
                    .eq("id", user.id);

                setStep("waiting");
            }
        } catch (err: any) {
            console.error("Error saving profile:", err);
            setError(err.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // STEP 2: Handle Other Caregiver submission
    const handleStep2Submit = async () => {
        if (wantOtherCaregiver === true) {
            // Validate other caregiver fields
            if (!otherCaregiverLabel.trim()) {
                setError("Please enter what your child calls them.");
                return;
            }

            // Add other caregiver
            const updatedCaregivers = [...caregivers, {
                id: "caregiver-other",
                name: otherCaregiverName.trim() || otherCaregiverLabel.trim(),
                label: otherCaregiverLabel.trim(),
                role: otherCaregiverRole,
                isCurrentUser: false,
            }];
            setCaregivers(updatedCaregivers);
        }

        setError("");
        // Continue to Step 3 (Child)
        setStep(3);
    };

    // STEP 3: Handle Child submission
    const handleStep3Submit = async () => {
        console.log("Step 3 Submit - childName state value:", childName);

        if (!childName.trim()) {
            setError("Please enter your child's name.");
            return;
        }

        if (!user) {
            setError("Authentication error. Please log in again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            let currentFamilyId = familyId;

            // Create family if doesn't exist
            if (!currentFamilyId) {
                // Use child's name for family name
                const familyName = `${childName.trim()}'s Family`;
                console.log("Creating family with name:", familyName, "from childName:", childName);
                const { data: newFamily, error: familyError } = await supabase
                    .from("families")
                    .insert({
                        name: familyName,
                    })
                    .select()
                    .single();

                if (familyError) throw familyError;
                console.log("Family created:", newFamily);
                currentFamilyId = newFamily.id;
                setFamilyId(currentFamilyId);

                // Add current user as family member
                const { error: memberError } = await supabase
                    .from("family_members")
                    .insert({
                        family_id: currentFamilyId,
                        user_id: user.id,
                        role: selectedRole,
                    });

                if (memberError) throw memberError;
            }

            // Create child record
            const { error: childError } = await supabase
                .from("children")
                .insert({
                    family_id: currentFamilyId,
                    name: childName.trim(),
                    avatar_initials: childName.trim().charAt(0).toUpperCase(),
                });

            if (childError) throw childError;

            // Initialize home blocks with caregiver info
            initializeHomeBlocks();

            // Proceed to Step 4 (Homes)
            setStep(4);
        } catch (err: any) {
            console.error("Error creating child:", err);
            setError(err.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // STEP 4: Handle Homes submission
    const handleStep4Submit = async () => {
        const homesToCreate = homeSetupType === "single"
            ? [homeBlocks[0]]
            : homeBlocks;

        // Validate each home
        for (const home of homesToCreate) {
            if (!home.name.trim()) {
                setError("Please enter a name for each home.");
                return;
            }
            if (home.caregiverIds.length === 0) {
                setError("Please select at least one caregiver for each home in 'Who lives here?'");
                return;
            }
        }

        if (!user || !familyId) {
            setError("Session error. Please refresh and try again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            // Create homes with "Who lives here?" assignments
            for (let i = 0; i < homesToCreate.length; i++) {
                const home = homesToCreate[i];
                const isPrimary = i === 0;

                // Owner is the first checked caregiver
                const firstCaregiverId = home.caregiverIds[0];
                const firstCaregiver = caregivers.find(c => c.id === firstCaregiverId);

                // Determine owner_caregiver_id
                // If the first caregiver is the current user, use their userId
                // Otherwise, set to null (placeholder for invited caregiver to claim later)
                const ownerCaregiverId = firstCaregiver?.isCurrentUser ? user.id : null;

                // Build accessible_caregiver_ids for current user only (other will be added via invite)
                // Only include current user if they were actually selected for this home
                const currentUserSelected = home.caregiverIds.some(id => {
                    const c = caregivers.find(cg => cg.id === id);
                    return c?.isCurrentUser;
                });
                const accessibleCaregiverIds = currentUserSelected ? [user.id] : [];

                const { data: newHome, error: homeError } = await supabase
                    .from("homes")
                    .insert({
                        family_id: familyId,
                        name: home.name.trim(),
                        is_primary: isPrimary,
                        time_zone: "auto",
                        accessible_caregiver_ids: accessibleCaregiverIds,
                        owner_caregiver_id: ownerCaregiverId,
                    })
                    .select()
                    .single();

                if (homeError) throw homeError;

                // Create home_access entry for current user if they are checked
                const currentUserChecked = home.caregiverIds.some(id => {
                    const c = caregivers.find(cg => cg.id === id);
                    return c?.isCurrentUser;
                });

                if (currentUserChecked && newHome) {
                    await supabase
                        .from("home_access")
                        .insert({
                            home_id: newHome.id,
                            caregiver_id: user.id,
                        });
                }

                // If there's a non-current-user caregiver checked, create an invite for them
                const otherCaregiver = caregivers.find(c => !c.isCurrentUser && home.caregiverIds.includes(c.id));
                console.log("Checking for other caregiver:", {
                    homeName: home.name,
                    caregiverIds: home.caregiverIds,
                    allCaregivers: caregivers.map(c => ({ id: c.id, label: c.label, isCurrentUser: c.isCurrentUser })),
                    otherCaregiver: otherCaregiver ? { label: otherCaregiver.label, name: otherCaregiver.name } : null,
                });
                if (otherCaregiver && newHome) {
                    // Check if we already created an invite for this caregiver
                    const { data: existingInvite } = await supabase
                        .from("invites")
                        .select("id, home_ids, token")
                        .eq("family_id", familyId)
                        .eq("invitee_label", otherCaregiver.label)
                        .eq("status", "pending")
                        .single();

                    if (existingInvite) {
                        // Add this home to the existing invite
                        const updatedHomeIds = [...(existingInvite.home_ids || []), newHome.id];
                        await supabase
                            .from("invites")
                            .update({ home_ids: updatedHomeIds })
                            .eq("id", existingInvite.id);

                        // Track this invite for success screen (if not already tracked)
                        setCreatedInvites(prev => {
                            if (prev.some(inv => inv.token === existingInvite.token)) {
                                return prev;
                            }
                            return [...prev, {
                                caregiverLabel: otherCaregiver.label,
                                caregiverName: otherCaregiver.name,
                                token: existingInvite.token,
                            }];
                        });
                    } else {
                        // Create new invite
                        const token = crypto.randomUUID();
                        const { error: inviteError } = await supabase
                            .from("invites")
                            .insert({
                                family_id: familyId,
                                token: token,
                                status: "pending",
                                invitee_name: otherCaregiver.name,
                                invitee_label: otherCaregiver.label,
                                invitee_role: otherCaregiver.role,
                                home_ids: [newHome.id],
                            });

                        if (inviteError) {
                            console.error("Failed to create invite:", inviteError);
                        } else {
                            // Track this invite for the success screen
                            setCreatedInvites(prev => {
                                // Don't add duplicates
                                if (prev.some(inv => inv.caregiverLabel === otherCaregiver.label)) {
                                    return prev;
                                }
                                return [...prev, {
                                    caregiverLabel: otherCaregiver.label,
                                    caregiverName: otherCaregiver.name,
                                    token: token,
                                }];
                            });
                        }
                    }
                }
            }

            // Mark onboarding as complete
            await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", user.id);

            setOnboardingCompleted(true);
            await refreshData();
            setStep(5);
        } catch (err: any) {
            console.error("Error creating homes:", err);
            setError(err.message || "Failed to create homes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Add another home block
    const addHomeBlock = () => {
        const newId = `home-${homeBlocks.length + 1}`;
        const firstCaregiver = caregivers[0];
        setHomeBlocks([...homeBlocks, {
            id: newId,
            name: "",
            caregiverIds: firstCaregiver ? [firstCaregiver.id] : [],
        }]);
    };

    // Update home block name
    const updateHomeBlockName = (id: string, name: string) => {
        setHomeBlocks(homeBlocks.map(h => h.id === id ? { ...h, name } : h));
    };

    // Toggle caregiver in home's "Who lives here?"
    const toggleHomeCaregiver = (homeId: string, caregiverId: string) => {
        setHomeBlocks(homeBlocks.map(h => {
            if (h.id !== homeId) return h;

            const isCurrentlyChecked = h.caregiverIds.includes(caregiverId);
            let newCaregiverIds: string[];

            if (isCurrentlyChecked) {
                // Don't allow unchecking if it's the last one
                if (h.caregiverIds.length === 1) return h;
                newCaregiverIds = h.caregiverIds.filter(id => id !== caregiverId);
            } else {
                newCaregiverIds = [...h.caregiverIds, caregiverId];
            }

            return { ...h, caregiverIds: newCaregiverIds };
        }));
    };

    // Remove home block (keep at least 2 for multiple)
    const removeHomeBlock = (id: string) => {
        if (homeBlocks.length > 2) {
            setHomeBlocks(homeBlocks.filter(h => h.id !== id));
        }
    };

    // Go to dashboard
    const handleGoToDashboard = () => {
        router.push("/");
    };

    // Get step info for left panel
    const getStepInfo = () => {
        switch (step) {
            case 1:
                return {
                    title: "Welcome to homes.kids",
                    description: "Let's set up your account.",
                    bullets: [
                        "Tell us about yourself so we can personalize your experience.",
                        "Parents and step-parents can set up a family.",
                        "Other caregivers will need an invite from a parent.",
                    ],
                };
            case 2:
                return {
                    title: "Add caregivers",
                    description: "Who else cares for your child?",
                    bullets: [
                        "Add another parent or caregiver.",
                        "They'll be able to see the same information as you.",
                        "You can always add more people later.",
                    ],
                };
            case 3:
                return {
                    title: "Add your child",
                    description: "Create a shared space for your child.",
                    bullets: [
                        "We'll create a hub centered around your child.",
                        "You can add more details like photo and birthday later.",
                        "All caregivers will see the same information.",
                    ],
                };
            case 4:
                return {
                    title: "Set up homes",
                    description: "Add the places where your child stays.",
                    bullets: [
                        "Homes help organize where things are.",
                        "Choose who lives at each home.",
                        "Track items as they move between homes.",
                    ],
                };
            case 5:
                return {
                    title: "You're all set!",
                    description: "Your family hub is ready.",
                    bullets: [
                        "Start adding items to track.",
                        "Invite more caregivers from settings.",
                        "Manage homes and access anytime.",
                    ],
                };
            case "waiting":
                return {
                    title: "Account created",
                    description: "You're ready to be invited.",
                    bullets: [
                        "A parent needs to send you an invite.",
                        "Share your email with them so they can add you.",
                        "Check back later or refresh to see new invites.",
                    ],
                };
            default:
                return { title: "", description: "", bullets: [] };
        }
    };

    const stepInfo = getStepInfo();

    // Render the current step content
    const renderStepContent = () => {
        // WAITING SCREEN (non-parent path)
        if (step === "waiting") {
            return (
                <div className="text-center">
                    <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <h2 className="font-dmSerif text-2xl text-forest mb-3">
                        Waiting for an invite
                    </h2>
                    <p className="text-textSub mb-6">
                        You've created your caregiver account. A parent needs to invite you to their child's family.
                    </p>

                    <div className="bg-cream border border-border rounded-xl p-5 mb-6 text-left">
                        <h3 className="font-semibold text-forest mb-2">How to get invited:</h3>
                        <ol className="text-sm text-textSub space-y-2">
                            <li className="flex gap-2">
                                <span className="font-semibold text-forest">1.</span>
                                Ask a parent to open homes.kids
                            </li>
                            <li className="flex gap-2">
                                <span className="font-semibold text-forest">2.</span>
                                They go to Settings → Caregivers → Invite
                            </li>
                            <li className="flex gap-2">
                                <span className="font-semibold text-forest">3.</span>
                                They send you an invite link
                            </li>
                            <li className="flex gap-2">
                                <span className="font-semibold text-forest">4.</span>
                                Click the link to join the family
                            </li>
                        </ol>
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-white border border-border text-forest rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Refresh to check for invites
                    </button>
                </div>
            );
        }

        // STEP 1: About You
        if (step === 1) {
            return (
                <div className="space-y-5">
                    <div>
                        <h2 className="font-dmSerif text-2xl text-forest mb-1">About you</h2>
                        <p className="text-textSub text-sm">Tell us a bit about yourself.</p>
                        <p className="text-textSub/60 text-xs mt-1">Step 1 of 4</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-forest mb-1.5">
                            Your name
                        </label>
                        <input
                            type="text"
                            value={realName}
                            onChange={(e) => setRealName(e.target.value)}
                            placeholder="e.g., Ellis"
                            className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-forest mb-1.5">
                            What does your child call you?
                        </label>
                        <input
                            type="text"
                            value={childCallsYou}
                            onChange={(e) => setChildCallsYou(e.target.value)}
                            placeholder="e.g., Mommy, Daddy, Grandma"
                            className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-forest mb-1.5">
                            Your role
                        </label>
                        <div className="relative">
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all appearance-none cursor-pointer pr-10"
                            >
                                {ROLE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                                <svg className="h-4 w-4 text-forest/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        {!isParentRole() && !wasInvited && (
                            <p className="text-xs text-amber-600 mt-2">
                                As a {ROLE_OPTIONS.find(r => r.value === selectedRole)?.label}, you'll need an invite from a parent to join a family.
                            </p>
                        )}
                        {!isParentRole() && wasInvited && (
                            <p className="text-xs text-teal mt-2">
                                You were invited to this family. You can complete your profile and start using the app.
                            </p>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    <button
                        onClick={handleStep1Submit}
                        disabled={saving}
                        className="w-full py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Continue"}
                    </button>
                </div>
            );
        }

        // STEP 2: Other Caregiver (optional)
        if (step === 2) {
            // Initial question
            if (wantOtherCaregiver === null) {
                return (
                    <div className="space-y-5">
                        <div>
                            <h2 className="font-dmSerif text-2xl text-forest mb-1">Other caregiver</h2>
                            <p className="text-textSub text-sm">Is there another adult who also cares for your child?</p>
                            <p className="text-textSub/60 text-xs mt-1">Step 2 of 4</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => setWantOtherCaregiver(true)}
                                className="w-full py-4 bg-white border border-border rounded-xl text-left px-4 hover:bg-cream transition-colors"
                            >
                                <span className="font-semibold text-forest">Yes, add another caregiver</span>
                                <p className="text-xs text-textSub mt-1">
                                    Add another parent or caregiver
                                </p>
                            </button>
                            <button
                                onClick={() => {
                                    setWantOtherCaregiver(false);
                                    setStep(3);
                                }}
                                className="w-full py-4 bg-white border border-border rounded-xl text-left px-4 hover:bg-cream transition-colors"
                            >
                                <span className="font-semibold text-forest">No, continue</span>
                                <p className="text-xs text-textSub mt-1">
                                    You can add more caregivers later
                                </p>
                            </button>
                        </div>

                        <button
                            onClick={() => setStep(1)}
                            className="w-full py-3 border border-border rounded-xl font-medium text-forest hover:bg-white transition-colors"
                        >
                            Back
                        </button>
                    </div>
                );
            }

            // Other caregiver form
            return (
                <div className="space-y-5">
                    <div>
                        <h2 className="font-dmSerif text-2xl text-forest mb-1">Add another caregiver</h2>
                        <p className="text-textSub text-sm">Enter their details.</p>
                        <p className="text-textSub/60 text-xs mt-1">Step 2 of 4</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-forest mb-1.5">
                            Their name
                        </label>
                        <input
                            type="text"
                            value={otherCaregiverName}
                            onChange={(e) => setOtherCaregiverName(e.target.value)}
                            placeholder="e.g., Paul"
                            className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-forest mb-1.5">
                            What does your child call them?
                        </label>
                        <input
                            type="text"
                            value={otherCaregiverLabel}
                            onChange={(e) => setOtherCaregiverLabel(e.target.value)}
                            placeholder="e.g., Daddy, Mommy, Grandma"
                            className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-forest mb-1.5">
                            Their role
                        </label>
                        <div className="relative">
                            <select
                                value={otherCaregiverRole}
                                onChange={(e) => setOtherCaregiverRole(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all appearance-none cursor-pointer pr-10"
                            >
                                {OTHER_CAREGIVER_ROLE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                                <svg className="h-4 w-4 text-forest/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-textSub">
                        We'll create an invite link for them after you finish setting up.
                    </p>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setWantOtherCaregiver(null)}
                            className="px-6 py-3 border border-border rounded-xl font-medium text-forest hover:bg-white transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleStep2Submit}
                            disabled={saving}
                            className="flex-1 py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors disabled:opacity-50"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            );
        }

        // STEP 3: Child
        if (step === 3) {
            return (
                <div className="space-y-5">
                    <div>
                        <h2 className="font-dmSerif text-2xl text-forest mb-1">Add your child</h2>
                        <p className="text-textSub text-sm">Enter your child's name to get started.</p>
                        <p className="text-textSub/60 text-xs mt-1">Step 3 of 4</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-forest mb-1.5">
                            Child's name
                        </label>
                        <input
                            type="text"
                            value={childName}
                            onChange={(e) => setChildName(e.target.value)}
                            placeholder="e.g., June"
                            className="w-full px-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                        />
                        <p className="text-xs text-textSub mt-2">
                            You can add photo, birthday and notes later in Child details.
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(2)}
                            className="px-6 py-3 border border-border rounded-xl font-medium text-forest hover:bg-white transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleStep3Submit}
                            disabled={saving}
                            className="flex-1 py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Continue"}
                        </button>
                    </div>
                </div>
            );
        }

        // STEP 4: Homes with "Who lives here?"
        if (step === 4) {
            return (
                <div className="space-y-5">
                    <div>
                        <h2 className="font-dmSerif text-2xl text-forest mb-1">Set up homes</h2>
                        <p className="text-textSub text-sm">How many homes does {childName || "your child"} have?</p>
                        <p className="text-textSub/60 text-xs mt-1">Step 4 of 4</p>
                    </div>

                    {/* Home type selection */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setHomeSetupType("multiple")}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${homeSetupType === "multiple"
                                ? "bg-forest text-white"
                                : "bg-white border border-border text-forest hover:bg-cream"
                                }`}
                        >
                            Multiple homes
                        </button>
                        <button
                            type="button"
                            onClick={() => setHomeSetupType("single")}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-colors ${homeSetupType === "single"
                                ? "bg-forest text-white"
                                : "bg-white border border-border text-forest hover:bg-cream"
                                }`}
                        >
                            One home
                        </button>
                    </div>

                    {/* Home blocks */}
                    <div className="space-y-4">
                        {homeSetupType === "single" ? (
                            // Single home
                            <div className="bg-white border border-border rounded-xl p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1.5">
                                        Home name
                                    </label>
                                    <input
                                        type="text"
                                        value={homeBlocks[0]?.name || ""}
                                        onChange={(e) => updateHomeBlockName(homeBlocks[0]?.id, e.target.value)}
                                        placeholder={`e.g., ${childName || "Child"}'s home`}
                                        className="w-full px-4 py-3 bg-cream border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                                    />
                                </div>

                                {/* Who lives here? */}
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-2">
                                        Who lives here?
                                    </label>
                                    <div className="space-y-2">
                                        {caregivers.map((caregiver) => {
                                            const isChecked = homeBlocks[0]?.caregiverIds.includes(caregiver.id) || false;
                                            return (
                                                <label
                                                    key={caregiver.id}
                                                    className="flex items-center gap-3 p-3 bg-cream/50 rounded-xl cursor-pointer hover:bg-cream transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleHomeCaregiver(homeBlocks[0]?.id, caregiver.id)}
                                                        className="w-5 h-5 rounded border-border text-forest focus:ring-forest/30"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-forest">{caregiver.label}</p>
                                                        {caregiver.name !== caregiver.label && (
                                                            <p className="text-xs text-textSub">{caregiver.name}</p>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Multiple homes
                            <>
                                {homeBlocks.map((home, index) => {
                                    // Get placeholder based on index and caregivers
                                    const getPlaceholder = () => {
                                        const caregiver = caregivers[index];
                                        if (caregiver) {
                                            return `e.g., ${caregiver.label}'s home`;
                                        }
                                        return "e.g., Home name";
                                    };

                                    return (
                                    <div key={home.id} className="bg-white border border-border rounded-xl p-4 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-forest">Home {index + 1}</span>
                                            {index > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeHomeBlock(home.id)}
                                                    className="text-xs text-red-500 hover:text-red-600"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-forest mb-1.5">
                                                Home name
                                            </label>
                                            <input
                                                type="text"
                                                value={home.name}
                                                onChange={(e) => updateHomeBlockName(home.id, e.target.value)}
                                                placeholder={getPlaceholder()}
                                                className="w-full px-4 py-3 bg-cream border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
                                            />
                                        </div>

                                        {/* Who lives here? */}
                                        <div>
                                            <label className="block text-sm font-medium text-forest mb-2">
                                                Who lives here?
                                            </label>
                                            <div className="space-y-2">
                                                {caregivers.map((caregiver) => {
                                                    const isChecked = home.caregiverIds.includes(caregiver.id);
                                                    return (
                                                        <label
                                                            key={caregiver.id}
                                                            className="flex items-center gap-3 p-3 bg-cream/50 rounded-xl cursor-pointer hover:bg-cream transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleHomeCaregiver(home.id, caregiver.id)}
                                                                className="w-5 h-5 rounded border-border text-forest focus:ring-forest/30"
                                                            />
                                                            <div>
                                                                <p className="text-sm font-medium text-forest">{caregiver.label}</p>
                                                                {caregiver.name !== caregiver.label && (
                                                                    <p className="text-xs text-textSub">{caregiver.name}</p>
                                                                )}
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}

                                <button
                                    type="button"
                                    onClick={addHomeBlock}
                                    className="w-full py-3 border-2 border-dashed border-forest/30 rounded-xl text-sm font-medium text-forest hover:border-forest hover:bg-softGreen/20 transition-colors"
                                >
                                    + Add another home
                                </button>
                            </>
                        )}
                    </div>

                    <p className="text-xs text-textSub">
                        Addresses and notes can be added later in Home Setup.
                    </p>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setStep(3)}
                            className="px-6 py-3 border border-border rounded-xl font-medium text-forest hover:bg-white transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleStep4Submit}
                            disabled={saving}
                            className="flex-1 py-3.5 bg-forest text-white rounded-xl font-semibold hover:bg-teal transition-colors disabled:opacity-50"
                        >
                            {saving ? "Creating homes..." : "Finish setup"}
                        </button>
                    </div>
                </div>
            );
        }

        // STEP 5: Finish
        if (step === 5) {
            const handleCopyInviteLink = (token: string) => {
                const link = `${window.location.origin}/invite/${token}`;
                navigator.clipboard.writeText(link);
                setCopiedInviteToken(token);
                setTimeout(() => setCopiedInviteToken(null), 2000);
            };

            return (
                <div>
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-softGreen rounded-full flex items-center justify-center mx-auto mb-5">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h2 className="font-dmSerif text-3xl text-forest mb-3">
                            You're all set!
                        </h2>
                        <p className="text-textSub text-base">
                            Your family hub for {childName || "your child"} is ready.
                        </p>
                    </div>

                    {/* Invite cards for created invites */}
                    {createdInvites.length > 0 && (
                        <div className="space-y-4 mb-8">
                            {createdInvites.map((invite) => {
                                const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${invite.token}`;
                                const isCopied = copiedInviteToken === invite.token;

                                return (
                                    <div key={invite.token} className="bg-white border border-border rounded-xl p-5">
                                        <h3 className="font-semibold text-forest text-lg mb-1">
                                            Invite {invite.caregiverName}
                                        </h3>
                                        <p className="text-sm text-textSub mb-5">
                                            Share this link or QR code so they can join your family.
                                        </p>

                                        <div className="flex flex-col sm:flex-row gap-4 items-center">
                                            {/* QR Code */}
                                            <div className="bg-cream p-3 rounded-xl border border-border/50 flex-shrink-0">
                                                <QRCodeSVG
                                                    value={inviteLink}
                                                    size={100}
                                                    level="M"
                                                />
                                            </div>

                                            {/* Link and copy button */}
                                            <div className="flex-1 w-full">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={inviteLink}
                                                    className="w-full px-3 py-2.5 bg-cream border border-border rounded-lg text-sm font-mono text-forest mb-3"
                                                />
                                                <button
                                                    onClick={() => handleCopyInviteLink(invite.token)}
                                                    className={`w-full py-3 rounded-xl font-medium text-base transition-colors ${
                                                        isCopied
                                                            ? "bg-softGreen text-forest"
                                                            : "bg-cream border border-border text-forest hover:bg-white"
                                                    }`}
                                                >
                                                    {isCopied ? "Copied!" : "Copy invite link"}
                                                </button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-textSub/70 mt-4 text-center">
                                            You can always find this later in Settings → Caregivers.
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <button
                        onClick={handleGoToDashboard}
                        className="w-full py-4 bg-forest text-white rounded-xl font-semibold text-base hover:bg-teal transition-colors"
                    >
                        Go to dashboard
                    </button>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen flex">
            {/* Brand Side - Gradient */}
            <div className="hidden lg:flex flex-1 bg-gradient-to-br from-forest via-[#3D5A40] to-teal flex-col items-center justify-center p-12 text-white">
                <Logo size="lg" variant="light" />

                <p className="text-lg opacity-90 mt-4 mb-8">{stepInfo.description}</p>

                <ul className="max-w-sm space-y-4">
                    {stepInfo.bullets.map((bullet, index) => (
                        <li
                            key={index}
                            className={`flex items-start gap-3 text-white/85 text-sm ${index < stepInfo.bullets.length - 1 ? "border-b border-white/10 pb-4" : "pb-4"
                                }`}
                        >
                            <span className="opacity-60 mt-0.5">→</span>
                            <span>{bullet}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Form Side */}
            <div className="flex-1 bg-cream flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Logo size="md" variant="dark" />
                        <p className="text-textSub text-sm mt-2">Co-parenting central hub.</p>
                    </div>

                    {renderStepContent()}
                </div>
            </div>
        </div>
    );
}
