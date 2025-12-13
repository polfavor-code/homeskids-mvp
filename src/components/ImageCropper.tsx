"use client";

import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedBlob: Blob) => void;
    onCancel: () => void;
    aspectRatio?: number;
    cropShape?: "rect" | "round";
}

export default function ImageCropper({
    imageSrc,
    onCropComplete,
    onCancel,
    aspectRatio = 1,
    cropShape = "round",
}: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [processing, setProcessing] = useState(false);

    const onCropChange = useCallback((location: { x: number; y: number }) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onCropAreaComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createCroppedImage = async (): Promise<Blob> => {
        if (!croppedAreaPixels) {
            throw new Error("No crop area selected");
        }

        const image = new Image();
        image.src = imageSrc;

        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            throw new Error("Failed to get canvas context");
        }

        // Set canvas size to cropped area
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw the cropped portion
        ctx.drawImage(
            image,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            0,
            0,
            croppedAreaPixels.width,
            croppedAreaPixels.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Failed to create blob"));
                    }
                },
                "image/jpeg",
                0.92
            );
        });
    };

    const handleSave = async () => {
        try {
            setProcessing(true);
            const croppedBlob = await createCroppedImage();
            onCropComplete(croppedBlob);
        } catch (error) {
            console.error("Error cropping image:", error);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col bg-black"
            style={{ touchAction: 'none' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/80 safe-area-top">
                <button
                    onClick={onCancel}
                    className="text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    disabled={processing}
                >
                    Cancel
                </button>
                <span className="text-white font-medium">Crop Photo</span>
                <button
                    onClick={handleSave}
                    disabled={processing}
                    className="text-white text-sm font-medium px-3 py-1.5 rounded-lg bg-forest hover:bg-forest/90 transition-colors disabled:opacity-50"
                >
                    {processing ? "..." : "Done"}
                </button>
            </div>

            {/* Cropper Area */}
            <div className="relative flex-1 overflow-hidden" style={{ touchAction: 'none' }}>
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspectRatio}
                    cropShape={cropShape}
                    showGrid={false}
                    onCropChange={onCropChange}
                    onZoomChange={onZoomChange}
                    onCropComplete={onCropAreaComplete}
                    objectFit="contain"
                    style={{
                        containerStyle: {
                            width: '100%',
                            height: '100%',
                            backgroundColor: '#000',
                        },
                        cropAreaStyle: {
                            border: '2px solid white',
                        },
                    }}
                />
            </div>

            {/* Zoom Slider */}
            <div className="px-8 py-6 bg-black/80 safe-area-bottom">
                <div className="flex items-center gap-4">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.05}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-5
                            [&::-webkit-slider-thumb]:h-5
                            [&::-webkit-slider-thumb]:bg-white
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:shadow-lg
                            [&::-moz-range-thumb]:w-5
                            [&::-moz-range-thumb]:h-5
                            [&::-moz-range-thumb]:bg-white
                            [&::-moz-range-thumb]:rounded-full
                            [&::-moz-range-thumb]:border-0"
                    />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        <line x1="8" y1="11" x2="14" y2="11" />
                        <line x1="11" y1="8" x2="11" y2="14" />
                    </svg>
                </div>
                <p className="text-center text-white/60 text-xs mt-3">
                    Pinch or use slider to zoom
                </p>
            </div>

            <style jsx>{`
                .safe-area-top {
                    padding-top: max(12px, env(safe-area-inset-top));
                }
                .safe-area-bottom {
                    padding-bottom: max(24px, env(safe-area-inset-bottom));
                }
            `}</style>
        </div>
    );
}
