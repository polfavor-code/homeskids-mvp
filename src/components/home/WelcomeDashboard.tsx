"use client";

import React from "react";
import Link from "next/link";

interface WelcomeDashboardProps {
    userName: string;
    childName: string;
}

export default function WelcomeDashboard({ userName, childName }: WelcomeDashboardProps) {
    return (
        <div className="welcome-dashboard">
            {/* Hero Section */}
            <div className="text-center mb-12 max-w-xl mx-auto">
                <h1 className="font-dmSerif text-4xl md:text-5xl text-forest mb-4 tracking-tight">
                    Hi {userName},
                </h1>
                <p className="text-xl md:text-2xl text-forest mb-4">
                    Let's get {childName}'s essentials organized together.
                </p>
                <p className="text-lg text-textSub mb-3">
                    Here are a few things you can set up to make days between homes smoother.
                </p>
            </div>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                {/* Add Item */}
                <Link href="/items/new" className="action-card group">
                    <div className="card-icon">📦</div>
                    <div className="card-title">Add an item</div>
                    <div className="card-desc">Track {childName}'s things so they never get lost. Add toys, clothes, tech, or anything important. Track where each item lives and where it goes.</div>
                </Link>

                {/* Add Contact */}
                <Link href="/contacts/new" className="action-card group">
                    <div className="card-icon">👤</div>
                    <div className="card-title">Add a contact</div>
                    <div className="card-desc">Save doctors, teachers, and emergency contacts. Keep everyone {childName} relies on in one place. Share the list with connected caregivers.</div>
                </Link>

                {/* Upload Document */}
                <Link href="/documents" className="action-card group">
                    <div className="card-icon">📄</div>
                    <div className="card-title">Upload a document</div>
                    <div className="card-desc">Store passports, school papers, and medical files. Access them quickly when needed. Documents are privately shared between you and your co-parent.</div>
                </Link>

                {/* Invite Caregiver */}
                <Link href="/settings/caregivers?invite=true" className="action-card group">
                    <div className="card-icon">👋</div>
                    <div className="card-title">Invite a caregiver</div>
                    <div className="card-desc">Add the other parent, grandparents, or a babysitter/nanny. Everyone sees the same essential information. Stay coordinated with fewer messages.</div>
                </Link>

                {/* Calendar */}
                <Link href="/calendar" className="action-card group">
                    <div className="card-icon">📅</div>
                    <div className="card-title">Set up calendar basics</div>
                    <div className="card-desc">Add school days, routines, and important dates. Keep track of pickups, outfits, and activities. Helps each home stay on the same schedule.</div>
                </Link>

                {/* Home Details */}
                <Link href="/settings/homes" className="action-card group">
                    <div className="card-icon">🏠</div>
                    <div className="card-title">Add home details</div>
                    <div className="card-desc">Save addresses, instructions, Wi-Fi, and notes for each home. Homes can be your own, family homes, friend sleepover homes, or caregiver homes. Both parents always know where {childName} is and how to reach that home.</div>
                </Link>
            </div>



            {/* Reassurance Text */}
            <p className="text-center text-textSub text-sm mt-12">
                Start with whatever matters most — you can always return later. Everything you set up is safely shared with your connected caregivers.
            </p>

            {/* Component Styles */}
            <style jsx>{`
                .action-card {
                    background: white;
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 28px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    text-decoration: none;
                    color: var(--dark);
                    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
                }
                
                .action-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(44, 62, 45, 0.08);
                    border-color: rgba(44, 62, 45, 0.3);
                }
                
                .card-icon {
                    width: 48px;
                    height: 48px;
                    background-color: var(--soft-green);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    margin-bottom: 16px;
                }
                
                .card-title {
                    font-family: var(--font-head);
                    font-size: 18px;
                    margin-bottom: 6px;
                }
                
                .card-desc {
                    font-size: 14px;
                    color: var(--text-sub);
                    line-height: 1.4;
                }

            `}</style>
        </div>
    );
}
