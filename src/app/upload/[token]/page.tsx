"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Cropper, { Area } from "react-easy-crop";
import {
  ShieldCheck,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Info,
  Lock,
} from "lucide-react";

interface InternData {
  fullName: string;
  employeeId: string;
  department: string;
  college: string | null;
}

export default function InternUploadPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";

  // Token validation state
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [intern, setIntern] = useState<InternData | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Upload & Cropper state
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 1. Validate token on mount
  useEffect(() => {
    if (!token) {
      setValidationError("Missing or invalid invitation link.");
      setIsValidating(false);
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(`/api/invitation/${token}`, {
          cache: "no-store",
          headers: { "Referrer-Policy": "no-referrer" },
        });

        const data = await res.json();

        if (!res.ok || !data.valid) {
          if (data.reason === "ALREADY_SUBMITTED") {
            setAlreadySubmitted(true);
            setIntern(data.intern || null);
          } else {
            setValidationError(data.error || "This invitation link is invalid or has expired.");
          }
        } else {
          setIntern(data.intern);
        }
      } catch {
        setValidationError("Unable to verify link due to a network error. Please try again.");
      } finally {
        setIsValidating(false);
      }
    }

    validateToken();
  }, [token]);

  // Handle file selection
  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadError(null);

      // Validate size client-side (10MB as requested in master prompt)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`);
        return;
      }

      // Validate MIME type
      const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setUploadError("Only JPG, JPEG, and PNG images are supported.");
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setSelectedImageSrc(reader.result?.toString() || null);
        setZoom(1);
        setRotation(0);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Helper to generate cropped image blob using HTML5 Canvas
  const getCroppedImgBlob = async (): Promise<Blob> => {
    if (!selectedImageSrc || !croppedAreaPixels) {
      throw new Error("No crop area selected.");
    }

    const image = new Image();
    image.src = selectedImageSrc;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2D context");

    // Standard high-resolution ID card photo output: 600 x 800 px (3:4 ratio)
    const targetWidth = 600;
    const targetHeight = 800;
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Fill white background for clean passport look
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Render cropped portion onto canvas
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      targetWidth,
      targetHeight
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.95 // High JPEG quality
      );
    });
  };

  // Submit the cropped photo
  const handleSubmit = async () => {
    if (!selectedImageSrc || !croppedAreaPixels) {
      setUploadError("Please choose and position your photo first.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(15);
    setUploadError(null);

    try {
      const croppedBlob = await getCroppedImgBlob();
      setUploadProgress(45);

      const formData = new FormData();
      formData.append("photo", croppedBlob, `${intern?.employeeId || "photo"}.jpg`);

      setUploadProgress(75);

      const res = await fetch(`/api/upload/${token}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadProgress(100);

      if (!res.ok || !data.success) {
        setUploadError(data.error || "Failed to submit photo. Please try again.");
        setIsSubmitting(false);
      } else {
        // Successful upload! Redirect to confirmation
        router.push(
          `/upload/success?id=${encodeURIComponent(data.employeeId)}&name=${encodeURIComponent(
            data.fullName || intern?.fullName || ""
          )}`
        );
      }
    } catch (err: any) {
      console.error("[Submit Exception]", err);
      setUploadError("A network error occurred while uploading. Please check your connection and retry.");
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <img
            src="/images/logo.jpeg"
            alt="CodeXa Logo"
            className="w-14 h-14 rounded-xl border border-[rgba(255,30,60,0.55)] object-cover shadow-[0_0_20px_rgba(255,30,60,0.35)] animate-pulse"
          />
          <Loader2 className="w-8 h-8 text-[#FF1E3C] animate-spin" />
          <p className="text-[#A5A5A5] text-xs font-mono uppercase tracking-widest">
            Verifying secure invitation token...
          </p>
        </div>
      </div>
    );
  }

  // Already Submitted Screen
  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center p-4">
        <div className="cyber-card max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.4)] text-[#10B981] mx-auto flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="text-xl font-heading font-bold text-white mb-2">Photo Already Submitted</h1>
          <p className="text-[#A5A5A5] text-xs sm:text-sm leading-relaxed mb-6">
            Your official ID card photograph has already been received and securely registered under your CodeXa intern profile.
          </p>

          <div className="bg-[#141414] border border-[rgba(217,4,41,0.2)] rounded-xl p-4 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-[#A5A5A5]">Official Intern ID:</span>
              <span className="text-white font-mono font-bold text-[#FF1E3C]">{intern?.employeeId}</span>
            </div>
            {intern?.fullName && (
              <div className="flex justify-between">
                <span className="text-[#A5A5A5]">Full Name:</span>
                <span className="text-white font-semibold">{intern.fullName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#A5A5A5]">Current Status:</span>
              <span className="text-[#10B981] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
                Under Administrative Review
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#666666]">
            If you need to change your photo, please contact your CodeXa Agency administrator or HR mentor to reopen your upload link.
          </p>
        </div>
      </div>
    );
  }

  // Error State (Invalid / Expired / Revoked Link)
  if (validationError || !intern) {
    return (
      <div className="min-h-screen bg-[#070707] flex flex-col items-center justify-center p-4">
        <div className="cyber-card max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="w-14 h-14 rounded-full bg-[rgba(217,4,41,0.15)] border border-[rgba(255,30,60,0.4)] text-[#FF1E3C] mx-auto flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(255,30,60,0.3)]">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-heading font-bold text-white mb-2">Submission Link Unavailable</h1>
          <p className="text-[#A5A5A5] text-xs sm:text-sm leading-relaxed mb-6">
            {validationError || "This invitation link is not active or has expired."}
          </p>

          <div className="bg-[#141414] border border-[rgba(217,4,41,0.2)] rounded-xl p-4 text-left text-xs space-y-2 mb-6 text-[#A5A5A5]">
            <p>• Make sure you opened your direct personalized link provided by CodeXa Agency.</p>
            <p>• ID Photo Submission validity is active through October 19, 2026.</p>
            <p>• If you need assistance, please contact your CodeXa mentor or administrator.</p>
          </div>

          <button
            onClick={() => router.push("/")}
            className="btn-cyber-outline w-full py-3 text-xs"
          >
            Return to Portal Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-[#F7F7F7] flex flex-col">
      {/* Header Banner */}
      <header className="border-b border-[rgba(217,4,41,0.2)] bg-[#0C0C0C]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/images/logo.jpeg"
              alt="CodeXa Logo"
              className="w-9 h-9 rounded-lg border border-[rgba(255,30,60,0.55)] object-cover shadow-[0_0_12px_rgba(255,30,60,0.3)]"
            />
            <div>
              <span className="font-heading font-black tracking-widest text-white text-sm sm:text-base">
                CODEXA <span className="text-[#FF1E3C]">AGENCY</span>
              </span>
              <p className="text-[10px] text-[#A5A5A5] leading-none">Official Intern ID Card Portal</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-[#10B981] bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] px-3 py-1 rounded-full font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Identity Verified</span>
            <span className="sm:hidden">Verified</span>
          </div>
        </div>
      </header>

      {/* Main Container - Mobile First Focus (max-w-xl is 576px, ideal 480-520px container) */}
      <main className="flex-1 max-w-xl mx-auto px-4 py-6 w-full">
        {/* Intern Personalized Verified Info Card */}
        <div className="cyber-card p-5 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[10px] font-heading font-bold tracking-widest text-[#FF1E3C] uppercase">
                Verified Internship Record
              </span>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white mt-0.5">
                Welcome, {intern.fullName}
              </h1>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#141414] border border-[rgba(217,4,41,0.25)] text-xs font-mono font-bold text-[#FF1E3C] self-start sm:self-auto">
              <span>ID:</span>
              <span>{intern.employeeId}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs bg-[#141414] border border-[rgba(217,4,41,0.15)] rounded-xl p-3.5 mb-3">
            <div>
              <span className="text-[10px] text-[#A5A5A5] uppercase tracking-wider block">Department</span>
              <span className="font-semibold text-white">{intern.department || "Engineering"}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#A5A5A5] uppercase tracking-wider block">Institution</span>
              <span className="font-semibold text-white truncate block">{intern.college || "CodeXa Tech Hub"}</span>
            </div>
          </div>

          {/* Active Validity Window Notice */}
          <div className="bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.25)] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
              <span className="text-xs font-semibold text-[#10B981]">Submission Window Active</span>
            </div>
            <span className="text-[11px] font-medium text-[#A5A5A5]">
              Validity Extended: <span className="text-white font-semibold">19th October 2026</span>
            </span>
          </div>
        </div>

        {/* Upload & Crop Section */}
        <div className="cyber-card p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-heading font-bold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#FF1E3C]" />
              <span>Photograph Submission</span>
            </h2>
            <span className="text-[11px] text-[#A5A5A5]">3:4 Passport Ratio</span>
          </div>

          {/* Hidden File Inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onSelectFile}
            accept="image/jpeg,image/png,image/jpg"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={onSelectFile}
            accept="image/*"
            capture="user"
            className="hidden"
          />

          {!selectedImageSrc ? (
            /* Upload Dropzone */
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[rgba(217,4,41,0.3)] hover:border-[#FF1E3C] bg-[#141414] hover:bg-[rgba(217,4,41,0.06)] rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-[rgba(217,4,41,0.15)] border border-[rgba(255,30,60,0.35)] text-[#FF1E3C] flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(255,30,60,0.25)]">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-heading font-bold text-white mb-1">
                  Tap to Choose Photograph
                </p>
                <p className="text-xs text-[#A5A5A5] max-w-xs leading-relaxed">
                  Select a clear portrait photo from your gallery or files (JPG, PNG • Max 10 MB)
                </p>
              </div>

              {/* Mobile Quick Action Buttons - 48px Touch Targets */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="btn-cyber-outline h-12 text-xs flex items-center justify-center gap-2 rounded-xl"
                >
                  <Camera className="w-4 h-4 text-[#FF1E3C]" />
                  <span>Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-cyber-outline h-12 text-xs flex items-center justify-center gap-2 rounded-xl"
                >
                  <Upload className="w-4 h-4 text-[#FF1E3C]" />
                  <span>Browse Gallery</span>
                </button>
              </div>
            </div>
          ) : (
            /* Interactive Cropper Section */
            <div className="space-y-4">
              <div className="relative w-full h-80 sm:h-96 bg-black rounded-2xl overflow-hidden border border-[rgba(217,4,41,0.4)]">
                <Cropper
                  image={selectedImageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={3 / 4}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={true}
                />
              </div>

              {/* Cropper Controls */}
              <div className="bg-[#141414] border border-[rgba(217,4,41,0.2)] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#A5A5A5]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ZoomIn className="w-3.5 h-3.5 text-[#FF1E3C]" /> Zoom Adjustment
                  </span>
                  <span className="font-mono text-white">{zoom.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-label="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-[#FF1E3C] cursor-pointer"
                />

                <div className="flex items-center justify-between pt-2 border-t border-[rgba(217,4,41,0.15)]">
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="text-xs text-[#A5A5A5] hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded bg-[#070707] border border-[rgba(217,4,41,0.2)]"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[#FF1E3C]" />
                    <span>Rotate 90°</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImageSrc(null);
                      setCroppedAreaPixels(null);
                    }}
                    className="text-xs text-[#FF1E3C] hover:underline flex items-center gap-1 py-1 px-2.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Choose Different Photo</span>
                  </button>
                </div>
              </div>

              {/* Upload Progress Bar if active */}
              {isSubmitting && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#A5A5A5]">
                    <span>Uploading and generating official CX ID photo...</span>
                    <span className="font-mono font-bold text-[#FF1E3C]">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#141414] h-2 rounded-full overflow-hidden border border-[rgba(217,4,41,0.2)]">
                    <div
                      className="bg-gradient-to-r from-[#FF1E3C] to-[#D90429] h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="p-3 bg-[rgba(217,4,41,0.15)] border border-[rgba(255,30,60,0.4)] rounded-xl text-xs text-[#FF1E3C] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Submit Button - 50px Height Touch Target */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-cyber-primary w-full h-13 text-sm flex items-center justify-center gap-2 rounded-xl shadow-[0_0_25px_rgba(255,30,60,0.4)]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Securing Submission...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Submit ID Card Photo</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Photo Guidelines Card */}
        <div className="bg-[#0C0C0C] border border-[rgba(217,4,41,0.2)] rounded-2xl p-5 text-xs space-y-2 text-[#A5A5A5]">
          <div className="flex items-center gap-2 text-white font-heading font-bold text-xs uppercase tracking-wider mb-1">
            <Info className="w-4 h-4 text-[#FF1E3C]" />
            <span>Official Photo Requirements</span>
          </div>
          <p>• Plain, light background (white or off-white preferred).</p>
          <p>• Look directly at the camera with a neutral or pleasant expression.</p>
          <p>• Both eyes and full face must be clearly visible (no sunglasses or hats).</p>
          <p>• Good lighting with no harsh shadows across your face.</p>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[rgba(217,4,41,0.2)] bg-[#070707] py-4 px-4 text-center text-xs text-[#666666]">
        <span>CodeXa Agency • Secure • Private • Official</span>
      </footer>
    </div>
  );
}
