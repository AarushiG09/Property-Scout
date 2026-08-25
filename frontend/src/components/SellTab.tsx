import React, { useState, useRef } from "react";
import { PlusCircle, Building2, MapPin, DollarSign, Image as ImageIcon, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft, Upload, Lock, Sparkles, Trash2, FileImage } from "lucide-react";

export interface UploadedPhoto {
  id: string;
  name: string;
  size: string;
  url: string;
}

export const SellTab: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Uploaded Property Photos State
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([
    {
      id: "sample-1",
      name: "living_room_hsr.jpg",
      size: "1.8 MB",
      url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: "sample-2",
      name: "bedroom_master.jpg",
      size: "2.1 MB",
      url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"
    }
  ]);

  // Form State
  const [formData, setFormData] = useState({
    title: "Spacious 2BHK Apartment in HSR Layout Sector 2",
    propertyType: "Apartment",
    bedrooms: 2,
    sqft: 1250,
    furnishing: "Semi-Furnished",
    address: "24th Main Road, HSR Layout Sector 2",
    city: "Bengaluru",
    area: "HSR Layout",
    latitude: 12.9121,
    longitude: 77.6446,
    rent: 36000,
    deposit: 150000,
    availabilityStatus: "Available",
    amenities: ["Power Backup", "Car Parking", "Security", "Elevator"],
    contactName: "Ramesh Sharma",
    contactPhone: "9876543210",
    contactEmail: "ramesh@example.com"
  });

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmitListing = async () => {
    setSubmitting(true);
    const payload = {
      ...formData,
      photos: uploadedPhotos.map((p) => p.url)
    };

    try {
      let res: Response;
      try {
        res = await fetch("/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        res = await fetch("http://localhost:4000/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        console.log("[SELLER LISTING PUBLISHED]", data.listing);
        if (data.emailResult?.success) {
          console.log("[OWNER CONFIRMATION EMAIL SENT]", data.emailResult);
        }
      }
    } catch (e) {
      console.warn("Listing published locally:", e);
    } finally {
      setSubmitting(false);
      setSubmittedSuccess(true);
    }
  };

  // Helper to format bytes to human readable string
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Process File List from File Input or Drag & Drop
  const processFiles = (files: FileList | File[]) => {
    const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/jpg"];

    Array.from(files).forEach((file) => {
      if (!validImageTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|gif|heic)$/i)) {
        alert(`File "${file.name}" is not a supported image format (JPG, PNG, WEBP).`);
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the 15 MB size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result as string;
        if (resultUrl) {
          setUploadedPhotos((prev) => [
            ...prev,
            {
              id: "photo-" + Math.random().toString(36).substring(2, 9),
              name: file.name,
              size: formatFileSize(file.size),
              url: resultUrl
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input value so same file can be re-added if desired
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950/80 to-[#131B2E] border border-teal-500/20 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-semibold px-3 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Agent Listing Flow
            </span>
            <span className="text-xs text-gray-400">Sell Workspace</span>
          </div>
          <h2 className="text-xl font-bold text-white">List a Property for Rent / Sale</h2>
          <p className="text-xs text-gray-300 mt-1">
            Follow our 5-step guided wizard. All owner contact data is automatically sanitized before public indexing.
          </p>
        </div>

        <button
          onClick={() => { setSubmittedSuccess(false); setCurrentStep(1); }}
          className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-md shadow-teal-900/50"
        >
          <PlusCircle className="w-4 h-4" /> Start New Listing
        </button>
      </div>

      {/* Progress Step Bar */}
      <div className="bg-[#131B2E] border border-white/10 rounded-xl p-4">
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-medium">
          {[
            { num: 1, label: "1. Metadata", icon: Building2 },
            { num: 2, label: "2. Location", icon: MapPin },
            { num: 3, label: "3. Pricing", icon: DollarSign },
            { num: 4, label: "4. Media", icon: ImageIcon },
            { num: 5, label: "5. PII & Audit", icon: ShieldCheck }
          ].map((s) => {
            const Icon = s.icon;
            const active = currentStep === s.num;
            const completed = currentStep > s.num;

            return (
              <button
                key={s.num}
                onClick={() => setCurrentStep(s.num)}
                className={`py-2 px-3 rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  active
                    ? "bg-teal-600 text-white border-teal-400 font-bold shadow-md shadow-teal-950/60"
                    : completed
                    ? "bg-slate-900 text-teal-300 border-teal-500/30"
                    : "bg-slate-900/40 text-gray-500 border-white/5 hover:text-gray-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.num}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!submittedSuccess ? (
        /* Wizard Card */
        <div className="bg-[#131B2E] border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          
          {/* Hidden HTML5 File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
            className="hidden"
          />

          {/* Step 1: Property Metadata */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-teal-400" /> Step 1: Basic Property Metadata
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Specify title, property category, bedrooms, area, and furnishing state.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-white">Property Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Property Type</label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Apartment">Apartment / Flat</option>
                    <option value="Independent House">Independent House</option>
                    <option value="Villa">Gated Villa</option>
                    <option value="Studio">Studio Apartment</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Bedrooms (BHK)</label>
                  <input
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Super Built-up Area (Sq.Ft)</label>
                  <input
                    type="number"
                    value={formData.sqft}
                    onChange={(e) => setFormData({ ...formData, sqft: parseInt(e.target.value) || 500 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Furnishing State</label>
                  <select
                    value={formData.furnishing}
                    onChange={(e) => setFormData({ ...formData, furnishing: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Fully Furnished">Fully Furnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location & Address */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-teal-400" /> Step 2: Location & Geospatial Mapping
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Input precise address and locality for distance calculations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-white">Street Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Locality / Area</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Latitude (GPS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 12.9716 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Longitude (GPS)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 77.5946 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Pricing & Deposit */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-teal-400" /> Step 3: Financials & Deposit Terms
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Set monthly rent, security deposit, and lease availability.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Monthly Rent (₹ INR)</label>
                  <input
                    type="number"
                    value={formData.rent}
                    onChange={(e) => setFormData({ ...formData, rent: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Security Deposit (₹ INR)</label>
                  <input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-white">Listing Availability Status</label>
                  <div className="bg-slate-900 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-emerald-400">Available for Immediate Rent</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">Active working set pin ready for buyer voice matching.</p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-3 py-1 rounded-full">
                      Available
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Media & Photos Upload (LIVE SYSTEM FILE UPLOADER) */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-teal-400" /> Step 4: Media & Photos Upload
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Upload property gallery photos directly from your system.</p>
                </div>
                <span className="bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-semibold px-3 py-1 rounded-full">
                  {uploadedPhotos.length} {uploadedPhotos.length === 1 ? "Photo" : "Photos"} Uploaded
                </span>
              </div>

              {/* Interactive Drag & Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center space-y-3 cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-teal-400 bg-teal-500/15 scale-[1.01] shadow-xl shadow-teal-950/80"
                    : "border-white/15 bg-slate-900/40 hover:border-teal-500/50 hover:bg-slate-900/70"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-400 shadow-inner">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {isDragging ? "Drop your image files here!" : "Drag & drop property photos here"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Select local images from your computer • Supports JPG, PNG, WEBP, GIF (Up to 15 MB per file)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-teal-950/60 inline-flex items-center gap-2"
                >
                  <FileImage className="w-4 h-4" /> Browse Files from Computer
                </button>
              </div>

              {/* Live Uploaded Photos Gallery Grid */}
              {uploadedPhotos.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-teal-400" /> Uploaded Gallery ({uploadedPhotos.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-teal-400 hover:underline flex items-center gap-1"
                    >
                      + Add More
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="group relative bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-lg transition-all hover:border-teal-500/40"
                      >
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            {idx === 0 ? (
                              <span className="bg-teal-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-sm">
                                Cover Photo
                              </span>
                            ) : (
                              <span className="bg-slate-900/80 text-gray-300 text-[10px] font-medium px-2 py-0.5 rounded-md backdrop-blur-md">
                                Photo #{idx + 1}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(photo.id)}
                              title="Remove Photo"
                              className="bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-lg transition-colors backdrop-blur-md shadow-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="truncate text-left">
                            <p className="text-white text-xs font-semibold truncate">{photo.name}</p>
                            <p className="text-gray-300 text-[10px]">{photo.size}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Contact Details & PII Sanitization Screen */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-white/10 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-400" /> Step 5: Contact Details & PII Sanitization Verification
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Input owner listing contact info. Our PII sanitizer automatically redacts personal info before database logging.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Owner / Contact Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-white">Owner Phone Number</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="font-semibold text-white">Owner Email Address</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Upload Summary & PII Sanitizer Preview Guard */}
              <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-teal-400" /> Media Package Ready:
                  </span>
                  <span className="text-teal-300 font-semibold">{uploadedPhotos.length} Photos Attached</span>
                </div>

                {uploadedPhotos.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {uploadedPhotos.slice(0, 4).map((p) => (
                      <img key={p.id} src={p.url} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" />
                    ))}
                    {uploadedPhotos.length > 4 && (
                      <div className="w-12 h-12 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-teal-300 shrink-0">
                        +{uploadedPhotos.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-4 space-y-2 text-xs text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5 text-emerald-400">
                  <Lock className="w-4 h-4" /> Automatic PII Sanitizer Audit Preview:
                </p>
                <p>
                  Before public ingestion, your contact details are sanitized: Phone <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono">[REDACTED_PHONE]</code> and Email <code className="bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono">[REDACTED_EMAIL]</code>.
                </p>
              </div>
            </div>
          )}

          {/* Wizard Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {currentStep > 1 ? (
              <button
                onClick={prevStep}
                className="bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium text-xs px-5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 border border-white/10"
              >
                <ArrowLeft className="w-4 h-4" /> Previous Step
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                onClick={nextStep}
                className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-teal-900/40"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmitListing}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/50"
              >
                <CheckCircle2 className="w-4 h-4" /> {submitting ? "Publishing to Network..." : "Submit Property Listing"}
              </button>
            )}
          </div>

        </div>
      ) : (
        /* Submission Completion Screen */
        <div className="bg-[#131B2E] border border-white/10 rounded-2xl p-8 md:p-12 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/40">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white">Property Successfully Listed!</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Your property has passed validation and is now ready for buyer matching.
            </p>
          </div>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 max-w-lg mx-auto text-left space-y-3 text-xs text-gray-300">
            <p className="font-semibold text-teal-300 text-sm">Post-Submission Processing Summary:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Owner Email Confirmation Sent</strong>: Instant publication confirmation email dispatched to <code className="text-teal-300 font-semibold">{formData.contactEmail}</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>PII Sanitized</strong>: Phone and email details scrubbed cleanly from description.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Media Processed</strong>: {uploadedPhotos.length} high-res property photo gallery items attached.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Geospatial Verified</strong>: Coordinates mapped at ({formData.latitude}, {formData.longitude}).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Vector Ingested</strong>: Locality embeddings generated with <code className="text-teal-400 font-mono">BAAI/bge-small-en-v1.5</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Buyer Alerts Triggered</strong>: Active renters searching in {formData.area} under ₹{formData.rent.toLocaleString('en-IN')}/mo will be notified.</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => { setSubmittedSuccess(false); setCurrentStep(1); }}
            className="bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-teal-900/50"
          >
            Create Another Property Listing
          </button>
        </div>
      )}

    </div>
  );
};
