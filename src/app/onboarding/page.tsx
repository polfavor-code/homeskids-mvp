"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useAppState } from "@/lib/AppStateContext";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import MobileSelect from "@/components/MobileSelect";
import { QRCodeSVG } from "qrcode.react";

// ==============================================
// V3 ONBOARDING - Clean 5-Step Flow
// ==============================================
// Step 1: About You
// Step 2: Your Child(ren)
// Step 3: Your Home(s)
// Step 4: Caregivers (optional)
// Step 5: Finished (with conditional invites)
// ==============================================

const USER_ROLE_OPTIONS = [
    { value: "parent", label: "Parent" },
    { value: "step_parent", label: "Step-parent" },
    { value: "family_member", label: "Family member" },
    { value: "babysitter", label: "Babysitter" },
    { value: "nanny", label: "Nanny" },
    { value: "other", label: "Other" },
];

const CAREGIVER_ROLE_OPTIONS = [
    { value: "parent", label: "Parent" },
    { value: "step_parent", label: "Step-parent" },
    { value: "babysitter", label: "Babysitter" },
    { value: "nanny", label: "Nanny" },
    { value: "family_member", label: "Family member" },
    { value: "family_friend", label: "Family friend" },
];

type UserRole = "parent" | "step_parent" | "family_member" | "babysitter" | "nanny" | "other";
type CaregiverRole = "parent" | "step_parent" | "babysitter" | "nanny" | "family_member" | "family_friend";

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface ChildEntry {
    id: string;
    name: string;
}

interface HomeEntry {
    id: string;
    name: string;
    manuallyEdited: boolean;
}

// Per-child relationship for a caregiver
interface ChildRelationship {
    childId: string;
    role: CaregiverRole;
    childCallsThem: string;
}

interface CaregiverEntry {
    id: string;
    name: string;
    relationships: ChildRelationship[]; // Per-child role and label
    inviteToken?: string;
}

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { setOnboardingCompleted, refreshData } = useAppState();

    const [step, setStep] = useState<OnboardingStep>(1);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Step 1: About You
    const [fullName, setFullName] = useState("");
    const [userRole, setUserRole] = useState<UserRole>("parent");
    const [childCallsYou, setChildCallsYou] = useState("");

    // Step 2: Your Child(ren)
    const [children, setChildren] = useState<ChildEntry[]>([
        { id: crypto.randomUUID(), name: "" }
    ]);

    // Step 3: Your Home(s)
    const [homes, setHomes] = useState<HomeEntry[]>([
        { id: crypto.randomUUID(), name: "", manuallyEdited: false }
    ]);

    // Step 4: Caregivers
    const [wantsToAddCaregivers, setWantsToAddCaregivers] = useState<boolean | null>(null);
    const [caregivers, setCaregivers] = useState<CaregiverEntry[]>([]);

    // Created IDs (for database references)
    const [createdChildIds, setCreatedChildIds] = useState<string[]>([]);
    const [createdHomeIds, setCreatedHomeIds] = useState<string[]>([]);

    // Clipboard state for invite links
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Debug: log user info
    useEffect(() => {
        console.log("[Onboarding] User:", user?.id, user?.email);
    }, [user]);

    // Check if already onboarded
    useEffect(() => {
        const checkStatus = async () => {
            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("onboarding_completed")
                .eq("id", user.id)
                .single();

            if (profile?.onboarding_completed) {
                router.push("/");
            }
        };
        checkStatus();
    }, [user, router]);

    // Helper to generate home name with proper grammar and capitalization
    const generateHomeName = (label: string) => {
        if (!label) return "";
        const trimmed = label.trim();
        // Capitalize the first letter
        const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        if (capitalized.endsWith("s")) {
            return `${capitalized}' home`;
        }
        return `${capitalized}'s home`;
    };

    // Auto-suggest first home name when childCallsYou changes
    useEffect(() => {
        if (childCallsYou && homes.length > 0 && !homes[0].manuallyEdited) {
            setHomes(prevHomes => [
                { ...prevHomes[0], name: generateHomeName(childCallsYou) },
                ...prevHomes.slice(1)
            ]);
        }
    }, [childCallsYou]);

    // Get children names for display
    const getChildrenDisplayText = () => {
        const names = children.filter(c => c.name.trim()).map(c => c.name.trim());
        if (names.length === 0) return "your children";
        if (names.length === 1) return names[0];
        if (names.length === 2) return `${names[0]} & ${names[1]}`;
        return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
    };

    // ==========================================
    // STEP 1: About You
    // ==========================================
    const handleStep1Submit = async () => {
        if (!fullName.trim()) {
            setError("Please enter your full name.");
            return;
        }
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
            const { error: profileError } = await supabase
                .from("profiles")
                .upsert({
                    id: user.id,
                    name: fullName.trim(),
                    label: childCallsYou.trim(),
                    relationship: userRole,
                    avatar_initials: fullName.trim().charAt(0).toUpperCase(),
                });

            if (profileError) throw profileError;

            setStep(2);
        } catch (err: any) {
            setError(err.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ==========================================
    // STEP 2: Your Child(ren)
    // ==========================================
    const addChild = () => {
        setChildren([...children, { id: crypto.randomUUID(), name: "" }]);
    };

    const updateChild = (id: string, name: string) => {
        setChildren(children.map(c => c.id === id ? { ...c, name } : c));
    };

    const removeChild = (id: string) => {
        if (children.length > 1) {
            setChildren(children.filter(c => c.id !== id));
        }
    };

    const handleStep2Submit = async () => {
        const validChildren = children.filter(c => c.name.trim());
        if (validChildren.length === 0) {
            setError("Please enter at least one child's name.");
            return;
        }
        if (!user) {
            setError("Authentication error. Please log in again.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            const childIds: string[] = [];
            const updatedChildren: ChildEntry[] = [];

            // First, check for existing children this user has access to (prevent duplicates)
            const { data: existingAccess } = await supabase
                .from("child_access")
                .select("child_id, children(id, name)")
                .eq("user_id", user.id);

            // Build a map of child names to their data (children is an object, not array)
            const existingChildMap = new Map<string, { id: string; name: string }>();
            for (const ca of (existingAccess || []) as any[]) {
                const childName = ca.children?.name?.toLowerCase().trim();
                if (childName && ca.children?.id) {
                    existingChildMap.set(childName, { id: ca.children.id, name: ca.children.name });
                }
            }

            for (const child of validChildren) {
                const childNameLower = child.name.trim().toLowerCase();

                // Skip if child with this name already exists for this user
                const existingChild = existingChildMap.get(childNameLower);
                if (existingChild) {
                    childIds.push(existingChild.id);
                    updatedChildren.push({
                        id: existingChild.id,
                        name: child.name.trim(),
                    });
                    continue;
                }

                // Create new child
                const { data: newChild, error: childError } = await supabase
                    .from("children")
                    .insert({
                        name: child.name.trim(),
                        created_by: user.id,
                    })
                    .select()
                    .single();

                if (childError) throw childError;
                childIds.push(newChild.id);
                
                // Update child entry with real database ID
                updatedChildren.push({
                    id: newChild.id, // Use real database ID
                    name: child.name.trim(),
                });

                // Add current user as guardian with child_access (upsert to prevent duplicates)
                const { error: accessError } = await supabase
                    .from("child_access")
                    .upsert({
                        child_id: newChild.id,
                        user_id: user.id,
                        role_type: "guardian",
                        access_level: "manage",
                    }, {
                        onConflict: "child_id,user_id",
                    });

                if (accessError) {
                    console.error("Error creating child_access:", accessError);
                }

                // Add to map to prevent duplicates within same submission
                existingChildMap.set(childNameLower, { id: newChild.id, name: child.name.trim() });
            }

            setCreatedChildIds(childIds);
            // Update children state with real database IDs
            setChildren(updatedChildren);
            setStep(3);
        } catch (err: any) {
            console.error("Error creating children:", err);
            setError(err.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ==========================================
    // STEP 3: Your Home(s)
    // ==========================================
    const addHome = () => {
        setHomes([...homes, { id: crypto.randomUUID(), name: "", manuallyEdited: false }]);
    };

    const updateHome = (id: string, name: string, manuallyEdited: boolean = true) => {
        setHomes(homes.map(h => h.id === id ? { ...h, name, manuallyEdited } : h));
    };

    const removeHome = (id: string) => {
        if (homes.length > 1) {
            setHomes(homes.filter(h => h.id !== id));
        }
    };

    const handleStep3Submit = async () => {
        const validHomes = homes.filter(h => h.name.trim());
        if (validHomes.length === 0) {
            setError("Please enter at least one home name.");
            return;
        }
        if (!user || createdChildIds.length === 0) {
            setError("Session error. Please refresh and try again.");
            return;
        }

        // Check for duplicate home names
        const homeNames = validHomes.map(h => h.name.trim().toLowerCase());
        const uniqueNames = new Set(homeNames);
        if (uniqueNames.size !== homeNames.length) {
            setError("Home names must be unique.");
            return;
        }

        setError("");
        setSaving(true);

        try {
            const homeIds: string[] = [];

            for (const home of validHomes) {
                // Create home
                const { data: newHome, error: homeError } = await supabase
                    .from("homes")
                    .insert({
                        name: home.name.trim(),
                        created_by: user.id,
                    })
                    .select()
                    .single();

                if (homeError) throw homeError;
                homeIds.push(newHome.id);

                // Create home_membership for current user
                await supabase.from("home_memberships").insert({
                    home_id: newHome.id,
                    user_id: user.id,
                    is_home_admin: true,
                });

                // Link each child to this home (child_space)
                for (const childId of createdChildIds) {
                    const { data: newChildSpace, error: csError } = await supabase
                        .from("child_spaces")
                        .insert({
                            home_id: newHome.id,
                            child_id: childId,
                        })
                        .select()
                        .single();

                    if (csError) {
                        console.error("Error creating child_space:", csError);
                        continue;
                    }

                    // Grant current user child_space_access
                    await supabase.from("child_space_access").insert({
                        child_space_id: newChildSpace.id,
                        user_id: user.id,
                        can_view_address: true,
                    });
                }
            }

            setCreatedHomeIds(homeIds);
            setHomes(validHomes);
            setStep(4);
        } catch (err: any) {
            console.error("Error creating homes:", err);
            setError(err.message || "Failed to create home. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ==========================================
    // STEP 4: Caregivers
    // ==========================================
    const addCaregiver = () => {
        // Create default relationships for all children
        const defaultRelationships: ChildRelationship[] = children.map(child => ({
            childId: child.id,
            role: "parent" as CaregiverRole,
            childCallsThem: "",
        }));
        
        setCaregivers([
            ...caregivers,
            {
                id: crypto.randomUUID(),
                name: "",
                relationships: defaultRelationships,
            },
        ]);
    };

    const updateCaregiverName = (caregiverId: string, name: string) => {
        setCaregivers(caregivers.map(c => 
            c.id === caregiverId ? { ...c, name } : c
        ));
    };

    // Toggle a child for a caregiver (add/remove relationship)
    const toggleChildForCaregiver = (caregiverId: string, childId: string) => {
        setCaregivers(caregivers.map(c => {
            if (c.id !== caregiverId) return c;
            
            const existingIdx = c.relationships.findIndex(r => r.childId === childId);
            if (existingIdx >= 0) {
                // Remove this child
                return {
                    ...c,
                    relationships: c.relationships.filter(r => r.childId !== childId),
                };
            } else {
                // Add this child with default values
                return {
                    ...c,
                    relationships: [
                        ...c.relationships,
                        { childId, role: "parent" as CaregiverRole, childCallsThem: "" },
                    ],
                };
            }
        }));
    };

    // Update a specific relationship field
    const updateRelationship = (
        caregiverId: string, 
        childId: string, 
        field: "role" | "childCallsThem", 
        value: string
    ) => {
        setCaregivers(caregivers.map(c => {
            if (c.id !== caregiverId) return c;
            return {
                ...c,
                relationships: c.relationships.map(r => 
                    r.childId === childId ? { ...r, [field]: value } : r
                ),
            };
        }));
    };

    // Check if a child is selected for a caregiver
    const isChildSelectedForCaregiver = (caregiverId: string, childId: string) => {
        const caregiver = caregivers.find(c => c.id === caregiverId);
        return caregiver?.relationships.some(r => r.childId === childId) ?? false;
    };

    // Get relationship for a specific child
    const getRelationship = (caregiverId: string, childId: string) => {
        const caregiver = caregivers.find(c => c.id === caregiverId);
        return caregiver?.relationships.find(r => r.childId === childId);
    };

    const removeCaregiver = (id: string) => {
        setCaregivers(caregivers.filter(c => c.id !== id));
    };

    const handleJustMe = () => {
        setWantsToAddCaregivers(false);
    };

    const handleAddCaregivers = () => {
        setWantsToAddCaregivers(true);
        if (caregivers.length === 0) {
            addCaregiver();
        }
    };

    const handleStep4Submit = async () => {
        if (!user) {
            setError("Session error. Please refresh and try again.");
            return;
        }

        // If "Just me" was selected or no caregivers, complete onboarding
        if (wantsToAddCaregivers === false || caregivers.length === 0) {
            await completeOnboarding();
            return;
        }

        // Validate caregivers
        for (const cg of caregivers) {
            if (!cg.name.trim()) {
                setError("Please enter each caregiver's full name.");
                return;
            }
            if (cg.relationships.length === 0) {
                setError(`Please select at least one child for ${cg.name || "each caregiver"}.`);
                return;
            }
            // Validate each relationship
            for (const rel of cg.relationships) {
                const childName = children.find(c => c.id === rel.childId)?.name || "the child";
                if (!rel.childCallsThem.trim()) {
                    setError(`Please enter what ${childName} calls ${cg.name || "this caregiver"}.`);
                    return;
                }
            }
        }

        setError("");
        setSaving(true);

        try {
            const updatedCaregivers = [...caregivers];

            for (let i = 0; i < updatedCaregivers.length; i++) {
                const cg = updatedCaregivers[i];
                
                // Create ONE invite per child this caregiver is associated with
                // Each invite stores the role and label for that specific child
                for (const rel of cg.relationships) {
                    const token = crypto.randomUUID();
                    
                    // Store the first token for display (one invite link per caregiver)
                    if (!updatedCaregivers[i].inviteToken) {
                        updatedCaregivers[i] = { ...updatedCaregivers[i], inviteToken: token };
                    }

                    await supabase.from("invites").insert({
                        token: token,
                        status: "pending",
                        invitee_name: cg.name.trim(),
                        invitee_label: rel.childCallsThem.trim(),
                        invitee_role: rel.role,
                        child_id: rel.childId,
                        home_id: null, // They'll create their own home if needed
                        invited_by: user.id,
                        has_own_home: true,
                    });
                }
            }

            setCaregivers(updatedCaregivers);
            await completeOnboarding();
        } catch (err: any) {
            console.error("Error creating invites:", err);
            setError(err.message || "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // ==========================================
    // Complete Onboarding
    // ==========================================
    const completeOnboarding = async () => {
        if (!user) return;

        setSaving(true);
        try {
            await supabase
                .from("profiles")
                .update({ onboarding_completed: true })
                .eq("id", user.id);

            setOnboardingCompleted(true);
            await refreshData();
            setStep(5);
        } catch (err: any) {
            setError(err.message || "Failed to complete setup.");
        } finally {
            setSaving(false);
        }
    };

    // Copy invite link
    const handleCopyLink = (token: string, caregiverId: string) => {
        const link = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedId(caregiverId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Get role label for display
    const getRoleLabel = (role: CaregiverRole) => {
        return CAREGIVER_ROLE_OPTIONS.find(r => r.value === role)?.label || role;
    };

    // Get child names for a caregiver (from relationships)
    const getCaregiverChildNames = (relationships: ChildRelationship[]) => {
        const names = relationships
            .map(r => children.find(c => c.id === r.childId)?.name)
            .filter(Boolean);
        if (names.length === children.length && children.length > 1) return "All children";
        return names.join(", ");
    };

    // Get summary of caregiver's relationships for display
    const getCaregiverSummary = (caregiver: CaregiverEntry) => {
        if (caregiver.relationships.length === 0) return "";
        if (caregiver.relationships.length === 1) {
            const rel = caregiver.relationships[0];
            return rel.childCallsThem || caregiver.name;
        }
        // Multiple children - show first label
        return caregiver.relationships[0]?.childCallsThem || caregiver.name;
    };

    // Get roles summary for display
    const getCaregiverRolesSummary = (relationships: ChildRelationship[]) => {
        const uniqueRoles = Array.from(new Set(relationships.map(r => r.role)));
        return uniqueRoles.map(role => getRoleLabel(role)).join(", ");
    };

    // ==========================================
    // Step Info (for left panel)
    // ==========================================
    const getStepInfo = () => {
        switch (step) {
            case 1:
                return {
                    title: "Welcome to homes.kids",
                    description: "Let's set up your account.",
                    bullets: [
                        "Tell us about yourself.",
                        "This helps personalize the experience.",
                    ],
                };
            case 2:
                return {
                    title: "Add your children",
                    description: "Who is this setup for?",
                    bullets: [
                        "Your children are the center of everything.",
                        "All homes and caregivers connect through them.",
                    ],
                };
            case 3:
                return {
                    title: "Your home",
                    description: "Where do your children stay with you?",
                    bullets: [
                        "Name the home(s) you manage.",
                        "Other caregivers will set up their own homes later.",
                    ],
                };
            case 4:
                return {
                    title: "Caregivers",
                    description: "Who else helps care for your children?",
                    bullets: [
                        "Add parents, grandparents, nannies, and more.",
                        "They'll receive an invite to join.",
                    ],
                };
            case 5:
                return {
                    title: "You're all set!",
                    description: "Your family hub is ready.",
                    bullets: [
                        "Start adding items to track.",
                        "Manage homes and access anytime.",
                    ],
                };
            default:
                return { title: "", description: "", bullets: [] };
        }
    };

    const stepInfo = getStepInfo();
    const totalSteps = 5;

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
                            className={`flex items-start gap-3 text-white/85 text-sm ${
                                index < stepInfo.bullets.length - 1 ? "border-b border-white/10 pb-4" : "pb-4"
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
                        <p className="text-textSub text-sm mt-2">Co-parenting made simple.</p>
                    </div>

                    {/* Progress indicator */}
                    {step < 5 && (
                        <div className="flex justify-center gap-2 mb-8">
                            {Array.from({ length: totalSteps - 1 }, (_, i) => i + 1).map(s => (
                                <div
                                    key={s}
                                    className={`w-2 h-2 rounded-full ${
                                        step >= s ? "bg-forest" : "bg-gray-300"
                                    }`}
                                />
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* ==================== STEP 1: About You ==================== */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-forest mb-2">About you</h1>
                                <p className="text-gray-600">Tell us a bit about yourself</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your full name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                    placeholder="John Smith"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Your role <span className="text-red-500">*</span>
                                </label>
                                <MobileSelect
                                    value={userRole}
                                    onChange={val => setUserRole(val as UserRole)}
                                    options={USER_ROLE_OPTIONS}
                                    title="Your role"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    What does your child call you? <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={childCallsYou}
                                    onChange={e => setChildCallsYou(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                    placeholder="Daddy, Mommy, Mama..."
                                />
                            </div>

                            <button
                                onClick={handleStep1Submit}
                                disabled={saving}
                                className="w-full py-3 bg-forest text-white rounded-xl font-medium hover:bg-forest/90 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Continue"}
                            </button>
                        </div>
                    )}

                    {/* ==================== STEP 2: Your Child(ren) ==================== */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-forest mb-2">Your child</h1>
                                <p className="text-gray-600">Add the child or children you're setting this up for.</p>
                            </div>

                            <div className="space-y-4">
                                {children.map((child, index) => (
                                    <div key={child.id} className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {children.length > 1 ? `Child ${index + 1}'s name` : "Child's name"} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={child.name}
                                                onChange={e => updateChild(child.id, e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                                placeholder="Emma"
                                            />
                                        </div>
                                        {children.length > 1 && (
                                            <button
                                                onClick={() => removeChild(child.id)}
                                                className="self-end mb-1 px-3 py-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                type="button"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addChild}
                                type="button"
                                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-forest hover:text-forest"
                            >
                                + Add another child
                            </button>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleStep2Submit}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Continue"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ==================== STEP 3: Your Home(s) ==================== */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-forest mb-2">Your home</h1>
                                <p className="text-gray-600">Name the home(s) you manage for {getChildrenDisplayText()}.</p>
                            </div>

                            <div className="space-y-4">
                                {homes.map((home, index) => (
                                    <div key={home.id} className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {homes.length > 1 ? `Home ${index + 1}` : "Home name"} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={home.name}
                                                onChange={e => updateHome(home.id, e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-forest focus:border-transparent"
                                                placeholder={index === 0 ? generateHomeName(childCallsYou) || "Home name" : "Home name"}
                                            />
                                        </div>
                                        {homes.length > 1 && (
                                            <button
                                                onClick={() => removeHome(home.id)}
                                                className="self-end mb-1 px-3 py-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                                type="button"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addHome}
                                type="button"
                                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:border-forest hover:text-forest"
                            >
                                + Add another home
                            </button>

                            <p className="text-xs text-gray-500 text-center">
                                Other caregivers will set up their own homes when they join.
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleStep3Submit}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                >
                                    {saving ? "Creating..." : "Continue"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ==================== STEP 4: Caregivers ==================== */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-forest mb-2">Caregivers</h1>
                                <p className="text-gray-600">
                                    Who else helps care for {getChildrenDisplayText()}?
                                </p>
                            </div>

                            {/* Initial choice: Just me / Add caregivers */}
                            {wantsToAddCaregivers === null && (
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleJustMe}
                                        className="flex-1 py-4 rounded-xl border-2 border-gray-300 font-medium text-gray-700 hover:border-forest hover:bg-forest/5"
                                    >
                                        Just me
                                    </button>
                                    <button
                                        onClick={handleAddCaregivers}
                                        className="flex-1 py-4 rounded-xl border-2 border-gray-300 font-medium text-gray-700 hover:border-forest hover:bg-forest/5"
                                    >
                                        Add caregivers
                                    </button>
                                </div>
                            )}

                            {/* "Just me" selected */}
                            {wantsToAddCaregivers === false && (
                                <div className="p-4 bg-white rounded-xl border border-gray-200">
                                    <p className="text-sm text-gray-600 text-center">
                                        No problem! You can add caregivers later from settings.
                                    </p>
                                </div>
                            )}

                            {/* Caregiver form */}
                            {wantsToAddCaregivers === true && (
                                <div className="space-y-5">
                                    {caregivers.map((cg, index) => (
                                        <div key={cg.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                            {/* Card header */}
                                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-softGreen flex items-center justify-center">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest">
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                            <circle cx="12" cy="7" r="4" />
                                                        </svg>
                                                    </div>
                                                    <span className="font-semibold text-forest">
                                                        {cg.name || `Caregiver ${caregivers.length > 1 ? index + 1 : ""}`}
                                                    </span>
                                                </div>
                                                {caregivers.length > 1 && (
                                                    <button
                                                        onClick={() => removeCaregiver(cg.id)}
                                                        className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            <div className="p-5 space-y-5">
                                                {/* Full name */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Full name <span className="text-red-400">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={cg.name}
                                                        onChange={e => updateCaregiverName(cg.id, e.target.value)}
                                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-forest focus:border-transparent transition-all"
                                                        placeholder="e.g. Patrick Johnson"
                                                    />
                                                </div>

                                                {/* Per-child relationship mapping */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                                        Which children? <span className="text-red-400">*</span>
                                                    </label>
                                                    <div className="space-y-2">
                                                        {children.map(child => {
                                                            const isSelected = isChildSelectedForCaregiver(cg.id, child.id);
                                                            const relationship = getRelationship(cg.id, child.id);
                                                            
                                                            return (
                                                                <div 
                                                                    key={child.id} 
                                                                    className={`rounded-xl border-2 transition-all duration-200 ${
                                                                        isSelected 
                                                                            ? "border-forest bg-softGreen/30" 
                                                                            : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                                                                    }`}
                                                                >
                                                                    {/* Child toggle row */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleChildForCaregiver(cg.id, child.id)}
                                                                        className="w-full flex items-center justify-between p-4"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                                                                isSelected 
                                                                                    ? "bg-forest text-white" 
                                                                                    : "bg-gray-200 text-gray-500"
                                                                            }`}>
                                                                                {child.name.charAt(0)}
                                                                            </div>
                                                                            <span className={`font-medium ${isSelected ? "text-forest" : "text-gray-500"}`}>
                                                                                {child.name}
                                                                            </span>
                                                                        </div>
                                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                                            isSelected 
                                                                                ? "border-forest bg-forest" 
                                                                                : "border-gray-300"
                                                                        }`}>
                                                                            {isSelected && (
                                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                                                                    <polyline points="20 6 9 17 4 12" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                    </button>

                                                                    {/* Expanded fields when selected */}
                                                                    {isSelected && relationship && (
                                                                        <div className="px-4 pb-4 pt-0 space-y-3">
                                                                            <div className="h-px bg-forest/10" />
                                                                            
                                                                            {/* Role dropdown */}
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                                                                    Role for {child.name}
                                                                                </label>
                                                                                <MobileSelect
                                                                                    value={relationship.role}
                                                                                    onChange={val => updateRelationship(cg.id, child.id, "role", val)}
                                                                                    options={CAREGIVER_ROLE_OPTIONS}
                                                                                    title={`Role for ${child.name}`}
                                                                                    buttonClassName="!py-2.5 !rounded-lg !border-forest/20"
                                                                                />
                                                                            </div>
                                                                            
                                                                            {/* What child calls them */}
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                                                                    What does {child.name} call them?
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={relationship.childCallsThem}
                                                                                    onChange={e => updateRelationship(cg.id, child.id, "childCallsThem", e.target.value)}
                                                                                    className="w-full px-3 py-2.5 border border-forest/20 rounded-lg text-sm focus:ring-2 focus:ring-forest focus:border-transparent bg-white"
                                                                                    placeholder="e.g. Daddy, Papa, Grandma..."
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {cg.relationships.length === 0 && (
                                                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                                                <circle cx="12" cy="12" r="10" opacity="0.2"/>
                                                                <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                            </svg>
                                                            Select at least one child
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={addCaregiver}
                                        type="button"
                                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-sm font-medium text-gray-500 hover:border-forest hover:text-forest hover:bg-forest/5 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="16" />
                                            <line x1="8" y1="12" x2="16" y2="12" />
                                        </svg>
                                        Add another caregiver
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        if (wantsToAddCaregivers !== null) {
                                            setWantsToAddCaregivers(null);
                                        } else {
                                            setStep(3);
                                        }
                                    }}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                >
                                    Back
                                </button>
                                {wantsToAddCaregivers !== null && (
                                    <button
                                        onClick={handleStep4Submit}
                                        disabled={saving}
                                        className="flex-1 py-3 bg-forest text-white rounded-xl font-medium disabled:opacity-50"
                                    >
                                        {saving ? "Saving..." : "Continue"}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ==================== STEP 5: Finished ==================== */}
                    {step === 5 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="text-6xl mb-4">🎉</div>
                                <h1 className="text-2xl font-bold text-forest mb-2">Finished!</h1>
                                <p className="text-gray-600">
                                    Your setup for {getChildrenDisplayText()} is ready.
                                </p>
                            </div>

                            {/* Invite section - only if caregivers were added */}
                            {caregivers.length > 0 && caregivers.some(cg => cg.inviteToken) && (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <h2 className="text-lg font-semibold text-forest">Invite caregivers</h2>
                                        <p className="text-sm text-gray-600">
                                            Share a link or QR code so caregivers can onboard and join.
                                        </p>
                                    </div>

                                    {caregivers.filter(cg => cg.inviteToken).map(cg => (
                                        <div key={cg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                            {/* Card Header */}
                                            <div className="p-4 border-b border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-forest">
                                                            {cg.name}
                                                        </h3>
                                                        <p className="text-sm text-gray-500">
                                                            {getCaregiverRolesSummary(cg.relationships)}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Show per-child relationship summary */}
                                                <div className="mt-2 space-y-1">
                                                    {cg.relationships.map(rel => {
                                                        const childName = children.find(c => c.id === rel.childId)?.name;
                                                        return (
                                                            <p key={rel.childId} className="text-xs text-gray-500">
                                                                {childName}: {rel.childCallsThem} ({getRoleLabel(rel.role)})
                                                            </p>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* QR Code and Link */}
                                            <div className="p-4 space-y-4">
                                                <div className="flex justify-center">
                                                    <div className="bg-white p-2 rounded-lg border border-gray-100">
                                                        <QRCodeSVG
                                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${cg.inviteToken}`}
                                                            size={140}
                                                            level="M"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${cg.inviteToken}`}
                                                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-600 truncate"
                                                    />
                                                    <button
                                                        onClick={() => handleCopyLink(cg.inviteToken!, cg.id)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                            copiedId === cg.id
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                        }`}
                                                    >
                                                        {copiedId === cg.id ? "Copied!" : "Copy"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <p className="text-xs text-gray-500 text-center">
                                        You can also send these invites later from Settings → Caregivers
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => window.location.href = "/"}
                                className="w-full py-3 bg-forest text-white rounded-xl font-medium"
                            >
                                Continue to dashboard
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
