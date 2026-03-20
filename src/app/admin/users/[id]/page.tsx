"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserDetail {
    id: string;
    name: string | null;
    label: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    avatar_initials: string | null;
    avatar_color: string | null;
    manages_children: boolean;
    manages_pets: boolean;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
    authUser: {
        email_confirmed_at: string | null;
        last_sign_in_at: string | null;
        created_at: string;
    } | null;
    childAccess: Array<{
        id: string;
        role_type: string;
        helper_type: string | null;
        access_level: string;
        children_v2: {
            id: string;
            name: string;
            avatar_url: string | null;
        };
    }>;
    homeMemberships: Array<{
        id: string;
        is_home_admin: boolean;
        homes_v2: {
            id: string;
            name: string;
            address: string | null;
        };
    }>;
    petAccess: Array<{
        id: string;
        role_type: string;
        access_level: string;
        pets: {
            id: string;
            name: string;
            species: string;
            avatar_url: string | null;
        };
    }>;
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone: '',
        label: '',
        is_admin: false,
    });
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordAction, setPasswordAction] = useState<'send_reset' | 'set_password'>('send_reset');
    const [newPassword, setNewPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [toast, setToast] = useState('');

    const fetchUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Not authenticated');
                return;
            }

            const response = await fetch(`/api/admin/users/${id}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch user');
            }

            const data = await response.json();
            setUser(data.user);
            setEditForm({
                name: data.user.name || '',
                email: data.user.email || '',
                phone: data.user.phone || '',
                label: data.user.label || '',
                is_admin: data.user.is_admin || false,
            });
        } catch (err) {
            console.error('Error fetching user:', err);
            setError(err instanceof Error ? err.message : 'Failed to load user');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editForm),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update user');
            }

            setIsEditing(false);
            fetchUser();
            showToast('User updated successfully');
        } catch (err) {
            console.error('Error updating user:', err);
            setError(err instanceof Error ? err.message : 'Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete user');
            }

            router.push('/admin/users');
        } catch (err) {
            console.error('Error deleting user:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete user');
            setDeleting(false);
        }
    };

    const handlePasswordAction = async () => {
        setPasswordLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const body: { action: string; password?: string } = { action: passwordAction };
            if (passwordAction === 'set_password') {
                body.password = newPassword;
            }

            const response = await fetch(`/api/admin/users/${id}/password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to process password action');
            }

            const data = await response.json();
            setShowPasswordModal(false);
            setNewPassword('');
            showToast(data.message);
        } catch (err) {
            console.error('Error with password action:', err);
            setError(err instanceof Error ? err.message : 'Failed to process password action');
        } finally {
            setPasswordLoading(false);
        }
    };

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(''), 3000);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-32 bg-gray-200 rounded"></div>
                    <div className="h-32 bg-gray-200 rounded-2xl"></div>
                    <div className="h-64 bg-gray-200 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (error && !user) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl">
                    {error}
                </div>
                <Link href="/admin/users" className="text-forest mt-4 inline-block">
                    &larr; Back to Users
                </Link>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="p-8">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 bg-forest text-white px-4 py-2 rounded-xl shadow-lg z-50">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="mb-6">
                <Link href="/admin/users" className="text-textSub hover:text-forest text-sm mb-2 inline-block">
                    &larr; Back to Users
                </Link>
                <h1 className="font-dmSerif text-3xl text-forest">User Details</h1>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {/* User Profile Card */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl flex-shrink-0"
                        style={{ backgroundColor: user.avatar_color || '#4A7C59' }}
                    >
                        {user.avatar_initials || user.name?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-forest mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-forest mb-1">Label</label>
                                        <input
                                            type="text"
                                            value={editForm.label}
                                            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                            className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30"
                                            placeholder="e.g., Daddy, Mama"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-forest mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-forest mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={editForm.phone}
                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                            className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_admin"
                                        checked={editForm.is_admin}
                                        onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                                        className="rounded"
                                    />
                                    <label htmlFor="is_admin" className="text-sm text-forest">Administrator privileges</label>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="px-4 py-2 bg-forest text-white rounded-xl font-medium hover:bg-forest/90 disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 border border-border rounded-xl font-medium hover:bg-softGreen"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="font-semibold text-xl text-forest">{user.name || 'Unnamed User'}</h2>
                                    {user.is_admin && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                            Admin
                                        </span>
                                    )}
                                </div>
                                <p className="text-textSub mb-4">{user.email}</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-textSub">Phone</p>
                                        <p className="font-medium text-forest">{user.phone || 'Not set'}</p>
                                    </div>
                                    <div>
                                        <p className="text-textSub">Label</p>
                                        <p className="font-medium text-forest">{user.label || 'Not set'}</p>
                                    </div>
                                    <div>
                                        <p className="text-textSub">Created</p>
                                        <p className="font-medium text-forest">{formatDate(user.created_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-textSub">Last Sign In</p>
                                        <p className="font-medium text-forest">{formatDate(user.authUser?.last_sign_in_at ?? null)}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-forest text-white rounded-xl text-sm font-medium hover:bg-forest/90"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-softGreen"
                            >
                                Password
                            </button>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Children Access */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <h3 className="font-semibold text-forest mb-4">Children Access ({user.childAccess.length})</h3>
                {user.childAccess.length === 0 ? (
                    <p className="text-textSub text-sm">No children access</p>
                ) : (
                    <div className="space-y-3">
                        {user.childAccess.map((access) => (
                            <Link
                                key={access.id}
                                href={`/admin/children/${access.children_v2.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-softGreen/50 hover:bg-softGreen transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-terracotta/20 flex items-center justify-center text-terracotta font-semibold">
                                    {access.children_v2.name?.[0] || '?'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-forest">{access.children_v2.name}</p>
                                    <p className="text-xs text-textSub capitalize">
                                        {access.role_type} {access.helper_type ? `(${access.helper_type.replace('_', ' ')})` : ''} - {access.access_level}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Home Memberships */}
            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
                <h3 className="font-semibold text-forest mb-4">Home Memberships ({user.homeMemberships.length})</h3>
                {user.homeMemberships.length === 0 ? (
                    <p className="text-textSub text-sm">No home memberships</p>
                ) : (
                    <div className="space-y-3">
                        {user.homeMemberships.map((membership) => (
                            <Link
                                key={membership.id}
                                href={`/admin/homes/${membership.homes_v2.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-softGreen/50 hover:bg-softGreen transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center text-teal">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-forest">{membership.homes_v2.name}</p>
                                    <p className="text-xs text-textSub">{membership.homes_v2.address || 'No address'}</p>
                                </div>
                                {membership.is_home_admin && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                        Home Admin
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Pet Access */}
            <div className="bg-white rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-forest mb-4">Pet Access ({user.petAccess.length})</h3>
                {user.petAccess.length === 0 ? (
                    <p className="text-textSub text-sm">No pet access</p>
                ) : (
                    <div className="space-y-3">
                        {user.petAccess.map((access) => (
                            <Link
                                key={access.id}
                                href={`/admin/pets/${access.pets.id}`}
                                className="flex items-center gap-4 p-3 rounded-xl bg-softGreen/50 hover:bg-softGreen transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold">
                                    {access.pets.name?.[0] || '?'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-forest">{access.pets.name}</p>
                                    <p className="text-xs text-textSub capitalize">
                                        {access.pets.species} - {access.role_type} ({access.access_level})
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="font-semibold text-xl text-forest mb-2">Delete User</h3>
                        <p className="text-textSub mb-4">
                            Are you sure you want to delete <strong>{user.name || user.email}</strong>?
                            This will remove all their data including:
                        </p>
                        <ul className="text-sm text-textSub mb-6 space-y-1">
                            <li>- Profile information</li>
                            <li>- {user.childAccess.length} child access record(s)</li>
                            <li>- {user.homeMemberships.length} home membership(s)</li>
                            <li>- {user.petAccess.length} pet access record(s)</li>
                        </ul>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2 border border-border rounded-xl font-medium hover:bg-softGreen"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="font-semibold text-xl text-forest mb-4">Password Management</h3>

                        <div className="space-y-4 mb-6">
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-softGreen/30">
                                <input
                                    type="radio"
                                    name="passwordAction"
                                    value="send_reset"
                                    checked={passwordAction === 'send_reset'}
                                    onChange={() => setPasswordAction('send_reset')}
                                />
                                <div>
                                    <p className="font-medium text-forest">Send Reset Email</p>
                                    <p className="text-xs text-textSub">User will receive an email to reset their password</p>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-softGreen/30">
                                <input
                                    type="radio"
                                    name="passwordAction"
                                    value="set_password"
                                    checked={passwordAction === 'set_password'}
                                    onChange={() => setPasswordAction('set_password')}
                                />
                                <div>
                                    <p className="font-medium text-forest">Set New Password</p>
                                    <p className="text-xs text-textSub">Directly set a new password for the user</p>
                                </div>
                            </label>

                            {passwordAction === 'set_password' && (
                                <div>
                                    <label className="block text-sm font-medium text-forest mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password (min 6 characters)"
                                        className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-forest/30"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setNewPassword('');
                                }}
                                className="flex-1 px-4 py-2 border border-border rounded-xl font-medium hover:bg-softGreen"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePasswordAction}
                                disabled={passwordLoading || (passwordAction === 'set_password' && newPassword.length < 6)}
                                className="flex-1 px-4 py-2 bg-forest text-white rounded-xl font-medium hover:bg-forest/90 disabled:opacity-50"
                            >
                                {passwordLoading ? 'Processing...' : passwordAction === 'send_reset' ? 'Send Email' : 'Set Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
